import { RecipleClient, RecipleScript, version } from 'reciple';
import { ContextMenuCommandBuilder } from '@discordjs/builders';
import path from 'path';
import yml from 'yaml';
import { createConfig } from './_createConfig';
import { Message, MessageEmbed, TextChannel } from 'discord.js';
import { errorEmbed } from './_errorEmbed';

export interface ReportConfig {
    reportsChannel: string[];
}

export class Report implements RecipleScript {
    public versions: string[] = ['1.3.x', '1.4.x'];
    public config: ReportConfig = Report.getConfig();
    public channels: TextChannel[] = [];
    
    public onStart(client: RecipleClient) {
        client.on('interactionCreate', async interaction => {
            if (!interaction.isMessageContextMenu() || interaction.commandName !== 'report') return;

            const message = interaction.targetMessage as Message;
            if (message.channel.type !== 'GUILD_TEXT') return;

            await interaction.deferReply({ ephemeral: true });

            const embed = new MessageEmbed()
                .setAuthor({ name: `${interaction.user.tag} Reported a message`, iconURL: interaction.user.displayAvatarURL() })
                .setColor('RED')
                .setDescription(message.content + (message.editedAt ? ' (edited)' : ''))
                .setTimestamp(message.createdAt)
                .addField('Attachments', `${message.attachments.size}`, true)
                .addField('Embeds', `${message.embeds.length}`, true)
                .addField('Reactions', `${message.reactions.cache.map(e => '**'+ e.emoji.name +'** ('+ e.count +')').slice(10).join('\n')}` || 'None', true)
                .addField('Author', `**${message.author.tag}** (<@${message.author.id}>)`, true)
                .addField('Channel', `**${message.channel.name}** (<#${message.channel.id}>)`, true)
                .addField('Message URL', `[message](${message.url})`, true)
                .setThumbnail(message.author.displayAvatarURL())
                .setFooter({ text: `Message ID: ${message.id}`});
            
            for (const channel of this.channels) {
                channel.send({ embeds: [embed] }).catch(() => {});
            }

            interaction.editReply({ embeds: [errorEmbed(`Message reported!`, true)] });
        });

        return true;
    }

    public async onLoad(client: RecipleClient) {
        for (const channelId of this.config.reportsChannel) {
            const channel = client.channels.cache.get(channelId) ?? await client.channels.fetch(channelId).catch(() => undefined) ?? undefined;

            if (!channel || channel.type !== 'GUILD_TEXT') continue;
            this.channels.push(channel);
        }

        client.otherApplicationCommandData = [
            ...client.otherApplicationCommandData,
            new ContextMenuCommandBuilder()
                .setName('report')
                .setType(3)
        ];
    }

    public static getConfig() {
        const configPath = path.join(process.cwd(), 'config/report/config.yml');
        const defaultConfig = {
            reportsChannel: ['000000000000000000', '000000000000000000']
        };

        return yml.parse(createConfig(configPath, defaultConfig)) as ReportConfig;
    }
}

export default new Report();
