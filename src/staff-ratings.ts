import { InteractionCommandBuilder, MessageCommandBuilder, RecipleClient, RecipleScript } from 'reciple';
import { createConfig } from './_createConfig';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import yml from 'yaml';
import { Logger } from 'fallout-utility';
import { Guild, GuildMember, Message, MessageActionRow, MessageEmbed, Modal, TextChannel, TextInputComponent, User } from 'discord.js';
import { Ratings } from './staff_ratings/Ratings';
import { Rating, RawRating } from './staff_ratings/Rating';
import { errorEmbed } from './_errorEmbed';

export interface StaffRatingsConfig {
    guildId: string;
    channelId: string;
    messageId: string;
    staffRoles: string[];
}

export class StaffRatings implements RecipleScript {
    public versions: string[] = ['1.6.x'];
    public client!: RecipleClient;
    public logger!: Logger;
    public guild?: Guild;
    public channel?: TextChannel;
    public message?: Message;
    public config: StaffRatingsConfig = StaffRatings.getConfig();
    public database: DatabaseType = new Database(path.join(process.cwd(), 'config/staffratings/database.db'));
    public commands: (MessageCommandBuilder|InteractionCommandBuilder)[] = [];

    public onStart(client: RecipleClient) {
        this.client = client;
        this.logger = client.logger.cloneLogger();
        this.logger.defaultPrefix = 'StaffRatings';

        this.createTables();
        this.logger.info('Started staff ratings.');

        this.commands = [
            new InteractionCommandBuilder()
                .setName('rate-staff')
                .setDescription('Rate a staff member.')
                .addUserOption(staff => staff
                    .setName('staff')
                    .setDescription('The staff member to rate.')
                    .setRequired(true)    
                )
                .addNumberOption(rating => rating
                    .setName('rating')
                    .setDescription('The rating to give.')
                    .setMinValue(0)
                    .setMaxValue(5)
                    .addChoices(
                        {
                            name: 'remove vote',
                            value: 0,
                        },
                        {
                            name: '1',
                            value: 1,
                        },
                        {
                            name: '2',
                            value: 2,
                        },
                        {
                            name: '3',
                            value: 3,
                        },
                        {
                            name: '4',
                            value: 4,
                        },
                        {
                            name: '5',
                            value: 5,
                        }
                    )
                    .setRequired(true)    
                )
                .setExecute(async command => {
                    const interaction = command.interaction;
                    const staff = interaction.options.getUser('staff', true);
                    const rating = interaction.options.getNumber('rating', true);

                    if (!rating) {
                        await interaction.deferReply({ ephemeral: true });
                        this.removeRating(interaction.user.id, staff.id);
                        return interaction.editReply({ embeds: [errorEmbed(`Removed your vote for ${staff.tag}.`, true)] });
                    }
                    if (!staff) return;

                    const modal = new Modal()
                        .setTitle('Rate Staff Member')
                        .setCustomId('staff-rating')
                        .setComponents(
                            new MessageActionRow<TextInputComponent>()
                                .setComponents([
                                    new TextInputComponent()
                                        .setCustomId('staff-rating-comment')
                                        .setLabel('Comment')
                                        .setMaxLength(4000)
                                        .setPlaceholder('Describe why you gave this rating (Optional)')
                                        .setStyle('PARAGRAPH')
                                        .setRequired(false),
                                ])
                        );

                    await interaction.showModal(modal);
                    const result = await interaction.awaitModalSubmit({ time: 1000 * 60 * 3 });
                    if (!result) return;

                    await result.deferReply({ ephemeral: true });

                    const member = this.guild?.members.cache.get(staff.id) ?? await this.guild?.members.fetch(staff.id).catch(() => undefined);
                    const comment = result.fields.getTextInputValue('staff-rating-comment') || '';
                    if (!member) return result.editReply({ embeds: [errorEmbed('Failed to rate staff member.')] });
                    
                    await this.addRating(interaction.user, member, comment, rating)
                        .then(() => result.editReply({ embeds: [errorEmbed('Rating added', true)] }))
                        .catch(err => result.editReply({ embeds: [errorEmbed((err as Error)?.message || 'Failed to add rating')] }));
                })
        ];
        return true;
    }

    public async onLoad() {
        const guild = this.client.guilds.cache.get(this.config.guildId) ?? await this.client.guilds.fetch(this.config.guildId).catch(() => undefined);
        const channel = guild ? guild?.channels.cache.get(this.config.channelId) ?? await guild?.channels.fetch(this.config.channelId).catch(() => undefined) : undefined;

        if (!guild || !channel || channel.type !== 'GUILD_TEXT') throw new Error('Failed to load guild or channel.');

        this.guild = guild;
        this.channel = channel;

        const message = this.channel.messages.cache.get(this.config.messageId) ?? await this.channel.messages.fetch(this.config.messageId).catch(() => undefined);
        if (!message) throw new Error('Failed to load message.');

        this.message = message;

        await this.updateMessage().catch(err => {
            this.logger.error('Failed to update message.');
            this.logger.error(err);
        });
        this.logger.info('Loaded staff ratings.');
    }

    public async addRating(user: User, staff: GuildMember, comment: string, rating: number): Promise<void> {
        if (!staff.roles.cache.some(c => this.config.staffRoles.includes(c.id))) throw new Error('User is not a staff member.');
        if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5.');

        this.database.prepare(`DELETE FROM ratings WHERE user_id = ? AND staff_id = ?`).run(user.id, staff.id);
        this.database.prepare(`INSERT INTO ratings (user_id, staff_id, rating, timestamp, comment) VALUES (?, ?, ?, ?, ?)`).run(user.id, staff.id, rating, Date.now(), comment);
        await this.updateMessage().catch(err => {
            this.logger.error('Failed to update message.');
            this.logger.error(err);
        });
    }

    public async removeRating(user: string, staff: string): Promise<void> {
        this.database.prepare(`DELETE FROM ratings WHERE user_id = ? AND staff_id = ?`).run(user, staff);
        await this.updateMessage().catch(err => {
            this.logger.error('Failed to update message.');
            this.logger.error(err);
        });
    }

    public createTables(): void {
        this.logger.debug('Creating tables...');

        this.database.prepare(`CREATE TABLE IF NOT EXISTS ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                staff_id TEXT NOT NULL,
                rating INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                comment TEXT NOT NULL
            )`).run();
        
        this.logger.debug('Tables created.');
    }

    public static getConfig(): StaffRatingsConfig {
        const configPath = path.join(process.cwd(), 'config/staffratings/config.yml');
        const defaultConfig: StaffRatingsConfig = {
            guildId: '000000000000000000',
            channelId: '000000000000000000',
            messageId: '000000000000000000',
            staffRoles: ['000000000000000000', '000000000000000000'],
        };

        return yml.parse(createConfig(configPath, defaultConfig));
    }

    public async getRatings(): Promise<Ratings[]> {
        const rawRatings = this.database.prepare(`SELECT * FROM ratings`).all() as RawRating[];
        const ratings: Rating[] = [];
        const allRatings: Ratings[] = [];
        const staffs: string[] = [];

        for (const rawRating of rawRatings) {
            if (!staffs.includes(rawRating.staff_id)) staffs.push(rawRating.staff_id);
            
            const rating = new Rating(rawRating, this);
            await rating.fetch().then(() => ratings.push(rating)).catch(() => this.logger.error(`Failed to fetch rating ${rating.id}`));
        }

        for (const staffId of staffs) {
            const rawStaffRatings = ratings.filter(c => c.staff_id === staffId);
            const staffRatings = new Ratings({
                avarage: rawStaffRatings.reduce((a, b) => a + b.rating, 0) / rawStaffRatings.length,
                raw_ratings: rawStaffRatings,
                staff_id: staffId,
            }, this); 

            await staffRatings.fetch().then(() => allRatings.push(staffRatings)).catch(() => this.logger.error(`Failed to fetch ratings for staff ${staffId}`));
        }

        return allRatings.sort((a, b) => b.avarage == a.avarage ? b.raw_ratings.length - a.raw_ratings.length : b.avarage - a.avarage);
    }

    public async getData(): Promise<MessageEmbed> {
        const embed = new MessageEmbed();
        const ratings = (await this.getRatings()).slice(0, 20);
        const sortByVotes = [...ratings].sort((a, b) => b.raw_ratings.length - a.raw_ratings.length);
        const sortByAvarage = [...ratings].sort((a, b) => b.avarage - a.avarage);

        embed.setTitle(`Top ${ratings.length ? ratings.length + ' ' : ''}${ratings.length <= 1 ? 'staff' : 'staffs'}`);
        embed.setColor('GREEN');

        let description = '';

        for (const rating of ratings) {
            const staff = rating.staff;
            if (!staff || !staff.user) continue;

            // get the highest role
            const highestRole = staff.roles.cache.sort((a, b) => b.position - a.position).find(c => this.config.staffRoles.includes(c.id));
            const total = rating.ratings?.length ?? 0;

            if (!highestRole) {
                this.logger.error(`Failed to find highest role for staff ${staff.user.tag}`);
                rating.delete().catch(() => {});
                continue;
            }

            description += `<@${staff.user?.id}> <@&${highestRole?.id}> \`⭐ ${rating.avarage}\` *${StaffRatings.formatNumber(total)} ${total > 1 ? 'votes' : 'vote'}*\n`;
        }

        embed.setDescription((description || 'No ratings yet.\n') + `\n\`/rate-staff\` to rate each staffs.`);
        embed.setFooter({ text: `Sorted by avarage` });
        embed.setTimestamp(Date.now());

        if (sortByAvarage[0]) {
            embed.addField('Best avarage', `<@${sortByAvarage[0].staff.user.id}> \`⭐ ${sortByAvarage[0].avarage}\` *${sortByAvarage[0].raw_ratings.length} ${sortByAvarage[0].raw_ratings.length > 1 ? 'votes' : 'vote'}*`, true);
        }
        if (sortByVotes[0]?.staff) embed.addField('Most votes', `<@${sortByVotes[0]?.staff.id}> \`⭐ ${sortByVotes[0]?.avarage}\`  *${sortByVotes[0]?.raw_ratings.length} ${sortByVotes[0]?.raw_ratings.length > 1 ? 'votes' : 'vote'}*`, true);

        embed.addField('Total avarage', `\`⭐ ${Math.round(ratings.reduce((a, b) => a + b.avarage, 0) / ratings.length * 100) / 100}\``, true);
        embed.addField('Total votes', `${StaffRatings.formatNumber(ratings.reduce((a, b) => a + b.raw_ratings.length, 0))}`, true);
        return embed;
    }

    public async updateMessage(): Promise<void> {
        if (!this.message) throw new Error('Message is not set.');

        const embed = await this.getData();
        this.message.edit({ content: ' ', embeds: [embed], components: [] });
    }

    // format number to 1k 1m 1b
    public static formatNumber(num: number): string {
        if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'b';
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return num.toString();
    }
}

export default new StaffRatings();
