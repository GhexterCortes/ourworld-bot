const { InteractionCommandBuilder, MessageCommandBuilder} = require('../scripts/builders');
const { SafeMessage, SafeInteract } = require('../scripts/safeActions');
const { MessageEmbed, MessageButton, MessageActionRow } = require('discord.js');
const { ping } = require('minecraft-protocol');
const { getRandomKey } = require('fallout-utility');

class CustomCommands {
    constructor() {
        this.versions = ['1.6.0','1.6.1'];
        this.logger = null;
        this.embedColor = '#0099ff';
        this.prefixes = ['!ip', '?ip', '>ip', '$ip', '.ip', '-ip'];
        this.loadingStatus = ['§7◌ Saving...', '§7◌ Preparing...', '§7◌ Loading...', '§7◌ Starting...', '§7◌ Saving...', '§7◌ Stopping...']
        this.servers = [
            {
                ip: 'play.ourmcworld.gq',
                description: 'Server\'s IP',
                port: 25565
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
                    await SafeInteract.editReply(interaction, { content: ' ', ...this.preload(true), ephemeral: true});
                    await SafeInteract.editReply(interaction, { content: ' ', ...await this.ping(true), ephemeral: true });

                    return this.addCollector(interaction, interaction.user.id || interaction.member.user.id, null, Client);
                })
        ];

        return true;
    }

    async onLoad(Client) {
        Client.on('messageCreate', async (message) => {
            if(!message.content || !this.prefixes.includes(message.content.split(' ').shift().trim().toLowerCase()) || message.author.bot || message.author.system) return;

            const reply = await SafeMessage.reply(message, { content: ' ', ...this.preload() });
            await SafeMessage.edit(reply, { content: ' ', ...await this.ping() });

            return this.addCollector(reply, message.author.id, message, Client);
        });
    }

    preload(removeCancel = false) {
        let embeds = [];

        for (const srv of this.servers) {
            const embed = new MessageEmbed();
            
            embed.setAuthor({ name: 'Server Information' });
            embed.setColor('BLUE');
            embed.setDescription('**IP:**\n```\n'+ srv.ip + (srv.port && srv.port !== 25565 ? ':'+ srv.port : '') + '\n```' + (srv?.description ? '\n' + srv.description : ''));

            embed.addField('Status', '<a:pending:853258979944693770> Connecting...', false);

            embed.setTimestamp();
            embed.setFooter({ text: 'Last Updated' });

            embeds.push(embed);
        }

        const component = new MessageActionRow()

        if(!removeCancel) component.addComponents(new MessageButton().setLabel('Delete').setStyle('DANGER').setCustomId('cancel').setDisabled(true))
        component.addComponents(new MessageButton().setLabel('Reload').setStyle('SUCCESS').setCustomId('fetch').setDisabled(true))
        return {
            embeds: embeds, 
            components: [
                component
            ]
        };
    }

    async ping(removeCancel = false) {
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
            embed.setDescription('**IP:**\n```\n'+ srv.ip + (srv.port && srv.port !== 25565 ? ':'+ srv.port : '') + '\n```' + (srv?.description ? '\n' + srv.description : ''));

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

        const component = new MessageActionRow();

        if(!removeCancel) component.addComponents(new MessageButton().setLabel('Delete').setStyle('DANGER').setCustomId('cancel'));
        component.addComponents(new MessageButton().setLabel('Reload').setStyle('SUCCESS').setCustomId('fetch'))
        return {
            embeds: embeds,
            components: [
                component
            ] 
        };
    }

    async addCollector(message, author, originalMessage, Client) {
        if(!message) return;
        let collector = !message.applicationId ? message.createMessageComponentCollector({
            filter: (m) => m.customId == 'fetch' || m.customId == 'cancel',
            time: 20000
        }) : 'Interaction';

        if(collector === 'Interaction') {
            const reply = await message.fetchReply().catch(err => null);
            if(!reply) return;

            collector = reply.createMessageComponentCollector({
                filter: (m) => m.customId == 'fetch' || m.customId == 'cancel',
                time: 20000
            });
        }

        if(!collector) return;
        collector.on('collect', async (i) => {
            if(i.user.id !== author) return SafeInteract.reply(i, { content: 'This is not your command', ephemeral: true });

            if (!i.deffered) await i.deferUpdate();
            switch(i.customId) {
                case 'fetch':
                    if(message.applicationId) {
                        await SafeInteract.editReply(message, { content: ' ', ...this.preload(true) });
                        await SafeInteract.editReply(message, { content: ' ', ...await this.ping(true) });
                        break;
                    }

                    await SafeMessage.edit(message, { content: ' ', ...this.preload() });
                    await SafeMessage.edit(message, { content: ' ', ...await this.ping() });
                    break;
                case 'cancel':
                    if(message) await SafeMessage.delete(message);
                    if (originalMessage) await SafeMessage.delete(originalMessage);
                    break;
            }

            collector.resetTimer();
        });

        collector.on('end', async () => {
            if(!message) return;

            if(message.applicationId) return SafeInteract.editReply(message, { content: ' ', components: [new MessageActionRow().addComponents(new MessageButton().setLabel('Reload').setStyle('SUCCESS').setCustomId('fetch').setDisabled(true))] 
            });

            await SafeMessage.edit(message, { content: ' ', components: [new MessageActionRow().addComponents([
                    new MessageButton().setLabel('Delete').setStyle('DANGER').setCustomId('cancel').setDisabled(true),
                    new MessageButton().setLabel('Reload').setStyle('SUCCESS').setCustomId('fetch').setDisabled(true)
                ])] 
            });
        });
    }

    clean(text) {
        return text.replace(/[^\w\s]/gi, '');
    }

    removeColorId(text) {
        return text.replace(/§./g, "");
    }
}

module.exports = new CustomCommands();