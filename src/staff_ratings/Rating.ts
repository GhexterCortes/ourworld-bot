import { GuildMember, User } from 'discord.js';
import { StaffRatings } from '../staff-ratings';
import { Database } from 'better-sqlite3';
import { Logger } from 'fallout-utility';
import { RecipleClient } from 'reciple';

export interface RawRating {
    id: number;
    user_id: string;
    staff_id: string;
    rating: number;
    comment: string;
}

export interface Rating extends RawRating {
    user: User;
    staff: GuildMember;
}

export class Rating {
    public main: StaffRatings;
    public database: Database;
    public logger: Logger;
    public client: RecipleClient;
    public deleted: boolean = false;

    constructor (options: RawRating, main: StaffRatings) {
        this.main = main;
        this.database = this.main.database;
        this.logger = this.main.logger.cloneLogger();
        this.client = this.main.client;

        this.id = options.id;
        this.user_id = options.user_id;
        this.staff_id = options.staff_id;
        this.rating = options.rating;
        this.comment = options.comment;
    }

    public async fetch(): Promise<void> {
        const user = this.client.users.cache.get(this.user_id) ?? await this.client.users.fetch(this.user_id).catch(() => undefined);
        const staff = this.main.guild?.members.cache.get(this.staff_id) ?? await this.main.guild?.members.fetch(this.staff_id).catch(() => undefined);

        if (!user || !staff) {
            this.deleted = true;
            throw new Error('User or staff member not found.');
        }
        
        this.user = user;
        this.staff = staff;
    }

    public async delete(): Promise<void> {
        this.deleted = true;
        this.database.prepare(`DELETE FROM ratings WHERE id = ?`).run(this.id);
    }
}
