import { RecipleClient, RecipleScript, version } from 'reciple';
import { ActivitiesOptions, PresenceData } from 'discord.js';
import { getRandomKey } from 'fallout-utility';
import { createConfig } from './_createConfig';
import path from 'path';
import yml from 'yaml';

export interface StatusConfig {
    presenceList: ActivitiesOptions[];
    status: PresenceData["status"];
    presenceInterval: number;
    randomPresence: boolean;
}

class Status implements RecipleScript {
    public versions: string[] = [version];
    public config: StatusConfig = Status.getConfig();
    public currentStatus = 0;

    public onStart() { return true; }

    public async onLoad(client: RecipleClient) {
        this.setPresence(client);
    }

    public setPresence(client: RecipleClient) {
        let presence = this.config.presenceList[this.currentStatus];

        if (this.config.randomPresence) presence = getRandomKey(this.config.presenceList);

        client.user?.setPresence({ status: this.config.status, activities: [presence] });
        this.currentStatus = (this.currentStatus + 1) % this.config.presenceList.length;

        client.logger.debug(`Updated status to ${presence.name}`, 'Status');

        setTimeout(() => this.setPresence(client), this.config.presenceInterval);
    }

    public static getConfig(): StatusConfig {
        const configPath = path.join(process.cwd(), 'config/status/config.yml');
        const defaultConfig: StatusConfig = {
            presenceList: [
                {
                    name: 'Minecraft',
                    type: 'PLAYING',
                    url: 'https://www.minecraft.net/'
                }
            ],
            status: 'online',
            presenceInterval: 2 * 60 * 1000,
            randomPresence: true,
        };

        return yml.parse(createConfig(configPath, defaultConfig));
    }
}

module.exports = new Status();