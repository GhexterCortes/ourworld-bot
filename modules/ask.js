const { SlashCommandBuilder } = require('@discordjs/builders');
const safeMessage = require('../scripts/safeMessage');
const { makeSentence, replaceAll } = require('fallout-utility');
const AI = require("./ask/");

module.exports = new create();

let chatbot = null;
let askConfig = require('./ask/config.js');

function create(){
    let config = {};
    let language = {};
    this.versions = ['1.1.0'];
    this.arguments = {
        question: {
            required: true,
            values: ""
        }
    };

    // Create the chatbot
    this.start = (client, action, conf, lang) => {
        config = conf;
        language = lang;

        chatbot = new AI({name: client.user.username, gender: "Male"});

        client.on('messageCreate', async (message) => {
            if(typeof askConfig.chatbotChannels.find(ch => ch.toString() === message.channelId) === "undefined") return;
            if(!message.content || message.content == '') return;
            if(message.author.id === client.user.id || message.author.bot || message.author.system) return;

            message.channel.sendTyping();
            try {
                await chatbot.chat(message.content, removeChars(message.author.username)).then(async (response) => {
                    response = replaceAll(response, 'Udit', config.owner);

                    await safeMessage.reply(message, response);
                }).catch(async (err) => {
                    await safeMessage.reply(message, err.message);
                });
            } catch(err) {
                await safeMessage.reply(message, err.message);
            }
        });

        return true;
    }
    this.execute = async (args, message, client, action) => {
        let sentence = makeSentence(args).toString().trim();
        if(sentence.length == 0) { await message.reply(action.get(language.empty)); return; }

        message.channel.sendTyping();
        try {
            await chatbot.chat(sentence, removeChars(message.author.username)).then(async (response) => {
                response = replaceAll(response, 'Udit', config.owner);

                await safeMessage.reply(message, response);
            }).catch(async (err) => {
                await safeMessage.reply(message, err.message);
            });
        } catch(err) {
            await safeMessage.reply(message, err.message);
        }
    }

    this.slash = {
        command: new SlashCommandBuilder()
            .setName("ask")
            .setDescription(`Ask me something`)
            .addStringOption(option => option.setName('question')
                .setDescription("Question")
                .setRequired(true)
            ),
        async execute(interaction, client, action) {
            await interaction.deferReply();

            try {
                await chatbot.chat(interaction.options.getString('question'), removeChars(interaction.member.username)).then(async (response) => {
                    response = replaceAll(response, 'Udit', config.owner);
        
                    await interaction.editReply(response);
                }).catch(async (err) => {
                    await interaction.editReply({ content: err.message, ephemeral: true});
                });
            } catch (err) {
                await interaction.editReply({ content: err.message, ephemeral: true});
            }

        }
    }
}

function removeChars(string) {
    return string.replace(/[^\w\s]/gi, '');
}