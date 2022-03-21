const Yml = require('yaml');
const Fetch = require('node-fetch');
const MakeConfig = require('../scripts/makeConfig');
const { replaceAll } = require('fallout-utility');
const { MessageEmbed } = require('discord.js');
const { SafeMessage, SafeInteract } = require('../scripts/safeActions');
const { InteractionCommandBuilder, MessageCommandBuilder} = require('../scripts/builders');

let scriptConfig;

class ChatBot {
    constructor() {
        this.versions = ['1.6.0','1.6.1'];
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
                const reply = await SafeMessage.reply(message, { content: ' ', embeds: [new MessageEmbed().setAuthor({ name: 'Chat Bot Error' }).setDescription(err.stack).setColor('RED')], allowedMentions: { repliedUser: false } });

                setTimeout(async () => {
                    await SafeMessage.delete(reply);
                    await SafeMessage.delete(message);
                }, 3000);
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
                }),
            new MessageCommandBuilder()
                .setName(scriptConfig.chatbot.command.name)
                .setDescription(scriptConfig.chatbot.command.description)
                .addArgument('query', true, 'The question to ask.')
                .setExecute(async (args, message) => {
                    if(!args?.length) return SafeMessage.reply(message, { content: ' ', embeds: [ new MessageEmbed().setDescription('No question provided!').setColor('RED') ] });
                    const query = args.join(' ');

                    try {
                        const reply = await SafeMessage.reply(message, { content: ' ', embeds: [ new MessageEmbed().setDescription('Please wait...').setColor('YELLOW') ] });
                        const response = await this.getResponse(query, Client.user.username, Client.user.username, message.author.username, scriptConfig.chatbot.gender);

                        await SafeMessage.edit(reply, { content: response, embeds: [], allowedMentions: { repliedUser: false } });
                    } catch (err) {
                        await SafeMessage.reply(message, { content: ' ', embeds: [new MessageEmbed().setAuthor({ name: 'Chat Bot Error' }).setDescription(err.stack).setColor('RED')] });
                    }
                })
        ];
    }

    async getResponse(message, botName = 'Bot', ownerName = 'Person', authorName = 'bitch', botGender = 'male') {
        if(!message) throw new Error('No message provided!');
        if(botGender.toLowerCase() != 'male' && botGender.toLowerCase() != 'female') throw new Error('Invalid gender specified');
        
        const params = [
            {
                name: 'message',
                value: message
            },
            {
                name: 'botname',
                value: botName
            },
            {
                name: 'master',
                value: ownerName
            },
            {
                name: 'user',
                value: authorName
            },
            {
                name: 'orientation',
                value: 'gay'
            },
            {
                name: 'religion',
                value: 'none'
            },
            { 
                name: 'birthdate',
                value: 'April 4, 2021'
            },
            {
                name: 'birthday',
                value: 'April 4'
            },
            {
                name: 'birthplace',
                value: 'Ghex\'s computer'
            },
            {
                name: 'birthyear',
                value: '2021'
            },
            {
                name: 'age',
                value: getAge('2020/04/02')
            },
            {
                name: 'city',
                value: 'Hard Drive'
            },
            {
                name: 'country',
                value: 'Philippines'
            },
            {
                name: 'email',
                value: 'ghextershumies@gmail.com'
            },
            {
                name: 'family',
                value: 'Axis based bot'
            },
            {
                name: 'job',
                value: 'Watching chat chaos'
            },
            {
                name: 'favoriteband',
                value: 'idk'
            },
            {
                name: 'favoritesong',
                value: 'King and Queens by Ava Max'
            },
            {
                name: 'gender',
                value: botGender
            },
            {
                name: 'kindmusic',
                value: 'Dance Pop'
            },
            {
                name: 'Location',
                value: 'Heroku\'s server'
            }
        ];

        const url = `https://api.affiliateplus.xyz/api/chatbot${parseUrl(params)}`;
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
                gender: 'male',
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

function parseUrl (params) {
    let url = '';

    let i = 0;
    for(const param of params) {
        const _ = i ? '&' : '?';
        
        const name = param.name;
        const value = encodeURIComponent(param.value);

        url += _ + name + '=' + value;
        i++;
    }

    return url;
}

function getAge(dateString) {
    var today = new Date();
    var birthDate = new Date(dateString);
    var age = today.getFullYear() - birthDate.getFullYear();
    var m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

module.exports = new ChatBot();