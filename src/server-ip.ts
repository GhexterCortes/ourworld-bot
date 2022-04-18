import { NewPingResult, ping } from 'minecraft-protocol';
import { Message, MessageEmbed } from 'discord.js';
import { RecipleClient, RecipleScript, isIgnoredChannel } from 'reciple';
import yml from 'yaml';
import path from 'path';
import fs from 'fs';

class ServerIP implements RecipleScript {
    public versions: string[] = ['1.0.11'];
    public servers: { ip: string; port: number; description: string; }[] = ServerIP.getConfig();
    public prefixes: string[] = ['!', '.', '-', '~', '?', '>', '/'];

    public onStart(client: RecipleClient) {
        client.on('messageCreate', async message => {
            if (message.author.bot || message.author.system || isIgnoredChannel(message.channelId, client.config?.ignoredChannels)) return;
            if (!this.prefixes.some(p => message.content.startsWith(p) && message.content.slice(p.length).trim().split(' ')[0] == 'ip')) return;

            await this.pingServers(message);
        });

        return true;
    }

    public getLoadingEmbed(ip: string, status: string, version?: string, players?: { online: number; max: number; }, description: string = ''): MessageEmbed {
        return new MessageEmbed()
            .setAuthor({ name: ip })
            .setDescription(description || ' ')
            .setFields([
                { name: 'Status', value: `${status} `, inline: false },
                ...(version ? [{ name: 'Version', value: `${version} `, inline: false }] : []),
                ...(players ? [{ name: 'Players', value: `${players.online ?? 0}/${players.max ?? 0}`, inline: false }] : [])
            ]);
    }

    public async getServerStatus(host: string, port: number) {
        interface ServerPingResult extends NewPingResult {
            status: string;
            online: boolean;
        }

        const response = await ping({ host, port, closeTimeout: 3000 })
        .then(result => {
            const res = {...result, status: !(result as NewPingResult).players?.max ? 'Offline' : 'Online', online: !(result as NewPingResult).players?.max ? false : true } as ServerPingResult;

            if (res.status == 'Offline') res.version.name = 'Unknown';
            return res;
        })
        .catch(() => {
            return {
                players: { max: 0, online: 0 },
                status: 'Error Pinging',
                version: {
                    name: 'Unknown',
                    protocol: 0
                },
                online: false
            }  as ServerPingResult;
        });

        return {
            players: { max: response.players?.max ?? 0, online: response.players?.online ?? 0 },
            status: response.status || 'Can\'t Connect',
            version: response.version.name,
            online: response.online
        };
    }

    public async pingServers(message: Message) {
        const serverEmbeds = this.servers.map(server => this.getLoadingEmbed(server.ip, 'Loading...', undefined, undefined, server.description));

        const reply = await message.reply({ content: ' ', embeds: serverEmbeds }).catch(() => { return { edit: () => {} } });
        for (const server of this.servers) {
            const status = await this.getServerStatus(server.ip, server.port);
            const embed = this.getLoadingEmbed(server.ip, status.status, status.online ? status.version : undefined, status.online ? status.players : undefined, server.description);

            if (status.online) {
                embed.setColor('GREEN');
            } else {
                embed.setColor('RED');
            }

            serverEmbeds[this.servers.indexOf(server)] = embed;

            await reply.edit({ content: ' ', embeds: serverEmbeds });
        }

        return reply;
    }

    public static getConfig(): { ip: string; port: number; description: string; }[] {
        const configPath = path.join(process.cwd(), '/config/server-ip/server.yml');
        if (!fs.existsSync(configPath)) {
            fs.mkdirSync(path.join(process.cwd(), '/config/server-ip'), { recursive: true });
            fs.writeFileSync(configPath, yml.stringify({ servers: [{ ip: 'play.hypixel.net', port: 25565, description: '' }] }));
        }

        const config = yml.parse(fs.readFileSync(configPath, 'utf-8')) as { servers: { ip: string; port: number; description: string; }[] };
        return config.servers;
    } 
}

module.exports = new ServerIP();