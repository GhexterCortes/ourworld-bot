import { Message, TextChannel, User } from 'discord.js';
import { Database as DatabaseType } from 'better-sqlite3';
import { RecipleClient } from 'reciple';

export interface RawPendingAd {
    id: number;
    user_id: string;
    channel_id: string;
    content: string;
    created_at: number;
}

export interface PendingAd extends RawPendingAd {
    database: DatabaseType;
    client: RecipleClient;
    channel?: TextChannel;
    user?: User;
}

export interface RawAd extends RawPendingAd {
    message_id: string;
}

export interface Ad extends PendingAd {
    message_id: string;
    message?: Message;
}