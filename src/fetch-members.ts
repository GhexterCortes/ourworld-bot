import { RecipleClient, RecipleScript, version } from 'reciple';
import { Logger } from 'fallout-utility';

class FetchMembers implements RecipleScript {
    public versions: string[] = [version];
    public logger?: Logger;

    public onStart(client: RecipleClient) {
        this.logger = client.logger.cloneLogger();

        this.logger.defaultPrefix = 'FetchMembers';

        return true;
    }

    public async onLoad(client: RecipleClient) {
        this.logger?.log('Fetching guild members...');

        const guilds = client.guilds.cache;

        this.logger?.log(`Found ${guilds.size} guilds.`);
        for (const guild of guilds) {
            this.logger?.warn(`Fetching members for ${guild[1].name}...`);

            const fetch = await guild[1].members.fetch().catch(err => this.logger?.error(err));
            
            if (!fetch) {
                this.logger?.error(`Failed to fetch members for ${guild[1].name}.`);
            } else {
                this.logger?.warn(`Fetched ${fetch.size} members for ${guild[1].name}.`);
            }
        }
    }
}

module.exports = new FetchMembers();