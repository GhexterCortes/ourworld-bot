import { InteractionCommandBuilder, isIgnoredChannel, MessageCommandBuilder, RecipleClient, RecipleScript, version } from 'reciple';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import { ColorResolvable, Guild, MessageActionRow, MessageButton, MessageEmbed, TextChannel, User } from 'discord.js';
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

export class Snipe implements RecipleScript {
    public versions: string[] = ['1.3.x'];
    public commands: (MessageCommandBuilder|InteractionCommandBuilder)[] = [];
    public ignoredStrings: string[] = Snipe.getIgnoredMessages();
    public client?: RecipleClient;
    public database: DatabaseType;
    public snipeBtn = new MessageActionRow()
    .setComponents([
        new MessageButton()
            .setCustomId('snipe-btn')
            .setLabel('Snipe')
            .setStyle('SECONDARY')
    ]);

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

                    const snipes = await this.fetchSnipes(message.channel.id, 1);
                    if (!snipes.length) return message.reply({ embeds: [errorEmbed('No snipes in this channel')] });

                    const snipe = snipes[0];
                    const embed = snipe.createEmbed('BLUE');

                    const deleteSnipe = snipe.delete();
                    if (!deleteSnipe) throw new Error('Can\'t delete snipe '+ snipe.id); 

                    await message.reply({
                        embeds: [embed],
                        components: [this.snipeBtn]
                    });
                }),
            new InteractionCommandBuilder()
                .setName('snipe')
                .setDescription('View the last deleted message in this channel')
                .setExecute(async command => {
                    const interaction = command.interaction;
                    if (!interaction.channel) return;

                    await interaction.deferReply().catch(err => this.client?.logger.error(err, 'Snipe'));

                    const snipes = await this.fetchSnipes(interaction.channel.id, 1);
                    if (!snipes.length) return interaction.editReply({ embeds: [errorEmbed('No snipes in this channel')] });

                    const snipe = snipes[0];
                    const embed = snipe.createEmbed('BLUE');

                    const deleteSnipe = snipe.delete();
                    if (!deleteSnipe) {
                        interaction.reply({ embeds: [errorEmbed(`An error occured`)] });
                        throw new Error('Can\'t delete snipe '+ snipe.id);
                    }

                    await interaction.editReply({
                        embeds: [embed],
                        components: [this.snipeBtn]
                    });
                }),
            new MessageCommandBuilder()
                .setName('snipes')
                .setDescription('View snipes count in this channel')
                .addOption(user => user
                    .setName('user')
                    .setDescription('Snipes count of a specific user')
                    .setRequired(false)
                )
                .setExecute(async command => {
                    const arg = command.command.args ? command.command.args[0] : undefined;

                    const channel = command.message.channel as TextChannel;
                    let user = command.message.mentions.users.first();

                    if (arg && !user) {
                        user = client.users.cache.find(u => u.tag == arg || u.id == arg) ?? await client.users.fetch(arg).catch(() => undefined);
                    }

                    const count = this.snipesCount(channel, user);
                    command.message.reply({ embeds: [count], components: [this.snipeBtn] });
                }),
            new InteractionCommandBuilder()
                .setName('snipes')
                .setDescription('View snipes count in this channel')
                .addUserOption(user => user
                    .setName('user')
                    .setDescription('Snipes count of a specific user')
                    .setRequired(false)
                )
                .setExecute(async command => {
                    const channel = command.interaction.channel as TextChannel;
                    const user = command.interaction.options.getUser('user') ?? undefined;

                    if (!channel) return;

                    await command.interaction.deferReply();

                    const count = this.snipesCount(channel, user);
                    command.interaction.editReply({ embeds: [count], components: [this.snipeBtn] });
                }),
            new MessageCommandBuilder()
                .setName('snipe-rank')
                .setDescription('View most sniped users in this channel')
                .setExecute(async command => {
                    const channel = command.message.channel as TextChannel;
                    const ranks = this.ranks(channel);

                    command.message.reply({ embeds: [ranks], components: [this.snipeBtn] });
                }),
            new InteractionCommandBuilder()
                .setName('snipe-rank')
                .setDescription('View most sniped users in this channel')
                .setExecute(async command => {
                    const channel = command.interaction.channel as TextChannel;
                    
                    await command.interaction.deferReply();
                    const ranks = this.ranks(channel);

                    command.interaction.editReply({ embeds: [ranks], components: [this.snipeBtn] });
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

            if (!content || content.startsWith('snipe')) return;
            if (stringSimilarity(content, 'snipe') < 0.5) return;
            
            message.reply(getRandomKey(replies)).catch(err => this.client?.logger.error(err, 'Snipe'));
        });

        client.on('interactionCreate', async component => {
            if (!component.isButton() || component.customId !== 'snipe-btn') return;

            const channel = component.channel;
            if (!channel) return;

            const message = channel.messages.cache.get(component.message.id) ?? await channel.messages.fetch(component.message.id).catch(() => {}) ?? undefined;
            if (message) {
                if (message.author.id !== client.user?.id) return;
                message.edit({ components: [] }).catch(err => this.client?.logger.error(err, 'Snipe'));
            }

            await component.deferReply().catch(err => this.client?.logger.error(err, 'Snipe'));

            const snipes = await this.fetchSnipes(channel.id, 1);
            if (!snipes.length) {
                component.editReply({ embeds: [errorEmbed('No snipes in this channel')] }).catch(err => this.client?.logger.error(err, 'Snipe'));
                return;
            }

            const snipe = snipes[0];
            const embed = snipe.createEmbed('BLUE');

            const deleteSnipe = snipe.delete();
            if (!deleteSnipe) {
                component.editReply({ embeds: [errorEmbed(`An error occured`)] }).catch(err => this.client?.logger.error(err, 'Snipe'));
                return;
            }

            component.editReply({
                embeds: [
                    embed.setFooter({ text: `Sniped by ${component.user.tag}` })
                ],
                components: [this.snipeBtn]
            }).catch(err => this.client?.logger.error(err, 'Snipe'));
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

    public snipesCount(channel: TextChannel, user?: User) {
        const query = (() => {
            if (user) {
                return this.database.prepare(`SELECT id FROM snipes WHERE channelId = ? AND authorUserId = ?`).all(channel.id, user?.id);
            }

            return this.database.prepare(`SELECT id FROM snipes WHERE channelId = ?`).all(channel.id);
        })() as string[];

        const embed = new MessageEmbed().setColor('GREEN');
        const count = query.length > 1 ? `**${query.length}** snipes` : `**${query.length}** snipe`;

        if (user) {
            embed.setAuthor({ name: `Total sniped messages from ${user.tag} in this channel` });
            embed.setDescription(query.length ? count : `No sniped messages from <@${user.id}>`);
        } else {
            embed.setAuthor({ name: `Total sniped messages in this channel` });
            embed.setDescription(query.length ? count : `No sniped messages in this channel`);
        }

        return embed;
    }

    public snipesRanks(channel: TextChannel) {
        let ranks: { id: string; count: number }[] = [];
        const query = this.database.prepare(`SELECT authorUserId from snipes WHERE channelId = ?`).all(channel.id) as { authorUserId: string }[];

        for (const row of query) {
            const user = row.authorUserId;
            const key = ranks.find(i => i.id == user);
            let count = key?.count ?? 0;

            count++;
            ranks = [{ id: user, count }, ...ranks.filter(e => e.id !== user)];
        }

        ranks = ranks.sort((a, b) => b.count - a.count);
        ranks.splice(20);

        return ranks;
    }

    public ranks(channel: TextChannel) {
        const ranks = this.snipesRanks(channel);
        const embed = new MessageEmbed().setAuthor({ name: `Most sniped users in this channel` });

        let description = ``;
        let i = 0;

        for (const user of ranks) {
            let text = '';
            i++;

            switch (i) {
                case 1:
                    text = '🥇';
                    break;
                case 2:
                    text = '🥈';
                    break;
                case 3:
                    text = '🥉';
                    break;
                default:
                    text = getRandomKey([
                        '<:vomit:901325245707845662>',
                        '<:omegalol:901325113369186344>',
                        '<:geminipog:901325246534156338>',
                        '<:huh:901325246165045258>',
                        '<a:blelele:901325242927054929>',
                        '<a:meow:901325253140181003>',
                        '<a:trippepe:901325254985654293>',
                        '<a:flame:901325248413204510>'
                    ]);
            }

            text += ` \`${user.count} ${user.count > 1 ? 'snipes' : 'snipe'}\` — <@${user.id}>\n`;

            description += text;
        }

        embed.setDescription(description || `No record in this channel`);

        return embed;
    }

    public static getIgnoredMessages(): string[] {
        return createConfig(path.join(process.cwd(), 'config/snipe/ignored.txt'), '').split('\n').map(line => line.trim()).filter(line => line.length > 0);
    }
}

export default new Snipe();
