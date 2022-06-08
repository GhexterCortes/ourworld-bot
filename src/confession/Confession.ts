import { Message, TextChannel, User } from 'discord.js';
import { Confess, RawConfession } from '../confess';

export interface Confession extends RawConfession {
    user: User;
    channel: TextChannel;
    message: Message;
    content: string;
    created_at_date: Date;
}

export class Confession implements RawConfession {
    public confess: Confess;
    public deleted: boolean = false;

    constructor(confession: RawConfession, main: Confess) {
        this.confess = main;

        this.id = confession.id;
        this.user_id = confession.user_id;
        this.channel_id = confession.channel_id;
        this.message_id = confession.message_id;
        this.content = confession.content;
        this.nickname = confession.nickname;
        this.key = confession.key;
        this.created_at = confession.created_at;

        this.created_at_date = new Date(this.created_at);
    }

    public async fetch(): Promise<void> {
        const user = this.confess.client.users.cache.get(this.user_id) ?? await this.confess.client.users.fetch(this.user_id).catch(() => undefined);
        const channel = this.confess.client.channels.cache.get(this.channel_id) ?? await this.confess.client.channels.fetch(this.channel_id).catch(() => undefined);
        
        if (!user) {
            this.deleted = true;
            throw new Error(`User ${this.user_id} not found!`);
        }
        if (!channel || channel.type !== 'GUILD_TEXT') {
            this.deleted = true;
            throw new Error(`Text Channel ${this.channel_id} not found!`);
        }

        const message = channel.messages.cache.get(this.message_id) ?? await channel.messages.fetch(this.message_id).catch(() => undefined);
        
        if (!message) {
            this.deleted = true;
            throw new Error(`Message ${this.message_id} not found!`);
        }

        this.user = user;
        this.channel = channel;
        this.message = message;
    }

    public async delete() {
        this.deleted = true;
        await this.message.delete().catch(() => undefined);
        this.confess.database.prepare(`DELETE FROM confessions WHERE id = ?`).run(this.id);
    }

    public async edit(content: string) {
        await this.message.edit(content);
        this.confess.database.prepare(`UPDATE confessions SET content = ? WHERE id = ?`).run(content, this.id);
    }
}
