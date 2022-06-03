import yml from 'yaml';
import path from 'path';
import { InteractionCommandBuilder, RecipleClient, RecipleScript, version } from 'reciple';
import { createConfig } from './_createConfig';
import { ColorResolvable, Interaction, MessageActionRow, MessageEmbed, MessageOptions, Modal, TextChannel, TextInputComponent } from 'discord.js';

export interface AnnouncerConfig {
    announcementsChannels: string[];
    preventUserChatsInAnnouncementChannels: boolean;
    sendAnnouncementsToAllChannels: boolean;
    createThreadsForAnnouncements: boolean;
}

export class Announcer implements RecipleScript {
    public versions: string[] = ['1.3.x'];
    public config: AnnouncerConfig = Announcer.getConfig();
    public channels: TextChannel[] = [];
    public commands: (InteractionCommandBuilder)[] = [];

    public onStart(client: RecipleClient) {
        client.logger.info('Announcer started');

        this.commands = [
            new InteractionCommandBuilder()
                .setName('announce')
                .setDescription('Announce something')
                .setRequiredPermissions(['SEND_MESSAGES'])
                .addStringOption(color => color
                    .setName('color')
                    .setDescription('The color of the announcement embed')
                    .addChoices(
                        {
                            name: 'Red',
                            value: 'RED',
                        },
                        {
                            name: 'Yellow',
                            value: 'YELLOW',
                        },
                        {
                            name: 'Green',
                            value: 'GREEN',
                        },
                        {
                            name: 'Blue',
                            value: 'BLUE',
                        }
                    )
                )
                .addRoleOption(role => role
                    .setName('role')
                    .setDescription('The role to mention')
                    .setRequired(false)    
                )
                .addAttachmentOption(attachment => attachment
                    .setName('attachment')
                    .setDescription('Add attachment to the announcement')
                    .setRequired(false)    
                )
                .setExecute(async command => {
                    const interaction = command.interaction;
                    const color = interaction.options.getString('color') ?? undefined;
                    const role = interaction.options.getRole('role') ?? undefined;
                    const attachment = interaction.options.getAttachment('attachment') ?? undefined;

                    await interaction.showModal(this.getModal());
                    const submit = await interaction.awaitModalSubmit({
                        time: 1000 * 60 * 5,
                        filter: m => m.customId == 'announcer-modal'
                    });

                    if (!submit.inCachedGuild()) throw new Error('Modal closed');

                    const title = submit.fields.getTextInputValue('announcer-modal-title');
                    const content = submit.fields.getTextInputValue('announcer-modal-content');

                    const embed = new MessageEmbed()
                        .setAuthor({ name: `Announcement`, iconURL: client.user?.displayAvatarURL() })
                        .setDescription(content);

                    if (color) embed.setColor(color as ColorResolvable);
                    if (title) embed.setTitle(title);

                    await submit.reply({ content: 'Sending...', ephemeral: true });
                    const sent = !!await this.sendAnnouncement({
                        content: role ? `<@&${role.id}>` : undefined,
                        embeds: [embed],
                        files: attachment ? [attachment] : undefined
                    }, submit.guildId);

                    if (sent) {
                        submit.editReply('Announcement sent!');
                    } else {
                        submit.editReply('No announcement channels found!');
                    }
                })
        ];

        return true;
    }

    public async sendAnnouncement(content: MessageOptions, guild: string) {
        const channels = this.channels.filter(c => this.config.sendAnnouncementsToAllChannels || c.guildId === guild);

        let sent = 0;
        for (const channel of channels) {
            const message = await channel.send(content).catch(() => { sent--; });
            sent++;
        }

        return sent;
    }

    public async onLoad(client: RecipleClient) {
        client.logger.info('Announcer loaded');

        const channels = this.config.announcementsChannels;
        for (const channelId of channels) {
            const channel = client.channels.cache.get(channelId) ?? await client.channels.fetch(channelId).catch(() => {}) ?? undefined;
            if (channel?.type === 'GUILD_TEXT') this.channels.push(channel);
        }

        client.logger.info(`Announcer loaded ${this.channels.length} channels`);
        
        client.on('messageCreate', async message => {
            const author = message.author;
            const channel = message.channel as TextChannel;

            if (!this.channels.some(c => c.id === channel.id)) return;
            if (this.config.preventUserChatsInAnnouncementChannels && !author.bot) {
                message.delete().catch(() => {});
                return;
            }

            if (this.config.createThreadsForAnnouncements && message) {
                message.startThread({
                    name: message.embeds?.[0]?.title ?? 'Announcement',
                    autoArchiveDuration: 'MAX',
                    reason: 'Announcement'
                }).catch(() => {});
            }
        });
    }

    public getModal() {
        return new Modal()
            .setCustomId('announcer-modal')
            .setTitle('Create Announcement')
            .setComponents(
                new MessageActionRow<TextInputComponent>()
                    .setComponents([
                        new TextInputComponent()
                            .setCustomId('announcer-modal-title')
                            .setLabel('Announcement Title')
                            .setPlaceholder('Very important announcement')
                            .setMaxLength(100)
                            .setStyle('SHORT')
                            .setRequired(false),
                    ]),
                new MessageActionRow<TextInputComponent>()
                    .setComponents([
                        new TextInputComponent()
                            .setCustomId('announcer-modal-content')
                            .setLabel('Announcement Content')
                            .setPlaceholder('You can use markdown here')
                            .setMaxLength(2000)
                            .setStyle('PARAGRAPH')
                            .setRequired(true),
                    ])
            );
    }
    
    public static getConfig(): AnnouncerConfig {
        const configPath = path.join(process.cwd(), 'config/announcer/config.yml');
        const defaultConfig: AnnouncerConfig = {
            announcementsChannels: ['000000000000000000', '000000000000000000'],
            preventUserChatsInAnnouncementChannels: false,
            sendAnnouncementsToAllChannels: false,
            createThreadsForAnnouncements: true
        };

        return yml.parse(createConfig(configPath, defaultConfig));
    }
}

export default new Announcer();
