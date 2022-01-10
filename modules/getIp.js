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
        this.prefixes = ['!ip', '?ip', '>ip', '$ip'];
        this.server = 'play.ourmcworld.ml';
        this.port = 25565;
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
                    await SafeInteract.editReply(interaction, { content: ' ', embeds: [await this.ping()], ephemeral: true });
                })
        ];

        return true;
    }

    async onLoad(Client) {
        Client.on('messageCreate', async (message) => {
            if((message.content && !this.prefixes.some(prefix => prefix.toLowerCase().startsWith(message.content.split(' ').shift().trim().toLowerCase()))) || message.author.bot || message.author.system) return;

            const reply = await SafeMessage.reply(message, getRandomKey(Client.AxisUtility.get().language.thinking));
            await SafeMessage.edit(reply, { content: ' ', embeds: [await this.ping()] });
        });
    }

    async ping() {
        const embed = new MessageEmbed();
        const pong = await ping({
            host: this.server,
            port: this.port,
            closeTimeout: 3000
        }).catch(err => { log.error(err); return false; });

        embed.setAuthor({ name: 'Server Information' });
        embed.setColor();
        embed.setDescription('**IP:**\n```\n'+ this.server + (this.port && this.port !== 25565 ? ':'+ this.port : '') + '\n```');

        if(pong) {
            if(pong?.description === '§4Server not found.' || pong?.version?.name === "§4● Offline" || pong?.players?.max == 0) {
                embed.addField('Status', '<:crashed:853258980066852896> Offline', false);
            } else {
                embed.addField('Status', '<:online:853258979907469322> Online', true);
                embed.addField('Players', pong?.players?.online + '/' + pong?.players?.max, true);
                embed.addField('Version', (pong?.version?.name ? pong.version.name : 'Unknown'), true);
                // TODO: embed.addField('Latency', (pong?.latency ? pong.latency + 'ms' : 'Unknown'), true);
            }
        } else {
            embed.addField('Status', '<:crashed:853258980066852896> Can\'t connect to server.', false);
        }

        embed.setTimestamp();
        embed.setFooter({ text: 'Last Updated' });

        return embed;
    }
}

module.exports = new CustomCommands();