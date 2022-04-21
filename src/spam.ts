import yml from 'yaml';
import path from 'path';
import { createConfig } from './_createConfig';
import { RecipleClient, RecipleScript, version } from 'reciple';

export interface SpamConfig {

}

class Spam implements RecipleScript {
    public versions: string[] = [version];
    public config: SpamConfig = Spam.getConfig();

    public onStart(client: RecipleClient) {
        return true;
    }

    public static getConfig(): SpamConfig {
        const configPath = path.join(process.cwd(), 'config/spam/config.yml');
        const defaultConfig = {};

        return yml.parse(createConfig(configPath, defaultConfig));
    }
}