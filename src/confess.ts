import path from 'path';
import yml from 'yaml';
import stringSimilarity from 'string-similarity-js';
import { InteractionCommandBuilder, RecipleClient, RecipleScript } from 'reciple';
import { createConfig } from './_createConfig';
import { weirdToNormalChars } from 'weird-to-normal-chars';
import Database, { Database as IDatabase } from 'better-sqlite3';
import { ButtonInteraction, CommandInteraction, MessageActionRow, MessageAttachment, MessageButton, MessageEmbed, Modal, PermissionString, TextChannel, TextInputComponent } from 'discord.js';
import { Confession } from './confession/Confession';
import { errorEmbed } from './_errorEmbed';

export interface ConfessConfig {
    confessionChannel: string;
    bannedWords: string[];
    bannedWordsSimilarityThreshold: number;
    requiredPermsForNickname: PermissionString[];
}

export interface RawConfession {
    id: number;
    user_id: string;
    channel_id: string;
    message_id: string;
    content: string;
    nickname: string;
    key: string;
    created_at: number;
}

export class Confess implements RecipleScript {
    public versions: string[] = ['1.3.x', '1.4.x'];
    public config: ConfessConfig = Confess.getConfig();
    public database: IDatabase = new Database(path.join(process.cwd(), 'config/confess/database.db'));
    public confessionChannel?: TextChannel;
    public commands?: (InteractionCommandBuilder)[] = [];
    public client!: RecipleClient;

    public onStart(client: RecipleClient) {
        this.client = client;
        this.commands = [
            (new InteractionCommandBuilder()
                .setName('confess')
                .setDescription('confession')
                .addSubcommand(create => create
                    .setName('add')
                    .setDescription('Send a confession')
                )
                .addSubcommand(del => del
                    .setName('delete')
                    .setDescription('Delete a confession')
                    .addStringOption(key => key
                        .setName('key')
                        .setDescription('The key of the confession to delete located at the bottom left')
                        .setAutocomplete(true)
                        .setRequired(true)
                    )
                ) as InteractionCommandBuilder)
                .setExecute(async command => {
                    const interaction = command.interaction;
                    const action = interaction.options.getSubcommand();

                    switch (action) {
                        case 'add': return this.sendModal(interaction);
                        case 'delete':
                            const key = interaction.options.getString('key', true);
                            const confession = await this.getConfession(key).catch(() => this.client.logger.error(`Failed to get confession with key ${key}`));

                            if (!confession) return interaction.reply({ embeds: [errorEmbed(`Confession not found`)], ephemeral: true });
                            if (confession.user_id !== interaction.user.id) return interaction.reply({ embeds: [errorEmbed(`You can only delete your own confession`)], ephemeral: true });

                            await confession.delete();
                            return interaction.reply({ embeds: [
                                (
                                    confession.deleted ?
                                    errorEmbed(`Confession deleted`) :
                                    errorEmbed(`Confession could not be deleted`)
                                )
                            ], ephemeral: true });

                    }
                })
        ];

        this.client.on('interactionCreate', async interaction => {
            if (interaction.isAutocomplete() && interaction.commandName == 'confess') {
                const query = interaction.options.getFocused();
                const confessions = await this.getConfessions(query.toString(), interaction.user.id);

                return interaction.respond(confessions.map(confession => {
                    return {
                        name: confession.key,
                        value: confession.key,
                    };
                })).catch(() => undefined);
            } else if (interaction.isButton() && interaction.customId == 'confess-button') {
                this.sendModal(interaction).catch(() => undefined);
            } else if (interaction.isModalSubmit() && interaction.customId == 'confess-modal') {
                const nickname = (interaction.memberPermissions?.has(this.config.requiredPermsForNickname)
                    ? interaction.fields.getTextInputValue('nickname')
                    : 'Anonymous') || 'Anonymous';
                const content = interaction.fields.getTextInputValue('content');
                const key = this.generateKey();

                await interaction.deferReply({ ephemeral: true }).catch(() => undefined);

                const embed = new MessageEmbed()
                    .setAuthor({ name: nickname, iconURL: this.client.user?.displayAvatarURL() })
                    .setDescription(content)
                    .setTimestamp()
                    .setColor('BLUE')
                    .setFooter({ text: `key: ${key}` });

                if (this.checkBannedWords(content) || this.checkBannedWords(nickname)) {
                    interaction.editReply({ embeds: [errorEmbed(`Your confession contain banned word(s)`)] });
                    return;
                }
                
                const message = await this.sendMessage(embed);

                if (!message) {
                    interaction.editReply({ embeds: [errorEmbed(`Could not send confession`)] });
                    return;
                }

                this.insertConfession({
                    user_id: interaction.user.id,
                    message_id: message.id,
                    channel_id: message.channel.id,
                    content,
                    nickname,
                    key,
                    created_at: message.createdAt.getTime(),
                });

                interaction.editReply({ embeds: [errorEmbed(`Confession added`, true)] });
            }
        });

        this.createTables();
        return true;
    }

    public async onLoad() {
        const channel = this.client.channels.cache.get(this.config.confessionChannel) ?? await this.client.channels.fetch(this.config.confessionChannel).catch(() => undefined);
        if (channel?.type !== 'GUILD_TEXT') {
            throw new Error(`Channel ${this.config.confessionChannel} is not a guild text channel!`);
        }

        this.confessionChannel = channel;
    }

    public async sendMessage(embed: MessageEmbed) {
        return this.confessionChannel?.send({
            embeds: [embed],
            components: [
                new MessageActionRow<MessageButton>()
                    .setComponents([
                        new MessageButton()
                            .setLabel('Add confession')
                            .setCustomId('confess-button')
                            .setStyle('SECONDARY')
                    ])
            ]
        }).catch(() => undefined);
    }

    public insertConfession(confession: Omit<RawConfession, 'id'>) {
        return this.database.prepare(`INSERT INTO confessions (
            user_id,
            message_id,
            channel_id,
            content,
            nickname,
            key,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
            confession.user_id,
            confession.message_id,
            confession.channel_id,
            confession.content,
            confession.nickname,
            confession.key,
            confession.created_at
        );
    }

    public async sendModal(interaction: CommandInteraction|ButtonInteraction) {
        const modal = new Modal()
            .setCustomId('confess-modal')
            .setTitle('Confess');

        if (interaction.memberPermissions?.has(this.config.requiredPermsForNickname)) {
            modal.addComponents(
                new MessageActionRow<TextInputComponent>()
                    .setComponents(
                        new TextInputComponent()
                            .setLabel('Nickname (Optional)')
                            .setPlaceholder('Anonymous')
                            .setCustomId('nickname')
                            .setRequired(false)
                            .setMaxLength(32)
                            .setStyle('SHORT')
                    )
            );
        }
        
        modal.addComponents(
            new MessageActionRow<TextInputComponent>()
                .setComponents(
                    new TextInputComponent()
                        .setLabel('Confession')
                        .setPlaceholder('example: I\'m pretty asf')
                        .setCustomId('content')
                        .setRequired(true)
                        .setMaxLength(2024)
                        .setStyle('PARAGRAPH')
                )
        );

        return interaction.showModal(modal);
    }

    public createTables() {
        this.database.exec(`CREATE TABLE IF NOT EXISTS confessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            message_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            content TEXT NOT NULL,
            nickname TEXT NOT NULL,
            key VARCHAR(8) NOT NULL,
            created_at INTEGER NOT NULL
        );`);
    }

    public async getConfession(query: string, customQuery?: boolean) {
        const confession: RawConfession = (() => {
            if (customQuery) {
                return this.database.prepare(query).get();
            } else {
                return this.database.prepare(`SELECT * FROM confessions WHERE key = ? OR user_id = ? OR id = ? OR message_id = ? LIMIT 1`).get(query, query, query, query);;
            }
        })();
        if (!confession) throw new Error(`Confession with query ${query} not found!`);

        const confessionObject = new Confession(confession, this);
        await confessionObject.fetch();

        return confessionObject;
    }

    public async getConfessions(query: string, user_id: string) {
        const rawConfessions: RawConfession[] = this.database.prepare(`SELECT * FROM confessions WHERE key LIKE ? AND user_id = ? ORDER BY created_at DESC LIMIT 10`).all(`%${query}%`, user_id);
        const confessions: Confession[] = rawConfessions.map(confession => new Confession(confession, this));
        await Promise.all(confessions.map(confession => confession.fetch()));

        return confessions;
    }

    public checkBannedWords(content: string) {
        const tokens = content.toLowerCase().split(' ');
        const bannedWords = this.config.bannedWords.map(word => word.toLowerCase());

        if (!bannedWords.length) return false;

        for (const word of tokens) {
            if (bannedWords.includes(word) || bannedWords.some(w => stringSimilarity(w, word) >= this.config.bannedWordsSimilarityThreshold)) return true;
        }

        return false;
    }

    public cleanString(string: string) {
        string = weirdToNormalChars(string);
        string = string.replace(/[^\w\s]/gi, '');
        return string;
    }

    public generateKey(length: number = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let key = '';

        for (let i = 0; i < length; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return key;
    }

    public static getConfig(): ConfessConfig {
        const configPath = path.join(process.cwd(), 'config/confess/config.yml');
        const defaultConfig: ConfessConfig = {
            confessionChannel: '000000000000000000',
            bannedWords: ['dick', 'tits', 'pussy', 'cock', 'whore'],
            bannedWordsSimilarityThreshold: 0.9,
            requiredPermsForNickname: ['ADMINISTRATOR']
        };

        return yml.parse(createConfig(configPath, defaultConfig));
    }
}

export default new Confess();
