const Yml = require('yaml');
const Fetch = require('node-fetch');
const MakeConfig = require('../scripts/makeConfig');
const { replaceAll } = require('fallout-utility');
const { MessageEmbed } = require('discord.js');
const { SafeMessage, SafeInteract } = require('../scripts/safeActions');
const { InteractionCommandBuilder } = require('../scripts/builders');

let scriptConfig;

class ChatBot {
    constructor() {
        this.versions = ['1.6.0'];
    }

    onStart(Client) {
        scriptConfig = this.getConfig('./config/chatbot/config.yml');
        
        if(scriptConfig.chatbot.enabled && scriptConfig.chatbot.command.enabled) {
            this.addCommand(Client);
        }

        Client.on('messageCreate', async (message) => {
            if(!scriptConfig.chatbot.enabled || !message.content) return;
            if(scriptConfig.channels.enableChannelWhitelist && !scriptConfig.channels.channelWhitelist.includes(message.channel.id)) return;
            if(message.author.id == Client.user.id || message.author.bot || message.author.system) return;

            try {
                await message.channel.sendTyping();
                const reply = await this.getResponse(message.content, Client.user.username, Client.AxisUtility.get().config.owner, message.author.username, scriptConfig.chatbot.gender);

                // set reply without pinging the author
                await SafeMessage.reply(message, {
                    content: reply,
                    allowedMentions: {
                        repliedUser: false
                    }
                });
            } catch(err) {
                console.error(err);
                await SafeMessage.reply(message, { content: ' ', embeds: [new MessageEmbed().setAuthor({ name: 'Chat Bot Error' }).setDescription(err.stack).setColor('RED')] });
            }
        });

        return true;
    }

    addCommand(Client) {
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
                        const response = await this.getResponse(query, Client.user.username, Client.user.username, interaction.user.username, scriptConfig.chatbot.gender);

                        await SafeInteract.editReply(interaction, response);
                    } catch(err) {
                        await SafeInteract.editReply(interaction, { content: ' ', embeds: [ new MessageEmbed().setAuthor({ name: 'Chat Bot Error' }).setDescription(err.stack).setColor('RED') ] });
                    }
                })
        ];
    }

    async getResponse(message, botName = 'Bot', ownerName = 'Person', authorName = 'bitch', botGender = 'male') {
        if(!message) throw new Error('No message provided!');
        if(botGender.toLowerCase() != 'male' && botGender.toLowerCase() != 'female') throw new Error('Invalid gender specified');

        const url = `https://api.affiliateplus.xyz/api/chatbot?message=${encodeURIComponent(message)}&botname=${encodeURIComponent(botName)}&ownername=${encodeURIComponent(ownerName)}&user=${encodeURIComponent(authorName)}`;

        let response = await Fetch(url).then(res => res.json());
        if(!response['message']) throw new Error('No response from the API!');
        
        response['message'] = replaceAll(response['message'], ' female ', ` ${botGender} `);
        response['message'] = replaceAll(response['message'], ' male ', ` ${botGender} `);

        return response['message'];
    }

    getConfig(location) {
        return Yml.parse(MakeConfig(location, {
            chatbot: {
                enabled: true,
                command: {
                    enabled: true,
                    gender: 'male',
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