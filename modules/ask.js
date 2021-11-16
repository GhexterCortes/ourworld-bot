const Util = require('fallout-utility');
const Yml = require('yaml');
const AI = require('./ask/');
const MakeConfig = require('../scripts/makeConfig');
const SafeMessage = require('../scripts/safeMessage');
const SafeInteract = require('../scripts/safeInteract');
const MessageCommandBuilder = require('../scripts/messageCommandBuilder');
const InteractionCommandBuilder = require('../scripts/interactionCommandBuilder');

const log = new Util.Logger('Ask.js');
const scriptConfig = getConfig('./config/ask.yml');
let chatbot = null;

class Create {
    constructor() {
        this.versions = ['1.4.1'];
        this.commands = [
            new MessageCommandBuilder()
                .setName('ask')
                .setDescription('Ask a question to the bot.')
                .addArgument('question', true, 'The question to ask.')
                .setExecute(async (args, message, Client) => {
                    const config = Client.AxisUtility.getConfig();
                    const language = Client.AxisUtility.getLanguage();
                    
                    if(args.length < 1) { await SafeMessage.reply(message, Util.getRandomKey(language.empty)); return; }
                    const question = args.join(' ');

                    await message.channel.sendTyping().catch(err => log.error(err));

                    const reply = await ask(question, message.author.username, config.owner);
                    if(!reply) { await SafeMessage.reply(message, Util.getRandomKey(language.error)); return; }

                    await SafeMessage.reply(message, reply);
                }),
            new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('ask')
                    .setDescription('Ask a question to the bot.')
                    .addStringOption(question => question.setName('question').setDescription('The question to ask.').setRequired(true))    
                )
                .setExecute(async (interaction, Client) => {
                    const config = Client.AxisUtility.getConfig();
                    const language = Client.AxisUtility.getLanguage();

                    await SafeInteract.deferReply(interaction);

                    const reply = await ask(interaction.options.getString('question'), interaction.member.user.username, config.owner);
                    if(!reply) { await SafeInteract.editReply(interaction, { content: Util.getRandomKey(language.error), ephemeral: true }); return; }

                    await SafeInteract.editReply(interaction, reply);
                })
        ];
    }

    async start(Client) {
        const config = Client.AxisUtility.getConfig();
        const language = Client.AxisUtility.getLanguage();

        chatbot = new AI({ 
            name: (scriptConfig.botIdentity.name != null ? scriptConfig.botIdentity.name : Client.user.username),
            gender: (scriptConfig.botIdentity.gender != null ? upperBegin(scriptConfig.botIdentity.gender) : 'Male')
        });

        Client.on('messageCreate', async (message) => {
            if(
                typeof scriptConfig.serverConfigurations.botChannelsId.find(channel => channel.toString() === message.channelId) === 'undefined'
                ||
                scriptConfig.serverConfigurations.ignoreBots && (message.author.bot || message.author.system)
                ||
                message.content == ''
            ) return;

            await message.channel.sendTyping().catch(err => log.error(err));
            
            const reply = await ask(message.content, message.author.username, config.owner);
            if(!reply) { await SafeMessage.reply(message, Util.getRandomKey(language.error)); return; }

            await SafeMessage.reply(message, reply);
        });
        return true;
    }
}

async function ask(message, username, owner) {
    let reply = false;

    try {
        await chatbot.chat(message, removeChars(username)).then(async (response) => {
            response = Util.replaceAll(response, 'Udit', owner);

            reply = response;
        }).catch(async (err) => {
            console.error(err);
        });
    } catch(err) {
        console.error(err);
    }

    return reply;
}

function removeChars(string) {
    return string.toString().replace(/[^\w\s]/gi, '');
}

function upperBegin(string) {
    const firstLetter = string.toString().substr(0, 1).toUpperCase();
    const restLetters = string.toString().substr(1);

    return firstLetter + restLetters;
}

function getConfig(location) {
    const config = `# configure bot in your server
serverConfigurations:
    # Channel ID for bot to reply on messages without using command
    botChannelsId: []

    # Ignore bot messages in bot channels
    ignoreBots: true

# Some bot identity
botIdentity:
    # Bot name (Will use bot username if empty)
    name:

    # Bot gender
    gender: Male
`;

    return Yml.parse(MakeConfig(location, config));
}

module.exports = new Create(); 