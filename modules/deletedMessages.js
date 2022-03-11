const { SafeMessage, SafeInteract } = require('../scripts/safeActions');
const { MessageEmbed } = require('discord.js');
const ms = require('ms');

class DeletedMessages {
    constructor() {
        this.versions = ['1.6.0', '1.6.1'];
    }

    /**
     * @param {import "discord.js".Client} Client
     */
    onStart(Client) {
        Client.on('messageDelete', async message => {
            if (message.author.bot || message.author.system) return;
            if (message.channel.type === 'dm') return;

            const createdAt = message.createdTimestamp;
            const currentTime = new Date().getTime();

            if (message.member.permissions.has('MANAGE_MESSAGES')) return;
            if ((message.mentions.users.size > 0 || message.mentions.roles.size > 0) && (currentTime - createdAt) <= ms('1d')) await this.punishGhostPing(message);
            // if ((currentTime - createdAt) <= ms('10s')) await this.punishQuickDelete(message);
        });
        return true;
    }

    async punishQuickDelete(message) {
        const embed = new MessageEmbed()
            .setTitle('Quickly Deleted Message')
            .setDescription(`<@!${message.author.id}> deleted a message in ${message.channel} too quickly`)
            .setColor('BLUE')
            .setFooter({ text: 'Timed out for 1 minute' })
            .setTimestamp();

        const timeout = message.member.isCommunicationDisabled() || await message.member.disableCommunicationUntil(Date.now() + (1 * 60 * 1000), 'Quickly Deleted Message').catch(err => null);
        return !timeout || SafeMessage.send(message.channel, {
            content: ' ',
            embeds: [embed]
        });
    }

    async punishGhostPing(message) {
        const embed = new MessageEmbed()
            .setTitle('Ghost Ping')
            .setDescription(`<@!${message.author.id}> ghost pinged ${message.mentions.users.map(user => '<@!'+ user.id +'>').join(' ')}${message.mentions.roles.size ? ' ' : ''}${message.mentions.roles.size > 0 ? message.mentions.roles.map(role => '<@&' + role.id + '>').join(' ') : ''}`)
            .setColor('BLUE')
            .setFooter({ text: 'Timed out for 1 minute' })
            .setTimestamp();

        const timeout = message.member.isCommunicationDisabled() || await message.member.disableCommunicationUntil(Date.now() + (1 * 60 * 1000), 'Ghost Ping').catch(err => null);
        return !timeout || SafeMessage.send(message.channel, {
            content: ' ',
            embeds: [embed]
        });
    }
}

module.exports = new DeletedMessages();