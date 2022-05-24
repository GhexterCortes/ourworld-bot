import { RecipleClient, RecipleScript, version } from 'reciple';
import { Logger } from 'fallout-utility';
import path from 'path';
import yml from 'yaml';
import { createConfig } from './_createConfig';
import { ColorResolvable, MessageEmbed, TextChannel } from 'discord.js';

export interface LogChannelConfig {
    channelId: string;
}

class LogChannel implements RecipleScript {
    public versions: string[] = [version];
    public config: LogChannelConfig = LogChannel.getConfig();
    public LogChannel?: TextChannel;
    public logger?: Logger;

    public onStart(client: RecipleClient) {
        this.logger = client.logger.cloneLogger();
        this.logger.defaultPrefix = 'LogChannel';

        this.logger.info('Starting log channels');

        return true;
    }

    public onLoad(client: RecipleClient) {
        this.LogChannel = client.channels.cache.get(this.config.channelId) ? client.channels.cache.get(this.config.channelId) as TextChannel : undefined;

        if (!this.LogChannel) return this.logger?.error('Log channel not found');

        client.on('guildBanAdd', async (ban) => {
            this.logger?.debug(`${ban.user.tag} was banned from ${ban.guild.name}`);

            const embed = new MessageEmbed()
                .setAuthor({ name: ban.user.tag, iconURL: ban.user.displayAvatarURL() })
                .setThumbnail(ban.guild.iconURL() ?? '')
                .setDescription(`**${ban.user.tag}** was banned from **${ban.guild.name}**`)
                .setFooter({ text: `reason: ${ban.reason ?? 'No reason provided'}` })
                .setColor('DARK_BUT_NOT_BLACK');

            await this.LogChannel?.send({ embeds: [embed] }).catch(() => {});
        });

        client.on('guildBanRemove', async (ban) => {
            this.logger?.debug(`${ban.user.tag} was unbanned from ${ban.guild.name}`);

            const embed = new MessageEmbed()
                .setAuthor({ name: ban.user.tag, iconURL: ban.user.displayAvatarURL() })
                .setThumbnail(ban.guild.iconURL() ?? '')
                .setDescription(`**${ban.user.tag}** was unbanned from **${ban.guild.name}**`)
                .setFooter({ text: `reason: ${ban.reason ?? 'No reason provided'}` })
                .setColor('BLUE');

            await this.LogChannel?.send({ embeds: [embed] }).catch(() => {});
        });

        client.on('guildMemberAdd', async (member) => {
            this.logger?.debug(`${member.user.tag} joined ${member.guild.name}`);

            const embed = new MessageEmbed()
                .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
                .setThumbnail(member.user.displayAvatarURL())
                .setDescription(`**${member.user.tag}** joined **${member.guild.name}**`)
                .setFooter({ text: `ID: ${member.user.id}` })
                .setColor('GREEN');

            await this.LogChannel?.send({ embeds: [embed] }).catch(() => {});
        });

        client.on('guildMemberRemove', async (member) => {
            this.logger?.debug(`${member.user.tag} left ${member.guild.name}`);

            const embed = new MessageEmbed()
                .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
                .setThumbnail(member.user.displayAvatarURL())
                .setDescription(`**${member.user.tag}** left **${member.guild.name}**`)
                .setFooter({ text: `ID: ${member.user.id}` })
                .setColor('RED');

            await this.LogChannel?.send({ embeds: [embed] }).catch(() => {});
        });

        client.on('guildMemberUpdate', async (oldMember, newMember) => {
            this.logger?.debug(`${oldMember.user.tag} updated their profile in ${oldMember.guild.name}`);

            const embed = new MessageEmbed()
                .setAuthor({ name: oldMember.user.tag, iconURL: oldMember.user.displayAvatarURL() })
                .setThumbnail(oldMember.user.displayAvatarURL())
                .setDescription(`**${oldMember.user.tag}** updated their profile in **${oldMember.guild.name}**`)
                .setFooter({ text: `ID: ${oldMember.user.id}` })
                .setColor('YELLOW');

            await this.LogChannel?.send({ embeds: [embed] }).catch(() => {});
        });

        client.on('messageDelete', async (message) => {
            if (message.partial || message.channel.type !== 'GUILD_TEXT') return;
            if (message.author.bot) return;
            this.logger?.debug(`${message.author.tag} deleted a message in ${message.channel.name}`);

            const embed = new MessageEmbed()
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                .setThumbnail(message.author.displayAvatarURL())
                .setDescription(`**${message.author.tag}** deleted a message in **${message.channel.name}**`)
                .setFooter({ text: `ID: ${message.author.id}` })
                .setColor('PURPLE');

            await this.LogChannel?.send({ embeds: [embed] }).catch(() => {});
        });

        client.on('messageUpdate', async (oldMessage, newMessage) => {
            if (oldMessage.partial || oldMessage.channel.type !== 'GUILD_TEXT') return;
            if (oldMessage.author.bot) return;
            this.logger?.debug(`${oldMessage.author.tag} edited a message in ${oldMessage.channel.name}`);

            const embed = new MessageEmbed()
                .setAuthor({ name: oldMessage.author.tag, iconURL: oldMessage.author.displayAvatarURL() })
                .setThumbnail(oldMessage.author.displayAvatarURL())
                .setDescription(`**${oldMessage.author.tag}** edited a message in **${oldMessage.channel.name}**\n`+ '```diff\n'+ `-${oldMessage.content.split('\n').join('-')}\n+${newMessage.content?.split('\n').join('+') ?? ''}` +'\n```')
                .setFooter({ text: `ID: ${oldMessage.author.id}` })
                .setColor('PURPLE');

            await this.LogChannel?.send({ embeds: [embed] }).catch(() => {});
        });

        client.on('roleUpdate', async (oldRole, newRole) => {
            this.logger?.debug(`${oldRole.name} updated their role in ${oldRole.guild.name}`);

            const embed = new MessageEmbed()
                .setAuthor({ name: oldRole.name, iconURL: oldRole.guild.iconURL() ?? '' })
                .setThumbnail(newRole.guild.iconURL() ?? '')
                .setDescription(`<@&${newRole.id}> Role updated in **${oldRole.guild.name}**`)
                .setFooter({ text: `ID: ${oldRole.id}` })
                .setColor('YELLOW');

            await this.LogChannel?.send({ embeds: [embed] }).catch(() => {});
        });

        client.on('roleDelete', async (role) => {
            this.logger?.debug(`${role.name} was deleted from ${role.guild.name}`);

            const embed = new MessageEmbed()
                .setAuthor({ name: role.name, iconURL: role.guild.iconURL() ?? '' })
                .setThumbnail(role.guild.iconURL() ?? '')
                .setDescription(`<@&${role.id}> Role deleted from **${role.guild.name}**`)
                .setFooter({ text: `ID: ${role.id}` })
                .setColor('RED');

            await this.LogChannel?.send({ embeds: [embed] }).catch(() => {});
        });

        this.logger?.info('Log channel loaded');
    }

    public static getConfig(): LogChannelConfig {
        const configPath = path.join(process.cwd(), 'config/log-channel/config.yml');
        const defaultConfig: LogChannelConfig = {
            channelId: '000000000000000000',
        };

        return yml.parse(createConfig(configPath, defaultConfig));
    }
}

export default new LogChannel();
