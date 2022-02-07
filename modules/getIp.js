const { InteractionCommandBuilder, MessageCommandBuilder} = require('../scripts/builders');
const { SafeMessage, SafeInteract } = require('../scripts/safeActions');
const { MessageEmbed } = require('discord.js');
const { ping } = require('minecraft-protocol');
const { getRandomKey } = require('fallout-utility');

class CustomCommands {
    constructor() {
        this.versions = ['1.6.0','1.6.1'];
        this.logger = null;
        this.embedColor = '#0099ff';
        this.prefixes = ['!ip', '?ip', '>ip', '$ip', '.ip'];
        this.loadingStatus = ['§7◌ Saving...', '§7◌ Preparing...', '§7◌ Loading...', '§7◌ Starting...', '§7◌ Saving...', '§7◌ Stopping...']
        this.servers = [
            {
                ip: 'play.ourmcworld.ml',
                port: 25565
            },
            {
                ip: 'OurWorldS3.aternos.me',
                port: 63471
            },
            {
                ip: 'OurWorldTestServer.aternos.me',
                port: 34360
            }
        ]
    }

    async onStart(Client) {
        this.logger = Client.AxisUtility.get().logger;
        this.embedColor = Client.AxisUtility.get().config.embedColor;

        this.commands = [
            new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('ip')
                    .setDescription('Get the server IP')    
                )
                .setExecute(async (interaction) => {
                    await SafeInteract.deferReply(interaction, { ephemeral: true });
                    await SafeInteract.editReply(interaction, { content: ' ', embeds: await this.preload(), ephemeral: true});
                    await SafeInteract.editReply(interaction, { content: ' ', embeds: await this.ping(), ephemeral: true });
                })
        ];

        return true;
    }

    async onLoad(Client) {
        Client.on('messageCreate', async (message) => {
            if(!message.content || !this.prefixes.includes(message.content.split(' ').shift().trim().toLowerCase()) || message.author.bot || message.author.system) return;

            const reply = await SafeMessage.reply(message, { content: ' ', embeds: this.preload() });
            await SafeMessage.edit(reply, { content: ' ', embeds: await this.ping() });
        });
    }

    preload() {
        let embeds = [];

        for (const srv of this.servers) {
            const embed = new MessageEmbed();
            
            embed.setAuthor({ name: 'Server Information' });
            embed.setColor('BLUE');
            embed.setDescription('**IP:**\n```\n'+ srv.ip + (srv.port && srv.port !== 25565 ? ':'+ srv.port : '') + '\n```');

            embed.addField('Status', '<a:pending:853258979944693770> Connecting...', false);

            embed.setTimestamp();
            embed.setFooter({ text: 'Last Updated' });

            embeds.push(embed);
        }

        return embeds;
    }

    async ping() {
        let embeds = [];

        for (const srv of this.servers) {
            const pong = await ping({
                host: srv.ip,
                port: srv.port,
                closeTimeout: 3000
            }).catch(err => { this.logger.error(err); return false; });

            const embed = new MessageEmbed();
            embed.setAuthor({ name: 'Server Information' });
            embed.setColor('BLUE');
            embed.setDescription('**IP:**\n```\n'+ srv.ip + (srv.port && srv.port !== 25565 ? ':'+ srv.port : '') + '\n```');

            if(pong) {
                if(pong?.description === '§4Server not found.' || pong?.version?.name === "§4● Offline" || pong?.players.max === 0 && !this.loadingStatus.some(s => pong.version.name === s)) {
                    embed.addField('Status', '<:crashed:853258980066852896> Offline', false);
                } else {
                    if (pong?.players.max === 0 && this.loadingStatus.some(s => pong.version.name === s)) {
                        embed.addField('Status', '<a:pending:853258979944693770> '+this.clean(this.removeColorId(pong.version.name))?.trim(), false);
                    } else {

                        embed.addField('Status', '<:online:853258979907469322> Online', true);
                        embed.addField('Players', pong?.players?.online + '/' + pong?.players?.max, true);
                        embed.addField('Version', (pong?.version?.name ? pong.version.name : 'Unknown'), true);
                        // TODO: embed.addField('Latency', (pong?.latency ? pong.latency + 'ms' : 'Unknown'), true);
                    }
                }
            } else {
                embed.addField('Status', '<:crashed:853258980066852896> Can\'t connect to server.', false);
            }

            embed.setTimestamp();
            embed.setFooter({ text: 'Last Updated' });

            embeds.push(embed);
        }

        return embeds;
    }

    clean(text) {
        return text.replace(/[^\w\s]/gi, '');
    }

    removeColorId(text) {
        return text.replace(/§./g, "");
    }
}

module.exports = new CustomCommands();