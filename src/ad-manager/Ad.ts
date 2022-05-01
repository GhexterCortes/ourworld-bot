import { Database as DatabaseType } from 'better-sqlite3';
import { Message, MessageEmbed, TextChannel, User } from 'discord.js';
import { RecipleClient } from 'reciple';
import { RawAd, RawPendingAd, PendingAd as PendingAdType } from './types';

class PendingAd implements PendingAdType {
    database: DatabaseType;
    client: RecipleClient;
    id: number;
    user_id: string;
    channel_id: string;
    content: string;
    created_at: number;
    channel?: TextChannel;
    user?: User;

    constructor(options: RawPendingAd, database: DatabaseType, client: RecipleClient) {
        this.database = database;
        this.client = client;

        this.id = options.id;
        this.user_id = options.user_id;
        this.channel_id = options.channel_id;
        this.content = options.content;
        this.created_at = options.created_at;
    }

    public async fetch(): Promise<PendingAd> {
        const channel = this.client.channels.cache.find(c => c.id == this.channel_id && c.type == 'GUILD_TEXT') ?? await this.client.channels.fetch(this.channel_id).then(c => c?.type == 'GUILD_TEXT' ? c : undefined).catch(() => undefined) ?? undefined;
        const user = this.client.users.cache.find(u => u.id == this.user_id) ?? await this.client.users.fetch(this.user_id).catch(() => undefined) ?? undefined;
        
        if (!channel) throw new Error('Channel not found');
        if (!user) throw new Error('User not found');
        
        this.channel = channel as TextChannel;
        this.user = user;

        return this;
    }

    public async delete(): Promise<void> {
        return new Promise(res => {
            this.database.prepare('DELETE FROM pending WHERE id = ?').run(this.id);

            res();
        });
    }

    public async approve(): Promise<Ad> {
        if (!this.channel) throw new Error('Channel not found');

        const message = await this.channel.send({ embeds: [this.createMessageEmbed()] }).catch(() => undefined) ?? undefined;
        if (!message) throw new Error('Message not sent');
        
        await this.delete();
        this.database.prepare('INSERT INTO ads (id, user_id, channel_id, message_id, content, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(this.id, this.user_id, this.channel_id, message.id, this.content, this.created_at);

        return (new Ad({
            id: this.id,
            user_id: this.user_id,
            channel_id: this.channel_id,
            message_id: message.id,
            content: this.content,
            created_at: this.created_at
        }, this.database, this.client)).fetch();
    }

    public createMessageEmbed(): MessageEmbed {
        return new MessageEmbed()
            .setAuthor({ name: this.user!.tag, iconURL: this.user!.displayAvatarURL() })
            .setDescription(this.content)
            .setColor('BLUE')
            .setTimestamp(this.created_at);
    }

    public createPendingMessageEmbed(): MessageEmbed {
        return new MessageEmbed()
            .setAuthor({ name: this.user!.tag, iconURL: this.user!.displayAvatarURL() })
            .setDescription(this.content)
            .setColor('YELLOW')
            .addField('Pending', 'This ad is pending for approval. **Don\'t approve ads that contains nudity/scam/racially-offensive contents.**')
            .setFooter({ text: 'Pending ad approval' })
            .setTimestamp(this.created_at);
    }
}

class Ad extends PendingAd {
    message_id: string;
    message?: Message;

    constructor(options: RawAd, database: DatabaseType, client: RecipleClient) {
        super(options, database, client);
        this.message_id = options.message_id;
    }

    public async fetch(): Promise<Ad> {
        await super.fetch();
        const message = this.channel!.messages.cache.get(this.message_id) ?? await this.channel!.messages.fetch(this.message_id).catch(() => undefined) ?? undefined;

        if (!message) throw new Error('Message not found');

        this.message = message;

        return this;
    }

    public async delete(): Promise<void> {
        await this.message!.delete().catch(() => {});
        
        return new Promise(res => {
            this.database.prepare('DELETE FROM ads WHERE id = ?').run(this.id);

            res();
        });
    }
}

export { Ad, PendingAd };