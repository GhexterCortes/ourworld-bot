import yml from 'yaml';
import path from 'path';
import axios from 'axios';
import { TextChannel } from 'discord.js';
import { Logger, replaceAll } from 'fallout-utility';
import { RecipleClient, RecipleScript, version } from 'reciple';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import { createConfig } from './_createConfig';

export interface AntiProxyConfig {
    token?: string;
    consoleBotIds: string[];
    consoleChannelIds: string[];
    banIpCommand: `ban-ip $1 $2`;
    banCommand: `ban $1 $2`;
    banReason: string;
    afterBanMessages: string[];
}

export interface Player {
    name?: string;
    ip: string;
    port: number;
    vpn: boolean;
}

export class AntiProxy implements RecipleScript {
    public versions: string[] = ['1.3.x', '1.4.x'];
    public config: AntiProxyConfig = AntiProxy.getConfig();
    public database: DatabaseType = new Database(path.join(process.cwd(), 'config/anti-proxy/database.db'));
    public token?: string = process.env['PROXY_TOKEN'] ?? this.config.token;
    public checkedIps: { messageId: string; channelId: string; ip: string; }[] = [];
    public logger?: Logger;

    public async onStart(client: RecipleClient) {
        this.logger = client.logger.cloneLogger();
        this.logger.defaultPrefix = 'AntiProxy';

        if (!this.token) {
            this.logger?.error('No token provided. Please set the PROXY_TOKEN environment variable.');
            return false;
        }

        this.createTables();

        return true;
    }

    public async onLoad(client: RecipleClient) {
        client.on('messageCreate', async message => {
            if(!this.config.consoleChannelIds.includes(message.channelId) || !this.config.consoleBotIds.includes(message.author.id)) return;
            if (message.channel.type !== 'GUILD_TEXT') return;

            const content = message.content;
            const players = this.parseMessage(content);
            const proxyUsers = await this.filterProxyIp(players, message.id);

            await this.banPlayers(proxyUsers, message.channel);
            this.addCheckedIps(proxyUsers, message.id, message.channelId);
        });
        client.on('messageUpdate', async (messageOld, message) => {
            if(!message.author || !this.config.consoleChannelIds.includes(message.channelId) || !this.config.consoleBotIds.includes(message.author.id)) return;
            if (message.channel.type !== 'GUILD_TEXT') return;

            const content = message.content ?? '';
            const players = this.parseMessage(content);
            const proxyUsers = await this.filterProxyIp(players, message.id);

            this.addCheckedIps(proxyUsers, message.id, message.channelId);
            await this.banPlayers(proxyUsers, message.channel);
        });
    }

    public addCheckedIps(players: Player[], messageId: string, channelId: string) {
        for (const player of players) {
            this.checkedIps = this.checkedIps.filter(ip => ip.ip === player.ip && ip.channelId === channelId && ip.messageId !== messageId);
            this.checkedIps.push({ messageId, channelId, ip: player.ip });

            this.logger?.debug(`Added to checked IPs in message ${messageId}: ${player.ip}`);
        }
    }

    public async banPlayers(players: Player[], channel: TextChannel) {
        for (const player of players) {
            this.logger?.debug(`Banned ${player.name} (${player.ip})`);
            await channel.send(this.config.banIpCommand.replace('$1', player.ip).replace('$2', this.config.banReason)).catch(() => {});

            if (player.name) await channel.send(this.config.banCommand.replace('$1', player.name).replace('$2', this.config.banReason)).catch(() => {});

            for (const message of this.config.afterBanMessages) {
                await channel.send(AntiProxy.messagePlaceholder(message, player)).catch(() => {});
            }
        }
    }

    public async filterProxyIp(players: Player[], messageId: string): Promise<Player[]> {
        const api = 'https://proxycheck.io/v2/';
        const filteredPlayers = [];
        
        this.logger?.debug(`Filtering proxy IPs`);

        for (const player of players) {
            if (this.checkedIps.some(c => c.ip == player.ip && c.messageId == messageId)) continue;

            const cache = this.getCache(player.ip);
            let cacheResponse = cache ? { status: 'ok', [`${cache.ip}`]: { proxy: cache.vpn ? 'yes' : 'no' } } : undefined;
            const response = cache ? cacheResponse :await axios.get(`${api}${player.ip}?key=${this.token}&vpn=1`).then(res => res.data).catch(() => undefined);

            if (!response || response.status !== 'ok') continue;
            if (response[player.ip]?.proxy === 'yes') {
                player.vpn = response[player.ip].proxy === 'yes';
                filteredPlayers.push(player);
            }

            if (!cache) this.addCache(player);
        }

        this.logger?.debug(`Found ${filteredPlayers.length} proxy users`);
        this.logger?.debug(filteredPlayers);

        return filteredPlayers;
    }

    public parseMessage(message: string): Player[] {
        const lines = message.split('\n');
        const players = [];

        for (const line of lines) {
            const words = line.split(' ');

            const ip = words.find(word => /\[(.*?)\]/g.test(word));
            const cleanedIP = ip ? ip.replace(/\[(.*?)\]/g, '$1').split('/')[1] ?? undefined : undefined;
            if (!cleanedIP || !ip || !AntiProxy.isValidIP(cleanedIP.split(':')[0])) continue;

            const playername = words.find(name => name.endsWith(ip))?.replace(/\[(.*?)\]/g, '');
            const player: Player = {
                name: playername,
                ip: cleanedIP.split(':')[0],
                port: parseInt(cleanedIP.split(':')[1], 10),
                vpn: false
            };

            this.logger?.debug(`Player ${player.name}[${player.ip}] joined the game`);
            players.push(player);
        }

        return players;
    }

    public addCache(player: Player) {
        this.database.prepare('DELETE FROM ip_cache WHERE ip = ?').run(player.ip);
        const statement = this.database.prepare('INSERT INTO ip_cache (player, ip, port, vpn) VALUES (?, ?, ?, ?)');

        this.logger?.debug(`Adding IP cache for player: ${player.name} (${player.ip}) to database`);
        statement.run(player.name, player.ip, player.port, player.vpn ? 1 : 0);

        this.logger?.debug('Added to database '+ player.name +' ('+ player.ip +')');
        return this.getCache(player.ip);
    }

    public getCache(ip: string): Player|undefined {
        this.logger?.debug('Retrieving data from database');

        const row = this.database.prepare('SELECT * FROM ip_cache WHERE ip = ?').get(ip);
        if (!row) return undefined;

        this.logger?.debug(`Found data for ip: ${ip}`);
        this.logger?.debug(row);
        
        return {
            name: row.player || undefined,
            ip: row.ip,
            port: row.port,
            vpn: row.vpn,
        };
    }

    public createTables(): AntiProxy {
        this.logger?.debug('Creating tables if not exists');
        this.database.prepare(`CREATE TABLE IF NOT EXISTS ip_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player TEXT NOT NULL,
            ip TEXT NOT NULL,
            port INTEGER NOT NULL,
            vpn INTEGER NOT NULL
        )`).run();

        this.logger?.debug('Tables created');
        return this;
    }

    public static messagePlaceholder(message: string, player: Player) {
        return replaceAll(message, ['{name}', '{ip}', '{port}'], [player.name ?? 'Unknown', player.ip, `${player.port}`]);
    }

    public static isValidIP(ip: string) {
        return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip);
    }

    public static getConfig(): AntiProxyConfig {
        const configPath = path.join(process.cwd(), 'config/anti-proxy/config.yml');
        const defaultConfig: AntiProxyConfig = {
            token: '',
            consoleBotIds: [],
            consoleChannelIds: [],
            banIpCommand: 'ban-ip $1 $2',
            banCommand: 'ban $1 $2',
            banReason: 'Your IP address was found using a proxy. This is not allowed for security reasons.',
            afterBanMessages: ['say {name} was detected using a proxy/vpn and has been banned.']
        };

        return yml.parse(createConfig(configPath, defaultConfig));
    }
}

export default new AntiProxy();
