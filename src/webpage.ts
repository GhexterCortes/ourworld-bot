import express, { Application, Express } from 'express';
import { Logger } from 'fallout-utility';
import path from 'path';
import yml from 'yaml';
import { Config, RecipleClient, RecipleConfig, RecipleScript, version } from 'reciple';
import { createConfig } from './_createConfig';
import { existsSync, readFileSync } from 'fs';

export interface APIResponse {
    version: string;
    latency: number;
    user: {
        id: string;
        username: string;
        discriminator: string;
        avatar: string;
    },
    guilds: {
        total: number;
        list: {
            id: string;
            name: string;
            icon: string;
        }[]
    },
    commands: {
        total: number;
        messageCommands: string[];
        interactionCommands: string[];
    }
    config: Config;
}

export interface WebpageConfig {
    port: number;
}

export class Webpage implements RecipleScript {
    public versions: string[] = [version];
    public logger!: Logger;
    public config: WebpageConfig = Webpage.getConfig();
    public client!: RecipleClient;
    public web: Express = express();

    public onStart(client: RecipleClient) {
        this.client = client;
        this.logger = client.logger;
        this.logger.defaultPrefix = 'Webpage';

        this.listen();
        this.routes();

        return true;
    }

    public async listen() {
        return new Promise(r => this.web.listen(this.config.port, () => {
            this.logger.info(`Listening on port ${this.config.port}`);
            r(void 0);
        }));
    }

    public routes() {
        this.web.get('/api', (req, res) => {
            const json = this.apiResponse();
            res.send(json);
        });

        this.web.get('/logs', (req, res) => {
            const file = path.join(process.cwd(), this.client.config!.fileLogging.logFilePath);
            const read = existsSync(file) ? readFileSync(file, 'utf-8') : '';

            res.send({
                logs: read,
            });
        });
    }

    public apiResponse(): APIResponse {
        const response: APIResponse = {
            version: version,
            latency: this.client.ws.ping,
            user: {
                id: this.client.user?.id!,
                username: this.client.user?.username!,
                discriminator: this.client.user?.discriminator!,
                avatar: this.client.user?.displayAvatarURL()!,
            },
            commands: {
                total: Object.keys(this.client.commands.INTERACTION_COMMANDS).length + Object.keys(this.client.commands.MESSAGE_COMMANDS).length,
                interactionCommands: Object.keys(this.client.commands.INTERACTION_COMMANDS),
                messageCommands: Object.keys(this.client.commands.MESSAGE_COMMANDS),
            },
            guilds: {
                total: this.client.guilds.cache.size,
                list: [
                    ...this.client.guilds.cache.map(g => { return {
                        id: g.id,
                        name: g.name,
                        icon: g.iconURL()!,
                    }; })
                ]
            },
            config: this.client.config!,
        };
        
        return response;
    }

    public static getConfig(): WebpageConfig {
        const configPath = path.join(process.cwd(), 'config/webpage/config.yml');
        const defaultConfig: WebpageConfig = {
            port: 3000,
        };

        return yml.parse(createConfig(configPath, defaultConfig));
    }
}

export default new Webpage();
