import { GuildMember } from 'discord.js';
import { StaffRatings } from '../staff-ratings';
import { Database } from 'better-sqlite3';
import { Rating, RawRating } from './Rating';
import { Logger } from 'fallout-utility';
import { RecipleClient } from 'reciple';

export interface RawRatings {
    staff_id: string;
    avarage: number;
    raw_ratings: RawRating[];
}

export interface Ratings extends RawRatings {
    staff: GuildMember;
    ratings: Rating[];
}

export class Ratings implements RawRatings {
    public main: StaffRatings;
    public database: Database;
    public logger: Logger;
    public client: RecipleClient;

    constructor (ratings: RawRatings, main: StaffRatings) {
        this.main = main;
        this.database = this.main.database;
        this.logger = this.main.logger.cloneLogger();
        this.client = this.main.client;

        this.ratings = [];
        this.raw_ratings = ratings.raw_ratings;
    }

    public async fetch(): Promise<void> {
        this.ratings = await Promise.all(this.raw_ratings.map(r => {
            const rating = new Rating(r, this.main);
            rating.fetch().catch(err => this.logger.error(err));
            return rating;
        }));

        const staff = this.ratings[0]?.staff;
        if (!staff) throw new Error('Cannot fetch staff user');

        this.staff = staff;
        this.avarage = Math.round(this.getAvarage()) / 100;
    }

    public getAvarage(): number {
        const total = this.ratings.reduce((acc, r) => acc + r.rating, 0);
        return total / this.ratings.length * 100;
    }
    
    public async delete(): Promise<void> {
        this.ratings.forEach(async r => r.delete().catch(err => this.logger.error(err)));
        this.database.prepare(`DELETE FROM ratings WHERE staff_id = ?`).run(this.staff_id);
    }
}
