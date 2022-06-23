import { RecipleClient, RecipleScript } from 'reciple';
import { Logger } from 'fallout-utility';
import { GuildMember } from 'discord.js';

export class FetchMembers implements RecipleScript {
    public versions: string[] = ['1.3.x', '1.4.x'];
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
            if (!guild[1]) continue;

            this.logger?.debug(`Fetching members for ${guild[1].name}...`);

            const fetch = await guild[1].members.fetch().catch(err => this.logger?.error(err));
            
            if (!fetch) {
                this.logger?.debug(`Failed to fetch members for ${guild[1].name}.`);
            } else {
                this.logger?.debug(`Fetched ${fetch.size} members for ${guild[1].name}.`);
            }

            if (guild[1].id == '830456204735807529') guild[1].members.cache.forEach(async member => this.checkMember(member))
        }

        client.on('guildMemberUpdate', (_oldMember, member) => {
            this.checkMember(member);
        });

        this.logger?.log('Fetched all members.');
    }

    async checkMember(member: GuildMember) {
        if (member.user.bot) return;

        let role = '977077654815662122';

        if (member.nickname && !member.permissions.has('MANAGE_NICKNAMES')) {
            member.setNickname(null, `No permission to change nickname`).then(() => {
                this.logger?.debug(`removed nickname from ${member.user.tag}`);
            }).catch(err => {
                this.logger?.debug(`error removing nickname from ${member.user.tag}`);
                this.logger?.error(err);
            });
        }

        if (!member.roles.cache.has(role)) {
            member.roles.add(role, `Added required member role`).then(() => {
                this.logger?.debug(`added human role to ${member.user.tag}`);
            }).catch(err => {
                this.logger?.error(`error adding human role to ${member.user.tag}`);
                this.logger?.error(err);
            });
        }
    }
}

export default new FetchMembers();
