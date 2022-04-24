import { InteractionCommandBuilder, MessageCommandBuilder, RecipleClient, RecipleScript, version } from 'reciple';
import path from 'path';
import yml from 'yaml';
import { createConfig } from './_createConfig';
import { InteractionReplyOptions, TextChannel, WebhookEditMessageOptions } from 'discord.js';
import { errorEmbed } from './_errorEmbed';

export interface MinecraftModerationConfig {
    consoleChannel: string;
}

class MinecraftModeration implements RecipleScript {
    public versions: string[] = [version];
    public commands: (MessageCommandBuilder | InteractionCommandBuilder)[] = [];
    public config: MinecraftModerationConfig = MinecraftModeration.getConfig();
    public channel?: TextChannel;

    public async onStart(client: RecipleClient) {
        client.logger.log('Minecraft Moderation starting', 'McMod');

        this.commands = [
            (new InteractionCommandBuilder()
                .setName('server-console')
                .setDescription('Moderation commands for Minecraft server')
                .addSubcommand(ban => ban
                    .setName('ban')
                    .setDescription('Ban a player')
                    .addStringOption(player => player
                        .setName('player')
                        .setDescription('The player to ban')
                        .setRequired(true)    
                    )
                    .addStringOption(reason => reason
                        .setName('reason')
                        .setDescription('Give a reasonable reason')
                        .setRequired(false)    
                    )
                    .addBooleanOption(isIp => isIp
                        .setName('is-ip')
                        .setDescription('Ban the player by IP')
                        .setRequired(false)
                    )
                )
                .addSubcommand(tmpban => tmpban
                    .setName('tempban')
                    .setDescription('Ban a player temporarily')
                    .addStringOption(player => player
                        .setName('player')
                        .setDescription('The player to ban')
                        .setRequired(true)    
                    )
                    .addStringOption(time => time
                        .setName('time')
                        .setDescription('The time to ban the player')
                        .setRequired(true)    
                    )
                    .addStringOption(reason => reason
                        .setName('reason')
                        .setDescription('Give a reasonable reason')
                        .setRequired(false)    
                    )
                    .addBooleanOption(isIp => isIp
                        .setName('is-ip')
                        .setDescription('Ban the player by IP')
                        .setRequired(false)
                    )
                )
                .addSubcommand(kick => kick
                    .setName('kick')
                    .setDescription('Kick a player')
                    .addStringOption(player => player
                        .setName('player')
                        .setDescription('The player to kick')
                        .setRequired(true)
                    )
                    .addStringOption(reason => reason
                        .setName('reason')
                        .setDescription('Give a reasonable reason')
                        .setRequired(false)    
                    )
                )
                .addSubcommand(mute => mute
                    .setName('mute')
                    .setDescription('Mutes a player')
                    .addStringOption(player => player
                        .setName('player')
                        .setDescription('The player to mute')
                        .setRequired(true)
                    )
                    .addStringOption(reason => reason
                        .setName('reason')
                        .setDescription('Give a reasonable reason')
                        .setRequired(false)    
                    )
                )
                .addSubcommand(tmpmute => tmpmute
                    .setName('tempmute')
                    .setDescription('Mutes a player temporarily')
                    .addStringOption(player => player
                        .setName('player')
                        .setDescription('The player to mute')
                        .setRequired(true)
                    )
                    .addStringOption(time => time
                        .setName('time')
                        .setDescription('The time to mute the player')
                        .setRequired(true)
                    )
                    .addStringOption(reason => reason
                        .setName('reason')
                        .setDescription('Give a reasonable reason')
                        .setRequired(false)    
                    )
                ) as InteractionCommandBuilder)
                .setExecute(async command => {
                    const interaction = command.interaction;
                    const subcommand = interaction.options.getSubcommand();

                    if (!subcommand || !this.channel) return;

                    const player = interaction.options.getString('player') ?? '';
                    if (!player) return interaction.reply({ embeds: [errorEmbed(`Player is not defined`)] });

                    const isIp = interaction.options.getBoolean('is-ip') ?? false;
                    const time = interaction.options.getString('time') ?? '1d';

                    await interaction.deferReply();

                    switch (subcommand) {
                        case 'ban':
                            let banCommand = isIp ? `ban-ip ${player}` : `ban ${player}`;
                            if (interaction.options.getString('reason')) banCommand += ` ${interaction.options.getString('reason')}`;
                            await this.sendToConsole(banCommand);
                            
                            return interaction.reply({ embeds: [errorEmbed(`sent \`${banCommand}\` to <#${this.channel.id}>`, true, false)] });
                        case 'tempban':
                            let tmpbanCommand = isIp ? `tempipban ${player} ${time}` : `tempban ${player} ${time}`;
                            if (interaction.options.getString('reason')) tmpbanCommand += ` ${interaction.options.getString('reason')}`;
                            await this.sendToConsole(tmpbanCommand);

                            return interaction.reply({ embeds: [errorEmbed(`sent \`${tmpbanCommand}\` to <#${this.channel.id}>`, true, false)] });
                        case 'kick':
                            let kickCommand = `kick ${player}`;
                            if (interaction.options.getString('reason')) kickCommand += ` ${interaction.options.getString('reason')}`;
                            await this.sendToConsole(kickCommand);

                            return interaction.reply({ embeds: [errorEmbed(`sent \`${kickCommand}\` to <#${this.channel.id}>`, true, false)] });
                        case 'mute':
                            let muteCommand = `mute ${player}`;
                            if (interaction.options.getString('reason')) muteCommand += ` ${interaction.options.getString('reason')}`;
                            await this.sendToConsole(muteCommand);

                            return interaction.reply({ embeds: [errorEmbed(`sent \`${muteCommand}\` to <#${this.channel.id}>`, true, false)] });
                        case 'tempmute':
                            let tmpmuteCommand = `tempmute ${player} ${time}`;
                            if (interaction.options.getString('reason')) tmpmuteCommand += ` ${interaction.options.getString('reason')}`;
                            await this.sendToConsole(tmpmuteCommand);

                            return interaction.reply({ embeds: [errorEmbed(`sent \`${tmpmuteCommand}\` to <#${this.channel.id}>`, true, false)] });
                        default:
                            return interaction.reply({ embeds: [errorEmbed(`Unknown subcommand ${subcommand}`)] });
                    }
                })
        ];

        return true;
    }

    public async onLoad(client: RecipleClient) {
        const channel = client.channels.cache.get(this.config.consoleChannel) ?? await client.channels.fetch(this.config.consoleChannel).catch(() => {}) ?? undefined;
        this.channel = channel?.type === 'GUILD_TEXT' ? channel : undefined;
        if (!this.channel) {
            client.logger.error('Minecraft Moderation: Console channel not found', 'McMod');
            client.logger.error(this.channel, 'McMod');
        }

        client.logger.log('Minecraft Moderation started', 'McMod');
    }

    public async sendToConsole(message: string|InteractionReplyOptions|WebhookEditMessageOptions) {
        if (!this.channel) return;

        await this.channel.send(message).catch(() => {});
    }

    public static getConfig(): MinecraftModerationConfig {
        const configPath = path.join(process.cwd(), 'config/mcModeration/config.yml');
        const defaultConfig: MinecraftModerationConfig = {
            consoleChannel: '000000000000000000'
        };

        return yml.parse(createConfig(configPath, defaultConfig));
    }
}

module.exports = new MinecraftModeration();