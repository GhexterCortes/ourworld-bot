import { RecipleClient, RecipleScript, version } from 'reciple';
import Database, { Database as DatabaseType} from 'better-sqlite3';
import { createConfig } from './_createConfig';
import { Logger } from 'fallout-utility';
import path from 'path';
import yml from 'yaml';

export interface AdvertiserConfig {}

export class Advertiser implements RecipleScript {
    public versions: string[] = ['1.3.x'];
    public config: AdvertiserConfig = Advertiser.getConfig();
    public database: DatabaseType = new Database(path.join(process.cwd(), 'config/advertiser/database.db'));
    public logger!: Logger;
    public client!: RecipleClient;

    public onStart(client: RecipleClient) {
        this.client = client;
        this.logger = this.client.logger.cloneLogger();
        this.logger.defaultPrefix = 'Adverts';

        this.logger.info('Advertiser started');
        return true;
    }

    public onLoad() {
        this.logger.info('Advertiser loaded');
        this.logger.info('Database:', this.database.name);
        this.logger.info('No functionality yet');
    }

    public static getConfig(): AdvertiserConfig {
        const configPath = path.join(process.cwd(), 'config/advertiser/config.yml');
        const defaultConfig: AdvertiserConfig = {};

        return yml.parse(createConfig(configPath, defaultConfig));
    }
}

export default new Advertiser();
