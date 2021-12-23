const Yml = require('yaml');
const Fetch = require('node-fetch');
const MakeConfig = require('../scripts/makeConfig');
const SafeMessage = require('../scripts/safeMessage');
const SafeInteract = require('../scripts/safeInteract');
const { MessageEmbed } = require('discord.js');
const InteractionCommandBuilder = require('../scripts/interactionCommandBuilder');

class ChatBot {
    constructor() {
        this.versions = ['1.4.4'];
    }

    start(Client) {
        const scriptConfig = this.getConfig('./config/chatbot.yml');
        
        if(scriptConfig.chatbot.enabled && scriptConfig.chatbot.command.enabled) {
            this.commands = [
                new InteractionCommandBuilder()
                    .setCommand(SlashCommandBuilder => SlashCommandBuilder
                        .setName(scriptConfig.chatbot.command.name)
                        .setDescription(scriptConfig.chatbot.command.description)
                        .addStringOption(query => query.setName('query').setDescription('The question to ask.'))
                    )
                    .setAllowExecuteViaDm(true)
                    .setExecute(async (interaction) => {
                        const query = interaction.options.getString('query');
                        if(!query) return SafeInteract.reply(interaction, { content: ' ', embeds: [ new MessageEmbed().setDescription('No question provided!').setColor('RED') ] });

                        try{
                            await SafeInteract.deferReply(interaction);
                            const response = await this.getResponse(query, Client.user.username, Client.user.username, interaction.user.username);

                            await SafeInteract.editReply(interaction, response);
                        } catch(err) {
                            await SafeInteract.editReply(interaction, { content: ' ', embeds: [ new MessageEmbed().setAuthor('Chat Bot Error').setDescription(err.message).setColor('RED') ] });
                        }
                    })
            ]
        }

        Client.on('messageCreate', async (message) => {
            if(!scriptConfig.chatbot.enabled || !message.content) return;
            if(scriptConfig.channels.enableChannelWhitelist && !scriptConfig.channels.channelWhitelist.includes(message.channel.id)) return;
            if(message.author.id == Client.user.id || message.author.bot || message.author.system) return;

            try {
                await message.channel.sendTyping();
                const reply = await this.getResponse(message.content, Client.user.username, Client.AxisUtility.getConfig().owner, message.author.username);

                // set reply without pinging the author
                await SafeMessage.reply(message, {
                    content: reply,
                    allowedMentions: {
                        repliedUser: false
                    }
                });
            } catch(err) {
                console.error(err);
                await SafeMessage.reply(message, { content: ' ', embeds: [new MessageEmbed().setAuthor('Chat Bot Error').setDescription(err.message).setColor('RED')] });
            }
        });

        return true;
    }

    async getResponse(message, botName = 'Bot', ownerName = 'Person', authorName = 'bitch') {
        if(!message) throw new Error('No message provided!');

        const url = `https://api.affiliateplus.xyz/api/chatbot?message=${encodeURIComponent(message)}&botname=${encodeURIComponent(botName)}&ownername=${encodeURIComponent(ownerName)}&user=${encodeURIComponent(authorName)}`;

        const response = await Fetch(url).then(res => res.json());
        if(!response['message']) throw new Error('No response from the API!');
        
        return response['message'];
    }

    getConfig(location) {
        return Yml.parse(MakeConfig(location, {
            chatbot: {
                enabled: true,
                command: {
                    enabled: true,
                    name: 'ask',
                    description: 'Ask something!'
                }
            },
            channels: {
                enableChannelWhitelist: true,
                channelWhitelist: ['channelIdHere']
            }
        }))
    }
}

module.exports = new ChatBot();