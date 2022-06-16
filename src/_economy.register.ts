import { InteractionCommandBuilder, MessageCommandBuilder, RecipleScript, version } from 'reciple';
import { Message, MessageEmbed, MessageActionRow, MessageButton } from 'discord.js';
import { Economy } from './economy/economy';
import { errorEmbed } from './_errorEmbed';
import path from 'path';
import fs from 'fs';

export class EconomyPlugin implements RecipleScript {
    public versions: string[] = ['1.3.x', '1.4.x'];
    public commands: (MessageCommandBuilder | InteractionCommandBuilder)[] = [];
    public economy: Economy = require('./economy.a.main');
    public terms: string = EconomyPlugin.terms();

    public onStart() {
        this.commands = [
            new InteractionCommandBuilder()
                .setName('register')
                .setDescription('Register an account')
                .addStringOption(playername => playername
                    .setName('playername')
                    .setDescription('Your Minecraft username (case sensitive)')
                    .setRequired(true)    
                )
                .setExecute(async command => {
                    const interaction = command.interaction;

                    const playername = interaction.options.getString('playername', true);
                    const user_id = interaction.user.id;
                    const auth_code = Economy.generateCode();

                    await interaction.deferReply();

                    const user = await this.economy.getUser(user_id).catch(() => null);
                    if (user) return interaction.editReply({ embeds: [errorEmbed(`You're already registered as **${user.playername}**`, false, false)] });
                    if (!EconomyPlugin.validateMinecraftUsername(playername)) return interaction.editReply({ embeds: [errorEmbed(`Invalid Minecraft username: **${playername}**`, false, false)] });
                    if (this.economy.isBanned(user_id)) return interaction.editReply({ embeds: [errorEmbed('You are banned from using this bot\'s currency')] });
                    if (!await this.economy.isServerOnline()) return interaction.editReply({ embeds: [errorEmbed('The server is offline')] });

                    const consoleMessageJSON = [
                        { text: '[', color: 'aqua', },
                        { text: this.economy.client?.user?.tag ?? 'Economy', color: 'blue', },
                        { text: ']', color: 'aqua', },
                        " ",
                        {
                            text: `${interaction.user.tag} requested to register as ${playername} with code `,
                            color: 'white',
                        },
                        { text: auth_code, color: 'gold' }
                    ];

                    await interaction.editReply({
                        embeds: [
                            new MessageEmbed()
                                .setAuthor({ name: 'Terms of Use' })
                                .setColor('GREEN')
                                .setDescription(this.terms)
                                .addField('NOTE', 'You must be online in-game to register')
                        ],
                        components: [
                            new MessageActionRow().setComponents([
                                new MessageButton()
                                    .setLabel('Accept Terms')
                                    .setStyle('PRIMARY')
                                    .setCustomId('accept')
                            ])
                        ]
                    });

                    const reply = await interaction.fetchReply() as Message;
                    if (!reply) return interaction.editReply({ embeds: [errorEmbed('An error has occurred!')]});

                    const collector = reply.createMessageComponentCollector({
                        filter: (component) => component.customId === 'accept' && component.user.id === interaction.user.id,
                        time: 30000,
                    });

                    collector.on('collect', async (component) => {
                        if (component.deferred) await component.deferUpdate().catch(() => {});
                        if (component.user.id !== interaction.user.id) return;

                        this.economy.logger.debug(`Registered ${user_id}: waiting for activation using code ${auth_code}`);

                        await reply.edit({ components: [], embeds: [errorEmbed(`You have accepted the terms! Check your game chats to get your code then use \`/auth <code>\` to activate your account\n\nYou can resend auth code by redoing the \`/register\` command`, true, false)] });
                        await this.economy.sendToConsoleChannels(`tellraw ${playername} ${JSON.stringify(consoleMessageJSON)}`);

                        this.economy.database.prepare(`DELETE FROM auth WHERE user_id = ? OR playername = ?`).run(user_id, playername);
                        this.economy.database.prepare(`INSERT INTO auth (user_id, playername, balance, auth_code) VALUES (?, ?, ?, ?)`).run(user_id, playername, 100, auth_code);
                        const userRow = await this.economy.database.prepare(`SELECT * FROM auth WHERE user_id = ? AND playername = ?`).get(user_id, playername);
                        if (!userRow) await reply.edit({ embeds: [errorEmbed('An error has occurred!')]});
                    });

                    collector.on('end', async () => {
                        await reply.edit({ components: [] });
                    });
                }),
            new InteractionCommandBuilder()
                .setName('auth')
                .setDescription('Activate your account')
                .addStringOption(code => code
                    .setName('code')
                    .setDescription('Your 6 chars auth code')
                    .setRequired(true)
                )
                .setExecute(async command => {
                    const interaction = command.interaction;

                    const code = interaction.options.getString('code', true);
                    const user_id = interaction.user.id;

                    await interaction.deferReply();
                    const user = await this.economy.getUser(user_id).catch(() => null);
                    if (user) return interaction.editReply({ embeds: [errorEmbed(`You're already registered as **${user.playername}**`, false, false)] });

                    const authRow = await this.economy.database.prepare(`SELECT * FROM auth WHERE user_id = ? AND auth_code = ?`).get(user_id, code);
                    if (!authRow) return interaction.editReply({ embeds: [errorEmbed('Invalid auth code or not yet registered')] });
                
                    this.economy.database.prepare(`DELETE FROM auth WHERE user_id = ? OR playername = ?`).run(user_id, authRow.playername);
                    this.economy.database.prepare(`INSERT INTO users (user_id, playername, balance) VALUES (?, ?, ?)`).run(user_id, authRow.playername, 100);

                    this.economy.logger.debug(`Activated ${user_id}: ${authRow.playername}`);

                    await interaction.editReply({ embeds: [errorEmbed(`You have successfully registered as **${authRow.playername}**`, true, false)] });
                })
        ];

        return !!this.economy.client;
    }

    public static validateMinecraftUsername(playername: string) {
        return /^[a-zA-Z0-9_]{1,16}$/.test(playername);
    }

    public static terms(): string {
        const termsPath = path.join(process.cwd(), 'config/economy/terms.txt');
        if (!fs.existsSync(termsPath)) {
            fs.mkdirSync(path.join(process.cwd(), 'config/economy'), { recursive: true });
            fs.writeFileSync(termsPath, EconomyPlugin.defaultTerms());

            return EconomyPlugin.defaultTerms();
        }

        return fs.readFileSync(termsPath, 'utf8');
    }

    public static defaultTerms(): string {
        return `
By creating an account, you agree to the following terms:
**1.** You may not use the currency for any illegal purposes.
**2.** You cannot exchange the currency for real money, other currency, or items not related to this server.
**3.** You are not allowed to disclose any exploits or bugs if you find them.
**4.** Not respecting these terms will result in a permanent ban from using the bot's currency.`.trim();
    }
}

export default new EconomyPlugin();
