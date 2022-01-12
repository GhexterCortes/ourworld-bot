const Yml = require('yaml');
const Util = require('fallout-utility');
const MakeConfig = require('../scripts/makeConfig');
const { SafeMessage } = require('../scripts/safeActions');
const { MessageEmbed } = require('discord.js');

const config = Yml.parse(MakeConfig('./config/chatBridge/config.yml', {
        playerRoles: {
            colors: {
                "admin": "green",
                "moderator": "yellow",
            }
        },
        channels: [
            {
                messagesChannelId: '',
                consoleChannelId: '',
                playerChats: {
                    receive: true,
                    send: true
                },
                discordChats: {
                    receive: true,
                    send: true
                },
                botId: ''
            }
        ]
    }));

class ChatBridge {
    constructor() {
        this.versions = ['1.6.0','1.6.1'];
    }

    onStart(Client) {
        
        if(config.channels.length <= 1) return false;

        Client.on('messageCreate', async (message) => {

            // remove mentions
            message.content = message.content.replace(/<@!?[0-9]+>/g, '').replace(/<@&?[0-9]+>/g, '');
            message.content = Util.replaceAll(message.content, '\\', '');
            message.content = Util.replaceAll(message.content, '@everyone', 'everyone');
            message.content = Util.replaceAll(message.content, '@here', 'here');


            await this.playerChat(message);
            await this.userChat(message);
        });

        return true;
    }

    async userChat(message) {
        const channel = config.channels.find(chnl => chnl.messagesChannelId == message.channelId);
        if(!channel || !channel.discordChats.send || !message.content || message.author.bot || message.author.system) return;

        const chat = message.content;
        const receivers = config.channels.filter(chnl => chnl.messagesChannelId != message.channelId && chnl.discordChats.receive);
        
        for(const receiver of receivers) {
            const receiverConsoleChannel = message.guild.channels.cache.get(receiver.consoleChannelId);
            const receiverMessagesChannel = message.guild.channels.cache.get(receiver.messagesChannelId);
            if(!receiverMessagesChannel) continue;

            await SafeMessage.send(receiverMessagesChannel, { content: ' ', embeds: [ new MessageEmbed().setAuthor({ name: message.author.username }).setDescription(message.content).setFooter({ text: 'User chat from '+ message.channel.name }) , ...message.embeds ] });
            await SafeMessage.send(receiverConsoleChannel, 'tellraw @a [{"text":"[","color":"gray"},{"text":"From Discord","color":"aqua"},{"text":"] ","color":"gray"},"'+ message.author.username +' > '+ Util.limitText(message.content, 153, '...') +'"]');
        }
    }

    async playerChat(message) {
        const channel = message.author.bot ? config.channels.find(chnl => chnl.messagesChannelId == message.channelId) : false;
        if(!channel || !channel.playerChats.send || channel.botId != message.author.id || !message.content) return;

        const chat = this.parsePlayerChat(message.content);
        if(!chat) return;

        const receivers = config.channels.filter(chnl => chnl.messagesChannelId != message.channelId && chnl.playerChats.receive);
        for(const receiver of receivers) {
            const receiverConsoleChannel = message.guild.channels.cache.get(receiver.consoleChannelId);
            const receiverMessagesChannel = message.guild.channels.cache.get(receiver.messagesChannelId);
            if(!channel) continue;

            await SafeMessage.send(receiverConsoleChannel, chat[0]);
            await SafeMessage.send(receiverMessagesChannel, { content: ' ', embeds: [ new MessageEmbed().setAuthor({ name: chat[2]['author'] }).setDescription(chat[2]['content']).setFooter({ text: 'Game chat from '+ message.channel.name }) , ...message.embeds ] });
        }
    }

    parsePlayerChat(chat) {
        chat = chat ? Util.replaceAll(chat, '\\', '').split(' > ') : [];

        if(chat.length <= 1) return false;

        const role = chat[0].split(' ').length > 1 ? chat[0].split(' ')[0] : null;
        const author = role ? chat[0].split(' ')[1] : chat[0];
        const content = chat[1];

        chat = [
            (role ? `${this.addRoleColor(role.trim())} ` : ''),
            `${author.trim()} > `,
            Util.limitText(content.trim(), 153, '...')
        ];

        return [
            `tellraw @a ${JSON.stringify(chat)}`,
            `${(role ? role.trim() +' ' : '')}${author.trim()} > ${Util.limitText(content.trim(), 153, '...')}`,
            {
                author: author.trim(),
                content: content.trim()
            }
        ];
    }

    addRoleColor(role) {
        role = this.convertToPlainText(role);

        const colors = config.playerRoles.colors;
        if(!colors[role.toLowerCase()]) return role;

        return {
            text: role,
            color: colors[role.toLowerCase()]
        };
    }

    convertToPlainText(message) {
        return message.replace(/\*\*(.*?)\*\*/g, '$1');
    }
}

module.exports = new ChatBridge();