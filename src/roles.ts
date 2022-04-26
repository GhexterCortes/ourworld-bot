import { Logger } from 'fallout-utility';
import yml from 'yaml';
import path from 'path';
import { RecipleClient, RecipleScript, version } from 'reciple';
import { createConfig } from './_createConfig';
import { ColorResolvable, Guild, Message, MessageActionRow, MessageEmbed, MessageSelectMenu, Role, TextChannel } from 'discord.js';
import { errorEmbed } from './_errorEmbed';

export interface RolesConfig {
    messages: {
        id: string;
        channelId: string;
        content: string;
        multiple: boolean;
        dontEdit: boolean;
        embeds: {
            title?: string;
            description?: string;
            color?: string;
        }[],
        roles: {
            id: string;
            emoji: string;
            name: string;
            description: string;
        }[]
    }[]
}

class Roles implements RecipleScript {
    public versions: string[] = [version];
    public client?: RecipleClient;
    public config: RolesConfig = Roles.getConfig();
    public logger: Logger = new Logger('Roles');

    public onStart(client: RecipleClient): boolean {
        this.client = client;
        this.logger = this.client.logger.cloneLogger();
        this.logger.defaultPrefix = 'Roles';

        this.logger.info('Starting Roles');

        return true;
    }

    public async onLoad() {
        this.logger.info('Loaded Roles');

        for (const message of this.config.messages) {
            await this.parseMessage(message);
        }
        
        this.client?.on('interactionCreate', async (interaction) => {
            if (!interaction.isSelectMenu() || !interaction.inCachedGuild()) return;
            
            const messageConf = this.config.messages.find(m => m.id === interaction.message.id);
            if (!messageConf) throw new Error('ee');
            
            const selectedRoles = await Promise.all(interaction.values.map(async v => this.getRole(v, interaction.guild)));
            const validRoles = messageConf?.roles;
            const member = interaction.member;

            let changes = {
                added: 0,
                removed: 0
            }

            for (const role of validRoles) {
                if (!role) continue;
                if (selectedRoles.some(r => r?.id === role.id)) {
                    if (!member.roles.cache.has(role.id)) {
                        await member.roles.add(role.id).catch(() => changes.added--);
                        changes.added++;
                    }
                } else {
                    if (member.roles.cache.has(role.id)) {
                        await member.roles.remove(role.id).catch(() => changes.removed--);
                        changes.removed++;
                    }
                }
            }

            await interaction.reply({
                embeds: [
                    errorEmbed(`Roles updated! Added **${changes.added}** and **${changes.removed}** removed`, true, false)
                ],
                ephemeral: true 
            }).catch(() => {});
        });
    }

    public async getRole(roleId: string, guild: Guild): Promise<Role|undefined> {
        const roleGet = guild.roles.cache.get(roleId);
        const roleFetch = !!roleGet ? roleGet : await guild.roles.fetch(roleId).catch(() => undefined) ?? undefined;

        return this.config.messages.some(m => m.roles.some(r => r.id === roleId)) ? roleFetch : undefined;
    }

    public async parseMessage(messageConf: RolesConfig['messages'][0]): Promise<void> {
        this.logger.debug(`Parsing message ${messageConf.id}`);

        const channel = await this.getTextChannel(messageConf.channelId);
        if (!channel) return this.logger.error(`Channel ${messageConf.channelId} not found`);

        const message = await this.getMessage(messageConf.id, channel);
        if (!message) return this.logger.error(`Message ${messageConf.id} not found`);

        const embeds = messageConf.embeds.map(embed => this.buildEmbed(embed));

        if (messageConf.dontEdit) return;

        await message.edit({
            content: messageConf.content || ' ',
            embeds: embeds.filter(e => e) as MessageEmbed[],
            components: [
                new MessageActionRow().setComponents([
                    this.buildMenu(messageConf.roles, messageConf.multiple, `roles_${message.id}`)
                ])
            ]
        });

        this.logger.debug(`Edited message ${messageConf.id}`);
    }

    public buildMenu(menuConf: RolesConfig['messages'][0]['roles'], multiple: boolean, id: string): MessageSelectMenu {
        const menu = new MessageSelectMenu().setCustomId(id).setPlaceholder('Select role').setMinValues(0);

        if (multiple) menu.setMaxValues(menuConf.length).setPlaceholder('Select roles');

        for (const menuOpt of menuConf) {
            menu.addOptions([
                {
                    label: menuOpt.name,
                    value: menuOpt.id,
                    emoji: menuOpt.emoji,
                    description: menuOpt.description
                }
            ]);
        }

        return menu;
    }

    public buildEmbed(embedConf: RolesConfig['messages'][0]['embeds'][0]): MessageEmbed|undefined {
        const embed = new MessageEmbed();

        if (embedConf.title) embed.setTitle(embedConf.title);
        if (embedConf.description) embed.setDescription(embedConf.description);
        if (embedConf.color) embed.setColor(embedConf.color as ColorResolvable);

        return !embedConf.title && !embedConf.description && !embedConf.color ? undefined : embed;
    }

    public async getMessage(messageId: string, channel: TextChannel): Promise<Message|undefined> {
        const messageGet = channel.messages.cache.get(messageId);
        const messageFetch = !!messageGet ? messageGet : await channel.messages.fetch(messageId).catch(() => undefined);

        return !messageFetch?.partial ? messageFetch : undefined;
    }

    public async getTextChannel(channelId: string): Promise<TextChannel|undefined> {
        const channelGet = this.client?.channels.cache.get(channelId);
        const channelFetch = !!channelGet ? channelGet : await this.client?.channels.fetch(channelId).catch(() => undefined);

        return channelFetch?.type === 'GUILD_TEXT' ? channelFetch : undefined;
    }

    public static getConfig(): RolesConfig {
        const configPath = path.join(process.cwd(), 'config/roles/config.yml');
        const defaultConfig: RolesConfig = {
            messages: [
                {
                    id: '000000000000000000',
                    channelId: '000000000000000000',
                    content: 'Get a role',
                    multiple: true,
                    dontEdit: false,
                    embeds: [
                        {
                            title: 'Roles',
                            description: 'Select roles in menu below',
                            color: 'BLUE'
                        }
                    ],
                    roles: [
                        {
                            id: '000000000000000000',
                            emoji: '🔵',
                            name: 'Member',
                            description: 'Member role'
                        }
                    ]
                }
            ]
        };

        return yml.parse(createConfig(configPath, defaultConfig));
    }
}

module.exports = new Roles();