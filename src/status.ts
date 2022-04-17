import { ActivitiesOptions, PresenceData } from 'discord.js';
import path from 'path';
import yml from 'yaml';
import fs from 'fs';
import { RecipleClient, RecipleScript } from 'reciple';
import { getRandomKey } from 'fallout-utility';

export interface StatusConfig {
    presenceList: ActivitiesOptions[];
    status: PresenceData["status"];
    presenceInterval: number;
    randomPresence: boolean;
}

class Status implements RecipleScript {
    public versions: string[] = ['1.0.10'];
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

        setTimeout(() => this.setPresence(client), this.config.presenceInterval);
    }

    public static getConfig(): StatusConfig {
        const configPath = path.join(process.cwd(), 'config/status/config.yml');
        if (!fs.existsSync(configPath)) {
            fs.mkdirSync(path.join(process.cwd(), 'config/status'), { recursive: true });
            fs.writeFileSync(configPath, yml.stringify({
                presenceList: [],
                status: 'online',
                presenceInterval: 2 * 60 * 1000,
                randomPresence: true,
            }));
        }

        return yml.parse(fs.readFileSync(configPath, 'utf8')) as StatusConfig;
    }
}

module.exports = new Status();