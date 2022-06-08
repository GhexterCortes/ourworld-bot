import yml from 'yaml';
import path from 'path';
import { RecipleClient, RecipleScript } from 'reciple';
import { io, Socket } from 'socket.io-client';
import { createConfig } from './_createConfig';
import { TextChannel } from 'discord.js';
import { trimChars } from 'fallout-utility';

export interface SkinUserData {
    username: string;
    password: string;
    SkinData: string;
}

export interface SkinSocketConfig {
    socketurl: string;
    consoleChannel: string;
    token: string;    
}

export class SkinSocket implements RecipleScript {
    public versions: string[] = ['1.3.x'];
    public config: SkinSocketConfig = SkinSocket.getConfig();
    public console?: TextChannel;
    public io!: Socket;

    public onStart(client: RecipleClient) {
        this.io = io(this.config.socketurl);
        this.io.on('connect', () => {
            this.io.emit('token', this.config.token);
        });

        return true;
    }

    public async onLoad(client: RecipleClient) {
        const channel = client.channels.cache.get(this.config.consoleChannel) ?? await client.channels.fetch(this.config.consoleChannel).catch(() => undefined) ?? undefined;
        if (channel?.type == 'GUILD_TEXT') this.console = channel;

        this.io.on('skin', (data: SkinUserData) => {
            const skinurl = trimChars(this.config.socketurl, '/') + '/skin/api/skin/' + data.username;

            if (this.console) this.console.send(`skin set ${data.username} ${skinurl}`);
        });
    }

    public static getConfig(): SkinSocketConfig {
        const configPath = path.join(process.cwd(), 'config/skinSocket/config.yml');
        const defaultConfig: SkinSocketConfig = {
            socketurl: 'http://localhost:3000',
            consoleChannel: '000000000000000000',
            token: ''
        };

        return yml.parse(createConfig(configPath, defaultConfig));
    }
}

export default new SkinSocket();
