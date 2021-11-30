const Yml = require('yaml');
const { MessageEmbed } = require('discord.js');
const { getRandomKey } = require('fallout-utility');
const MakeConfig = require('../scripts/makeConfig');
const SafeMessage = require('../scripts/safeMessage');

const config = getConfig('./config/announcements.yml');

class Create {
    constructor() {
        this.versions = ['1.4.2'];
    }
    async start(Client) {
        Client.on('messageCreate', async message => {
            if(!this.checkChannel(message.channelId, config.announcementChannels) || message.author.bot || message.author.system) return;

            if(message.content.length < config.minAnnouncementMessageLenght) return this.addReply(message, getRandomKey(config.messages.messageTooSmall));
            await this.mentions(message);
        });

        return true;
    }

    checkChannel(channel, channels) {
        channels = typeof channels === 'string' ? [channels] : channels;
        if(channels && channel && channels.find(ch => ch.toString() === channel)) return true;
        return false;
    }

    async mentions(message) {
        if(!config?.ping) return;
        if(config.ping.disableEveryone && (message.mentions.everyone || message.mentions.here)) return this.addReply(message, getRandomKey(config.messages.pingedEveryone.message), config.messages.pingedEveryone.subAnnouncement);

        // check if the message mentions a role and get the role
        if(message.mentions.roles && config.ping.requireRolePing.enabled && config.ping.requireRolePing.roles?.length) {
            const role = message.mentions.roles.first();
            if(!role) return this.addReply(message, getRandomKey(config.messages.noPingedRole));
            
            if(!config.ping.requireRolePing.roles.find(r => r.toString() === role.id)) {
                await this.addReply(message, getRandomKey(config.messages.noPingedRole));
            }
        }
    }

    async addReply(message, reply, onDeletedMessage) {
        const response = await SafeMessage.reply(message, { content: ' ', embeds: [new MessageEmbed().setDescription(reply).setColor(config.action.embedErrorColor)] });

        if(response && config.action.deleteMessageAfterMilliseconds)
            setTimeout(async () => {
                await SafeMessage.delete(response);
                if(config.action.deleteOriginalMessage) await SafeMessage.delete(message);

                if(onDeletedMessage) await SafeMessage.send(message.channel, { content: ' ', embeds: [new MessageEmbed().setDescription(onDeletedMessage).setColor(config.action.embedErrorColor)] });
            }, config.action.deleteMessageAfterMilliseconds);
        
        return response;
    }
}

module.exports = new Create();

function getConfig(location) {
    const defaultConfig = {
        announcementChannels: '',
        minAnnouncementMessageLenght: 20,
        ping: {
            requireRolePing: {
                enabled: true,
                roles: []
            },
            disableEveryone: true
        },
        action: {
            deleteOriginalMessage: true,
            deleteMessageAfterMilliseconds: 10000,
            embedErrorColor: 'DANGER'
        },
        messages: {
            messageTooSmall: 'Announcement message is too short.',
            noPingedRole: 'You have to ping a valid role for this announcement message.',
            pingedEveryone: {
                message: 'You\'re not allowed to ping everyone.',
                subAnnouncement: 'The announcement that pinged everyone was deleted. Sorry for pinging everyone.'
            }
        }
    };

    return Yml.parse(MakeConfig(location, defaultConfig));
}