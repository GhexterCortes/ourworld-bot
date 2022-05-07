import { InteractionCommandBuilder, isIgnoredChannel, MessageCommandBuilder, RecipleClient, RecipleScript, version } from 'reciple';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import { ColorResolvable, Guild, MessageEmbed, TextChannel, User } from 'discord.js';
import path from 'path';
import fs from 'fs';
import stringSimilarity from 'string-similarity-js';
import { errorEmbed } from './_errorEmbed';
import { createConfig } from './_createConfig';
import { getRandomKey } from 'fallout-utility';

export interface RawSnipedMessage {
    id: number;
    guildId: string;
    channelId: string;
    content: string;
    attachments: number;
    repliedUserId?: string;
    authorUserId: string;
    createdAt: number;
}

export interface SnipedMessage extends RawSnipedMessage {
    guild?: Guild;
    channel?: TextChannel;
    repliedUser?: User;
    authorUser?: User;
    database?: DatabaseType;
    deleted: boolean;
}

export class SnipedMessage implements SnipedMessage {
    constructor(raw: RawSnipedMessage, database?: DatabaseType) {
        this.id = raw.id;
        this.guildId = raw.guildId;
        this.channelId = raw.channelId;
        this.content = raw.content;
        this.attachments = raw.attachments ?? 0;
        this.repliedUserId = raw.repliedUserId ?? undefined;
        this.authorUserId = raw.authorUserId;
        this.createdAt = raw.createdAt;
        this.database = database;
        this.deleted = false;
    }

    public async fetchData(client?: RecipleClient): Promise<SnipedMessage> {
        const guild = client?.guilds.cache.get(this.guildId) ?? await client?.guilds.fetch(this.guildId) ?? undefined;
        const channel = client?.channels.cache.get(this.channelId) ?? await client?.channels.fetch(this.channelId) ?? undefined;
        const authorUser = client?.users.cache.get(this.authorUserId) ?? await client?.users.fetch(this.authorUserId) ?? undefined;
        const repliedUser = this.repliedUserId ? (client?.users.cache.get(this.repliedUserId) ?? await client?.users.fetch(this.repliedUserId) ?? undefined) : undefined;

        this.guild = guild;
        this.channel = channel?.type === 'GUILD_TEXT' ? channel : undefined;
        this.authorUser = authorUser;
        this.repliedUser = repliedUser;

        return this;
    }

    public createEmbed(embedColor: ColorResolvable = 'BLUE'): MessageEmbed {
        const embed = new MessageEmbed();

        embed.setColor(embedColor);
        embed.setAuthor({ name: this.authorUser?.tag ?? 'Unknown', iconURL: this.authorUser?.displayAvatarURL({ dynamic: true, size: 56 }) ?? undefined });
        embed.setDescription(this.content);
        embed.setTimestamp(new Date(this.createdAt));
        embed.setFooter({ text: `Sniped message` });

        if (this.repliedUser) embed.addField('Replied To', `<@!${this.repliedUser.id}>`, true);
        if (this.attachments > 0) embed.addField(this.attachments > 1 ? 'Attachments' : 'Attachment', `${this.attachments}`, true);

        return embed;
    }

    public delete(): boolean {
        if (!this.database) return false;
        if (this.deleted) throw new Error('Message has already been deleted');

        this.database.prepare(`DELETE FROM snipes WHERE id = ?`).run(this.id);
        const row = this.database.prepare(`SELECT * FROM snipes WHERE id = ?`).get(this.id);
        
        this.deleted = !row;
        return this.deleted;
    }
}

class Snipe implements RecipleScript {
    public versions: string[] = [version];
    public commands: (MessageCommandBuilder|InteractionCommandBuilder)[] = [];
    public ignoredStrings: string[] = Snipe.getIgnoredMessages();
    public client?: RecipleClient;
    public database: DatabaseType;

    constructor () {
        const databasePath = path.join(process.cwd(), 'config/snipe/database.db');
        fs.mkdirSync(path.join(process.cwd(), 'config/snipe'), { recursive: true });

        this.database = new Database(databasePath);
        this.database.prepare(`CREATE TABLE IF NOT EXISTS snipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guildId VARCHAR(18),
            channelId VARCHAR(18),
            content TEXT,
            attachments INTEGER,
            repliedUserId VARCHAR(18),
            authorUserId VARCHAR(18),
            createdAt INTEGER
        )`).run();
    }

    public onStart(client: RecipleClient) {
        this.client = client;
        this.commands = [
            new MessageCommandBuilder()
                .setName('snipe')
                .setDescription('View the last deleted message in this channel')
                .setExecute(async command => {
                    const message = command.message;

                    const snipes = await this.fetchSnipes(message.channel.id);
                    if (!snipes.length) return message.reply({ embeds: [errorEmbed('No snipes in this channel')] });

                    const snipe = snipes[0];
                    const embed = snipe.createEmbed('BLUE');

                    const deleteSnipe = snipe.delete();
                    if (!deleteSnipe) throw new Error('Can\'t delete snipe '+ snipe.id); 

                    await message.reply({ embeds: [embed] }).catch(() => {});
                }),
            new InteractionCommandBuilder()
                .setName('snipe')
                .setDescription('View the last deleted message in this channel')
                .setExecute(async command => {
                    const interaction = command.interaction;
                    if (!interaction.channel) return;

                    await interaction.deferReply().catch(() => {});

                    const snipes = await this.fetchSnipes(interaction.channel.id);
                    if (!snipes.length) return interaction.editReply({ embeds: [errorEmbed('No snipes in this channel')] });

                    const snipe = snipes[0];
                    const embed = snipe.createEmbed('BLUE');

                    const deleteSnipe = snipe.delete();
                    if (!deleteSnipe) throw new Error('Can\'t delete snipe '+ snipe.id); 

                    await interaction.editReply({ embeds: [embed] }).catch(() => {});
                })
        ];

        this.client.logger.debug(`Ignored snipe messages: "${this.ignoredStrings.join('", "')}"`, 'Snipe');

        return true;
    }

    public onLoad(client: RecipleClient) {
        client.on('messageDelete', async message => {
            if (message.author?.bot || message.author?.system || isIgnoredChannel(message.channelId, client.config?.ignoredChannels)) return;
            if (!message.inGuild() || !message.content || this.ignoredStrings.some(b => b.toLowerCase() === message.content.toLowerCase())) return;

            const snipe: RawSnipedMessage = {
                id: 0,
                guildId: message.guildId,
                channelId: message.channelId,
                content: message.content,
                attachments: message.attachments.size,
                repliedUserId: message.reference ? (await message.fetchReference()).author?.id : undefined,
                authorUserId: message.author.id,
                createdAt: message.createdTimestamp
            };

            this.client?.logger.debug(`Sniped message (${message.id}): `);
            this.client?.logger.debug(snipe);

            this.database.prepare(`INSERT INTO snipes (
                guildId,
                channelId,
                content,
                attachments,
                repliedUserId,
                authorUserId,
                createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(snipe.guildId, snipe.channelId, snipe.content, snipe.attachments, snipe.repliedUserId, snipe.authorUserId, snipe.createdAt);
        });

        client.on('messageCreate', async message => {
            if (message.author?.bot || message.author?.system || isIgnoredChannel(message.channelId, client.config?.ignoredChannels)) return;
            if (!message.inGuild() || !message.content || this.ignoredStrings.some(b => b.toLowerCase() === message.content.toLowerCase())) return;
            if (!message.content.trim().startsWith(client.config?.prefix || '!')) return;

            const content = message.content.trim().slice(client.config?.prefix.length || 1).split(' ')[0].toLowerCase() ?? '';
            const replies = ['did you mean `!snipe`?', 'dum', 'snipe!', 'idk that command lmao', 'check your spelling', 'spell it again', 'what?', 'lol', 'lmao', 'SNIPE 😭'];

            if (!content || content == 'snipe') return;
            if (stringSimilarity(content, 'snipe') < 0.5) return;
            
            message.reply(getRandomKey(replies)).catch(() => {});
        });
    }

    public async fetchSnipes(channel: string, limit: number = 5) {
        let rawsnipes = this.database.prepare(`SELECT * FROM snipes WHERE channelId = ? ORDER BY id DESC LIMIT ?`).all(channel, limit) as RawSnipedMessage[];
        if (!rawsnipes) rawsnipes = [];

        const snipes = [];
        for (const rawsnipe of rawsnipes) {
            snipes.push(await (new SnipedMessage(rawsnipe, this.database)).fetchData(this.client));
        }

        return snipes;
    }

    public static getIgnoredMessages(): string[] {
        return createConfig(path.join(process.cwd(), 'config/snipe/ignored.txt'), '').split('\n').map(line => line.trim()).filter(line => line.length > 0);
    }
}

module.exports = new Snipe();