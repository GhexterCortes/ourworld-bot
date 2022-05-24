import { RecipleClient, RecipleScript, version } from 'reciple';
import { isNumber, Logger } from 'fallout-utility';
import path from 'path';
import yml from 'yaml';
import { createConfig } from './_createConfig';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import { Ad, PendingAd } from './ad-manager/Ad';
import { Message, MessageActionRow, MessageButton, MessageEmbed, TextChannel } from 'discord.js';
import { RawPendingAd } from './ad-manager/types';
import { errorEmbed } from './_errorEmbed';

export interface AdManagerConfig {
    adChannels: string[];
    adModerationChannels: string[];
}

export class AdManager implements RecipleScript {
    public versions: string[] = [version];
    public client?: RecipleClient;
    public logger: Logger = new Logger('AdManager');
    public config: AdManagerConfig = AdManager.getConfig();
    public moderationChannels: TextChannel[] = [];
    public database: DatabaseType = new Database(path.join(process.cwd(), 'config/ad-manager/database.db'));

    public onStart(client: RecipleClient) {
        this.client = client;
        this.logger = client.logger.cloneLogger();
        this.logger.defaultPrefix = 'AdManager';

        this.logger.log(`Ad manager starting...`);

        this.createTables();

        return true;
    }

    public onLoad() {
        this.logger.debug(`Fetching moderation channels...`);

        for (const channelId of this.config.adModerationChannels) {
            const channel = this.client!.channels.cache.get(channelId) as TextChannel;

            if (!channel) {
                this.logger.warn(`Moderation channel ${channelId} not found`);
                continue;
            }

            this.moderationChannels.push(channel);
            this.logger.debug(`Added moderation channel ${channelId}`);
        }

        this.logger.debug(`Listening for message event...`);
        this.client?.on('messageCreate', async (message) => {
            if (!this.config.adChannels.includes(message.channel.id)) return;
            if (!message.author.bot && !message.author.system && !message.content) return message.delete().then(() => {}).catch(() => {});
            if ((message.author.bot || message.author.system) && message.author.id != this.client?.user?.id) return message.delete().then(() => {}).catch(() => {});
            if (message.author.id == this.client?.user?.id) return;

            const pendingAd = await this.submitAd(message.content, message.channel.id, message.author.id);
            await message.delete().catch(() => {});

            await message.channel.send({ embeds: [errorEmbed(`Your ad has been submitted. It will be reviewed by a moderator.`, true)] }).then(m => {
                setTimeout(() => m.delete(), 5000);
            }).catch(() => {});

            this.logger.debug(`Submitted ad from ${message.author.tag}`);

            this.logger.debug(`Sending messages to moderation channels`);
            for (const channel of this.moderationChannels) {
                await channel.send({
                    content: `**${message.author.tag}** submitted an ad!`,
                    embeds: [
                        pendingAd.createPendingMessageEmbed()
                    ],
                    components: [
                        new MessageActionRow().setComponents([
                            new MessageButton()
                                .setCustomId('ad_approve_'+ pendingAd.id)
                                .setLabel('Approve')
                                .setStyle('SUCCESS'),
                            new MessageButton()
                                .setCustomId('ad_reject_'+ pendingAd.id)
                                .setLabel('Reject')
                                .setStyle('DANGER')
                        ])
                    ]
                }).catch(() => {});
            }
        });

        this.logger.debug(`Listening for moderation interactions...`);
        this.client?.on('interactionCreate', async (component) => {
            if (!component.isButton()) return;
            if (!component.customId.startsWith(`ad_approve_`) && !component.customId.startsWith(`ad_reject_`)) return;
            
            if (!component.deferred) await component.deferUpdate().catch(() => {});

            const adId = parseInt(component.customId.split('_')[2], 10);
            if (!isNumber(adId)) return;

            const ad = await this.fetchPendingAd(adId);
            if (!ad) return;

            if (component.customId.startsWith(`ad_approve_`)) {
                const newAd = await ad.approve().catch(err => this.logger.error(err));
                if (!newAd) return;

                await (component.message as Message).delete().catch(() => {});
                await ad.user?.send({
                    embeds: [
                        new MessageEmbed()
                            .setAuthor({ name: `Ad Approved` })
                            .setDescription(`Your ad in \`${ad.channel?.guild.name ?? 'Unknown Guild'}\` has been approved!\n\n`)
                            .setColor('GREEN')
                            .setTimestamp()
                    ],
                    components: [
                        new MessageActionRow()
                            .setComponents([
                                new MessageButton()
                                    .setLabel('View Ad')
                                    .setStyle('LINK')
                                    .setURL(newAd.message!.url)
                            ])
                    ]
                }).catch(err => this.logger.error(err));
            } else if (component.customId.startsWith(`ad_reject_`)) {
                await ad.delete();
                await (component.message as Message).delete().catch(() => {});
                await ad.user?.send({
                    embeds: [
                        new MessageEmbed()
                            .setAuthor({ name: `Ad Rejected` })
                            .setDescription(
                                `Your ad in \`${ad.channel?.guild.name ?? 'Unknown Guild'}\` has been rejected.\nDon't worry this is nothing personal, You can submit another ad if you want.\n\nWe can't tell the exact reason why your ad was rejected, but here are the main reasons for rejections:\n\n` +
                                `- Your ad contains a link to a website that is not allowed.\n` +
                                `- Your ad contains banned words.\n` +
                                `- Your ad promotes illegal content.\n` +
                                `- Your ad violates Discord's TOS\n` +
                                `- Your ad violates our rules.\n` +
                                `- Your ad is spammy.\n`
                            )
                            .setColor('RED')
                            .setTimestamp()
                    ]
                }).catch(err => this.logger.error(err));
            }
        });

        this.logger.debug(`Listening for leave event...`)
        this.client?.on('guildMemberRemove', async member => {
            const user_id = member.user.id;

            this.database.prepare(`DELETE FROM pending WHERE user_id = ?`).run(user_id);

            const approvedMessages = this.database.prepare('SELECT * FROM ads WHERE user_id = ?').all(user_id);
            if (!approvedMessages.length) return;

            let sent = false;

            for (const approvedMessage of approvedMessages) {
                const ad = await (new Ad(approvedMessage, this.database, this.client!)).fetch().catch(err => this.logger.error(err));
                if (!ad) continue;

                ad.delete();
                
                if (sent) continue;

                ad.user?.send({
                    embeds: [
                        new MessageEmbed()
                            .setDescription(`All of your (${approvedMessages.length}) uploaded self promotion to \`${ad.message?.guild?.name}\` has been deleted`)
                            .setColor('RED')
                    ]
                }).catch(err => this.logger.error(err));

                sent = true;
            }
        });

        this.logger.log(`Ad manager loaded.`);
    }

    public async submitAd(content: string, channel_id: string, user_id: string): Promise<PendingAd> {
        const pendingObject: RawPendingAd = {
            id: 0,
            user_id,
            channel_id,
            content,
            created_at: Date.now()
        }

        this.database.prepare('INSERT INTO pending (user_id, channel_id, content, created_at) VALUES (?, ?, ?, ?)').run(pendingObject.user_id, pendingObject.channel_id, pendingObject.content, pendingObject.created_at);
        
        const ad = this.database.prepare('SELECT * FROM pending WHERE user_id = ? AND channel_id = ? AND content = ? AND created_at = ?').get(pendingObject.user_id, pendingObject.channel_id, pendingObject.content, pendingObject.created_at);
        if (!ad) throw new Error('Failed to fetch pending ad');

        return (new PendingAd(ad, this.database, this.client!)).fetch();
    }

    public async fetchPendingAd(id: number): Promise<PendingAd|undefined> {
        const result = await this.database.prepare('SELECT * FROM pending WHERE id = ? LIMIT 1').get(id);

        if (!result) return undefined;

        return (new PendingAd(result, this.database, this.client!)).fetch();
    }

    public async fetchAd(id: number): Promise<Ad|undefined> {
        const result = await this.database.prepare('SELECT * FROM ads WHERE id = ? LIMIT 1').get(id);

        if (!result) return undefined;

        return (new Ad(result, this.database, this.client!)).fetch();
    }

    public createTables(): void {
        this.logger.debug(`Creating tables...`);

        this.logger.debug(`Created table 'pending'...`);
        this.database.prepare(`CREATE TABLE IF NOT EXISTS pending (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id VARCHAR(18) NOT NULL,
            channel_id VARCHAR(18) NOT NULL,
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )`).run();

        this.logger.debug(`Created table 'ads'...`);
        this.database.prepare(`CREATE TABLE IF NOT EXISTS ads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id VARCHAR(18) NOT NULL,
            channel_id VARCHAR(18) NOT NULL,
            message_id VARCHAR(18) NOT NULL,
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )`).run();
    }

    public static getConfig() {
        const configPath = path.join(process.cwd(), 'config/ad-manager/config.yml');
        const defaultConfig: AdManagerConfig = {
            adChannels: [
                '000000000000000000', '000000000000000000'
            ],
            adModerationChannels: [
                '000000000000000000', '000000000000000000'
            ]
        };

        return yml.parse(createConfig(configPath, defaultConfig));
    }
}

export default new AdManager();
