const Translator = require('@vitalets/google-translate-api');
const SafeInteract = require('../scripts/safeInteract');
const SafeMessage = require('../scripts/safeMessage');
const { MessageEmbed } = require('discord.js');
const InteractionCommandBuilder = require('../scripts/interactionCommandBuilder');
const MessageCommandBuilder = require('../scripts/messageCommandBuilder');

class TranslatorCommand {
    constructor() {
        this.versions = ['1.4.4'];
    }

    start(Client) {
        this.commands = [
            new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('translate')
                    .setDescription('Translate text to english.')
                    .addStringOption(query => query.setName('query').setDescription('The text to translate.').setRequired(true))
                )
                .setExecute(async (interaction) => {
                    const query = interaction.options.getString('query');
                    if(!query) return SafeInteract.reply(interaction, { content: ' ', embeds: [ new MessageEmbed().setDescription('No text provided!').setColor('RED') ] });

                    try{
                        await SafeInteract.deferReply(interaction);
                        
                        const embed = await this.translate(query, Client);
                        
                        await SafeInteract.editReply(interaction, { content: ' ', embeds: [ embed ] });
                    } catch (err) {
                        console.error(err);
                        await SafeInteract.editReply(interaction, { content: ' ', embeds: [ new MessageEmbed().setAuthor('Translator Error').setDescription(`\`\`\`\n${err.message}\n\`\`\``).setColor('RED') ] });
                    }
                }),
            new MessageCommandBuilder()
                .setName('translate')
                .setDescription('Translate text to english.')
                .addArgument('query', true, 'The text to translate.')
                .setExecute(async (args, message) => {
                    const reply = await SafeMessage.reply(message, { content: ' ', embeds: [ new MessageEmbed().setAuthor('Translating...', Client.user.avatarURL({ format: 'png', dynamic: true })) ] });
                    try{
                        const query = args.join(' ').trim();
                        if(!query) throw new Error('No text provided!');
                        
                        const embed = await this.translate(query, Client);
                        await SafeMessage.edit(reply, { content: ' ', embeds: [ embed ] });
                    } catch (err) {
                        console.error(err);
                        await SafeMessage.edit(reply, { content: ' ', embeds: [ new MessageEmbed().setAuthor('Translator Error').setDescription(`\`\`\`\n${err.message}\n\`\`\``).setColor('RED') ] });
                    }
                })
        ];
        return true;
    }

    async translate(query, Client) {
        const response = await Translator(query, { to: 'en' });

        if(!response || !response.text) throw new Error('No translation response received!');

        console.log(response);
        const embed = new MessageEmbed()
            .setAuthor('Translate', Client.user.avatarURL({ format: 'png', dynamic: true }))
            .addField('Translation', response.text, false)
            .setFooter(`Translated from "${query}"`)
            .setColor(Client.AxisUtility.getConfig().embedColor);

        if(response.pronunciation) embed.addField('Pronunciation', response.pronunciation, false);
        if(response.from.text.didYouMean || response.from.text.autoCorrected) embed.addField('Did you mean?', response.from.text.didYouMean, false);

        return embed;
    }
}

module.exports = new TranslatorCommand();