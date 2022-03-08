const { InteractionCommandBuilder } = require('../scripts/builders');
const { SafeMessage, SafeInteract } = require('../scripts/safeActions');
const { MessageEmbed } = require('discord.js');
const mineflayer = require('mineflayer');
const ms = require('ms');


class TestPlayer {
    constructor() {
        this.versions = ['1.6.0', '1.6.1'];
        this.Logger = class Logger {
            constructor(logLimit) {
                this.logLimit = logLimit || 10;
                this.logs = [];
            }
            
            log(message) {
                for (let string of message.split('\n')) {
                    this.logs.push(string);
                }

                return this.limit();
            }

            limit() {
                this.logs = this.logs.reverse().slice(0, this.logLimit).reverse();
                return this;
            }

            getLogs() {
                return {
                    content: ' ',
                    embeds: [
                        new MessageEmbed().setDescription('```' + this.logs.join('\n') + '```').setColor('BLUE').setTimestamp().setTitle(`Test Bot Logs`)
                    ]
                };
            }
        };
    }

    onStart(Client) {
        this.commands = [
            new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('test-minecraft-bot')
                    .setDescription('Test Minecraft Bot.')
                    .addStringOption(PlayerName => PlayerName
                        .setName('player-username')
                        .setDescription('The username of test player')
                        .setRequired(true)
                    )
                    .addStringOption(Server => Server
                        .setName('server')
                        .setDescription('The server of test player eg: (localhost:25565)')
                        .setRequired(true)
                    )
                    .addStringOption(PlayerLeaveTimer => PlayerLeaveTimer
                        .setName('player-leave-timer')
                        .setDescription('The time to leave the player eg: (1m)')
                        .setRequired(false)
                    )
                    .addStringOption(Version => Version
                        .setName('version')
                        .setDescription('The version of test player eg: (1.9.4)')
                        .setRequired(false)    
                    )
                    .addStringOption(PlayerJoinMessage => PlayerJoinMessage
                        .setName('player-join-messages')
                        .setDescription('The messages to send when the player joined [Messages separated by: ",,"] eg: (Hello,, Hi)')
                        .setRequired(false)
                    )
                    .addStringOption(PlayerLeaveMessage => PlayerLeaveMessage
                        .setName('player-leave-messages')
                        .setDescription('The messages of player when leaving [Messages separated by: ",,"] eg: (Goodbye!,, Bye)')
                        .setRequired(false)
                    )
                )
                .setExecute(async interaction => {
                    const playername = this.getMinecraftUsername(interaction.options.getString('player-username'));
                    const server = this.getServer(interaction.options.getString('server'));
                    const playerLeaveTimer = ms(interaction.options.getString('player-leave-timer')) || 60000;
                    const version = interaction.options.getString('version') || null;
                    const playerJoinMessages = this.getMessages(interaction.options.getString('player-join-messages'));
                    const playerLeaveMessages = this.getMessages(interaction.options.getString('player-leave-messages'));

                    if (!playername) return SafeInteract.reply(interaction, 'Invalid username.');
                    if (!server) return SafeInteract.reply(interaction, 'Invalid server.');
                    if (playerLeaveTimer > ms('1m')) return SafeInteract.reply(interaction, 'Player leave timer must be less than 1 minute.');
                    if (playerLeaveTimer < ms('1s')) return SafeInteract.reply(interaction, 'Player leave timer must be greater than 1 second.');

                    let log = new this.Logger(10);
                    const bot = mineflayer.createBot({
                        host: server.host,
                        port: server.port,
                        username: playername,
                        version: version
                    });

                    await SafeInteract.deferReply(interaction);
                    await SafeInteract.editReply(interaction, log.log('Connecting to server...').getLogs());

                    bot.on('login', async () => SafeInteract.editReply(interaction, log.log('Logged in.').getLogs()));
                    bot.on('kicked', async reason => SafeInteract.editReply(interaction, log.log('Kicked from server.\n'+ reason).getLogs()));
                    bot.on('error', async error => SafeInteract.editReply(interaction, log.log('Error.'+ error).getLogs()));
                    bot.on('end', async () => SafeInteract.editReply(interaction, log.log('Disconnected from server.').getLogs()));
                    bot.on('chat', async (username, message) => SafeInteract.editReply(interaction, log.log(`[${username}] ${message}`).getLogs()));
                    bot.on('spawn', async () => {
                        await SafeInteract.editReply(interaction, log.log('Spawned.').getLogs());
                        if (playerJoinMessages.length > 0) {
                            for (let message of playerJoinMessages) {
                                bot.chat(message);
                                await this.sleep(1000);
                            }
                        }

                        setTimeout(async () => {
                            await SafeInteract.editReply(interaction, log.log('Leaving...').getLogs());
    
                            if (playerLeaveMessages.length > 0) {
                                for (let message of playerLeaveMessages) {
                                    bot?.chat(message);
                                    await this.sleep(1000);
                                }
                            }
    
                            bot?.end();
                        });
                    });
                })
        ];
        return true;
    }

    sleep(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    getMinecraftUsername(username) {
        const regex = /^[a-zA-Z0-9_]{1,16}$/;
        return regex.test(username) ? username : null;
    }

    getServer(server) {
        let [host, port] = server.split(':');

        if (!host) return null;
        if (!port) port = 25565;
        if (port < 0 || port > 65535) return null;

        return { host, port };
    }

    getMessages(message) {
        if (!message) return [];
        return message.split(',, ').map(m => m.trim()).filter(m => m.length > 0 && m.length <= 200);
    }
}

module.exports = new TestPlayer();