import { RecipleClient, RecipleScript, version } from 'reciple';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import { MessageOptions } from 'discord.js';
import { NewPingResult, ping } from 'minecraft-protocol';
import { Logger } from 'fallout-utility';
import path from 'path';
import yml from 'yaml';
import fs from 'fs';
import { EconomyUser } from './User';

export interface EconomyConfig {
    consoleChannelIds: string[];
    server: {
        host: string;
        port: number;
        closeTimeout: number;
    },
    withdrawItems: {
        label: string;
        emoji: string;
        item: string;
        count: number;
        price: number;
    }[];
}

export class Economy implements RecipleScript {
    public versions: string[] = [version];
    public logger: Logger = new Logger('Economy');
    public database: DatabaseType = new Database((() => { fs.mkdirSync(path.join(process.cwd(), 'config/economy/'), { recursive: true }); return path.join(process.cwd(), 'config/economy/database.db'); })());
    public client?: RecipleClient;
    public config: EconomyConfig = Economy.getConfig();
    public cache: EconomyUser[] = [];

    public onStart(client: RecipleClient) {
        this.client = client;
        this.logger = this.client.logger.cloneLogger();
        this.logger.defaultPrefix = 'Economy';

        this.logger.warn('Economy Starting...');
        this.createTables();

        return true;
    }

    public onLoad() {
        this.logger.warn('Economy Loaded!');
    }

    public async getUser(user_id: string): Promise<EconomyUser> {
        const user = this.cache.find(u => u.user_id == user_id);
        if (user) return user;

        return this.fetchUser(user_id);
    }

    public async fetchUser(user_id: string): Promise<EconomyUser> {
        const data = this.database.prepare('SELECT * FROM users WHERE user_id = ?').get(user_id);
        if (!data) throw new Error('Could not find user');

        return (new EconomyUser(data, this)).fetchUser();
    }

    public purgeCache(): EconomyUser[] {
        this.cache = this.cache.filter(u => !u.deleted);
        return this.cache;
    }

    public async sendToConsoleChannels(message: string|MessageOptions) {
        for (const c of this.config.consoleChannelIds || []) {
            const channel = this.client?.channels.cache.get(c) ?? await this.client?.channels.fetch(c).catch(() => undefined) ?? undefined;
            if (!channel || channel.type !== 'GUILD_TEXT') continue;

            channel.send(message).catch(() => {
                this.logger.error(`Could not send message to channel ${channel.name} on guild ${channel.guild.name}`);
            });
        }
    }

    public async isServerOnline(): Promise<boolean> {
        const pingServer = await ping(this.config.server).catch(() => undefined);
        if (!pingServer) return false;
        if (!(pingServer as NewPingResult)?.players?.max) return false;

        return true;
    }

    public isBanned(user_id: string): boolean {
        const banned = this.database.prepare('SELECT * FROM banned_users WHERE user_id = ? LIMIT 1').get(user_id);
        return !!banned;
    }

    public createTables(): Economy {
        // Users Table
        this.database.prepare(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id VARCHAR(18),
            playername VARCHAR(16),
            balance INTEGER DEFAULT 0
        )`).run();

        // Auth Table
        this.database.prepare(`CREATE TABLE IF NOT EXISTS auth (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id VARCHAR(18),
            playername VARCHAR(16),
            balance INTEGER DEFAULT 0,
            auth_code VARCHAR(6)
        )`).run();

        // Banned Table
        this.database.prepare(`CREATE TABLE IF NOT EXISTS banned_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            reason TEXT
        )`).run();

        // Inventory Table
        this.database.prepare(`CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id VARCHAR(18),
            item_id INTEGER,
            count INTEGER DEFAULT 1
        )`).run();

        return this;
    }

    public static generateCode(): string {
        // generate 6 random characters
        return (Math.random() + 1).toString(36).substring(6).toUpperCase();
    }

    public static getConfig(): EconomyConfig {
        const configPath = path.join(process.cwd(), 'config/economy/config.yml');
        if (!fs.existsSync(configPath)) {
            fs.mkdirSync(path.dirname(configPath), { recursive: true });
            fs.writeFileSync(configPath, yml.stringify(Economy.getDefaultConfig()));

            return Economy.getDefaultConfig();
        }

        return yml.parse(fs.readFileSync(configPath, 'utf8'));
    }

    public static getDefaultConfig(): EconomyConfig {
        return {
            consoleChannelIds: ['000000000000000000'],
            server: {
                host: 'localhost',
                port: 25565,
                closeTimeout: 5000
            },
            withdrawItems: [
                {
                    label: 'Diamond',
                    emoji: '💎',
                    item: 'minecraft:diamond',
                    count: 12,
                    price: 6969
                }
            ]
        };
    }
}