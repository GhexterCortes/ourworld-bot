import { InteractionCommandBuilder, MessageCommandBuilder, RecipleClient, RecipleScript } from 'reciple';
import path from 'path';
import yml from 'yaml';
import { createConfig } from './_createConfig';
import { TextChannel } from 'discord.js';
import { errorEmbed } from './_errorEmbed';

export interface MinecraftModerationConfig {
    consoleChannel: string;
}

export class MinecraftModeration implements RecipleScript {
    public versions: string[] = ['1.6.x'];
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
                )
                .addSubcommand(console => console
                    .setName('console')
                    .setDescription('Send a message to the console')
                    .addStringOption(message => message
                        .setName('message')
                        .setDescription('The message to send to the console')
                        .setRequired(true)
                    )    
                ) as InteractionCommandBuilder)
                .setExecute(async command => {
                    const interaction = command.interaction;
                    const subcommand = interaction.options.getSubcommand();

                    if (!subcommand || !this.channel) return;

                    if (subcommand == 'console') {
                        if (!interaction.memberPermissions?.has('ADMINISTRATOR')) return interaction.reply({ embeds: [errorEmbed('You do not have permission to use this command')], ephemeral: true });
                        const message = interaction.options.getString('message', true).split('; ');

                        await interaction.reply({ embeds: [
                            errorEmbed('Sending message(s) to console...', true)
                        ] });

                        for (const msg of message) {
                            await this.sendToConsole(msg);
                            interaction.followUp({ embeds: [errorEmbed(`sent \`${msg}\` to <#${this.channel.id}>`, true, false)] })
                        }   

                        return interaction.editReply({ embeds: [errorEmbed('Message(s) sent to console', true)] });
                    }

                    const player = interaction.options.getString('player', true);
                    const isIp = interaction.options.getBoolean('is-ip') ?? false;
                    const time = interaction.options.getString('time') ?? '1d';

                    await interaction.deferReply();

                    if (isIp && !interaction.memberPermissions?.has('ADMINISTRATOR')) return interaction.editReply({ embeds: [errorEmbed('You do not have permission to use IP related commands')] });

                    switch (subcommand) {
                        case 'ban':
                            let banCommand = isIp ? `ban-ip ${player}` : `ban ${player}`;
                            if (interaction.options.getString('reason')) banCommand += ` ${interaction.options.getString('reason')}`;
                            await this.sendToConsole(banCommand);
                            
                            return interaction.editReply({ embeds: [errorEmbed(`sent \`${banCommand}\` to <#${this.channel.id}>`, true, false)] });
                        case 'tempban':
                            let tmpbanCommand = isIp ? `tempipban ${player} ${time}` : `tempban ${player} ${time}`;
                            if (interaction.options.getString('reason')) tmpbanCommand += ` ${interaction.options.getString('reason')}`;
                            await this.sendToConsole(tmpbanCommand);

                            return interaction.editReply({ embeds: [errorEmbed(`sent \`${tmpbanCommand}\` to <#${this.channel.id}>`, true, false)] });
                        case 'kick':
                            let kickCommand = `kick ${player}`;
                            if (interaction.options.getString('reason')) kickCommand += ` ${interaction.options.getString('reason')}`;
                            await this.sendToConsole(kickCommand);

                            return interaction.editReply({ embeds: [errorEmbed(`sent \`${kickCommand}\` to <#${this.channel.id}>`, true, false)] });
                        case 'mute':
                            let muteCommand = `mute ${player}`;
                            if (interaction.options.getString('reason')) muteCommand += ` ${interaction.options.getString('reason')}`;
                            await this.sendToConsole(muteCommand);

                            return interaction.editReply({ embeds: [errorEmbed(`sent \`${muteCommand}\` to <#${this.channel.id}>`, true, false)] });
                        case 'tempmute':
                            let tmpmuteCommand = `tempmute ${player} ${time}`;
                            if (interaction.options.getString('reason')) tmpmuteCommand += ` ${interaction.options.getString('reason')}`;
                            await this.sendToConsole(tmpmuteCommand);

                            return interaction.editReply({ embeds: [errorEmbed(`sent \`${tmpmuteCommand}\` to <#${this.channel.id}>`, true, false)] });
                        default:
                            return interaction.editReply({ embeds: [errorEmbed(`Unknown subcommand ${subcommand}`)] });
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

    public async sendToConsole(message: string) {
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

export default new MinecraftModeration();
