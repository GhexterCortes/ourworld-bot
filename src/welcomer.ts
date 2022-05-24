import { MessageEmbed, MessageOptions } from 'discord.js';
import path from 'path';
import yml from 'yaml';
import { RecipleClient, RecipleScript, version } from 'reciple';
import { createConfig } from './_createConfig';

export interface GuildJoinConfig {
    guildId: string;
    welcomeChannel: string;
    goodbyeChannel: string;
    onJoinRoles: string[];
    welcomeMessage?: string|MessageOptions;
    goodbyeMessage?: string|MessageOptions;
}

class Welcomer implements RecipleScript {
    public versions: string[] = [version];
    public guilds: GuildJoinConfig[] = Welcomer.getGuilds();

    public onStart() {
        return true;
    }

    public onLoad(client: RecipleClient) {
        client.on('guildMemberAdd', async member => {
            const guild = member.guild;  
            const config = this.guilds.find(g => g.guildId == guild.id);
            if (!config) return;

            const channel = member.guild.channels.cache.find(c => c.id == config.welcomeChannel) ?? await member.guild.channels.fetch(config.welcomeChannel).catch(() => undefined);
            if (!channel || channel.type !== 'GUILD_TEXT') return;

            const defaultWelcomeMessage = {
                embeds: [
                    new MessageEmbed()
                        .setColor('BLUE')
                        .setAuthor({ name: `Welcome ${member.user.tag}!`, iconURL: member.user.displayAvatarURL() })
                        .setDescription(`Welcome to ${guild.name}! Please read the rules and have fun!`)
                ]
            };

            channel.send(config.welcomeMessage || defaultWelcomeMessage).catch(() => {});
            member.roles.add(config.onJoinRoles).catch(() => {});
        });

        client.on('guildMemberRemove', async member => {
            const guild = member.guild;  
            const config = this.guilds.find(g => g.guildId == guild.id);
            if (!config) return;

            const channel = member.guild.channels.cache.find(c => c.id == config.goodbyeChannel) ?? await member.guild.channels.fetch(config.goodbyeChannel).catch(() => undefined);
            if (!channel || channel.type !== 'GUILD_TEXT') return;

            const defaultGoodbyeMessage = {
                embeds: [
                    new MessageEmbed()
                        .setColor('GREY')
                        .setAuthor({ name: `${member.user.tag} left the server`, iconURL: member.user.displayAvatarURL() })
                ]
            };

            channel.send(config.goodbyeMessage || defaultGoodbyeMessage).catch(() => {});
        });
    }

    public static getGuilds() {
        const configPath = path.join(process.cwd(), 'config/welcomer/guilds.yml');

        return yml.parse(createConfig(configPath, [])) as GuildJoinConfig[];
    }
}

export default new Welcomer();
