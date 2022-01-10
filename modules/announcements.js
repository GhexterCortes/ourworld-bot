const Yml = require('yaml');
const MakeConfig = require('../scripts/makeConfig');
const { MessageEmbed } = require('discord.js');
const { getRandomKey } = require('fallout-utility');
const { SafeMessage } = require('../scripts/safeActions');

let config;

class Create {
    constructor() {
        this.versions = ['1.6.0','1.6.1'];
    }
    async onStart(Client) {
        config = this.getConfig('./config/announcements/config.yml');

        Client.on('messageCreate', async message => {
            if(!this.checkChannel(message.channelId, config.announcementChannels) || message.author.bot || message.author.system) return;

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
        if(!config?.ping) return true;
        if(config.ping.disableEveryone && (message.mentions.everyone || message.mentions.here)) { await this.addReply(message, getRandomKey(config.messages.pingedEveryone.message), config.messages.pingedEveryone.subAnnouncement); return false; }

        // check if the message mentions a role and get the role
        if(message.mentions.roles && config.ping.requireRolePing.enabled && config.ping.requireRolePing.roles?.length) {
            const role = message.mentions.roles.first();
            if(!role) { await this.addReply(message, getRandomKey(config.messages.noPingedRole)); return false; }
            
            if(!config.ping.requireRolePing.roles.find(r => findRole(r.toString()))) { await this.addReply(message, getRandomKey(config.messages.noPingedRole)); return false; }

            if(message.content.length < config.minAnnouncementMessageLenght) { await this.addReply(message, getRandomKey(config.messages.messageTooSmall)); return false; }

            await this.makeThread(message);
            return true;

            function findRole(_role) {
                return message.mentions.roles.find(r => r.id === _role);
            }
        }

        return false;
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

    getConfig(location) {
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
            threads: {
                enabled: false,
                threadName: 'About this announcement'
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

    async makeThread(message) {
        if(!config.threads.enabled) return;

        const threadName = getRandomKey(config.threads.threadName);

        await message.startThread({
            name: threadName,
            autoArchiveDuration: config.threads.autoArchiveMin,
        }).catch(err => console.error(err));
    }
}

module.exports = new Create();