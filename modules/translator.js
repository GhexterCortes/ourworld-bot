const Translator = require('@vitalets/google-translate-api');
const SafeInteract = require('../scripts/safeInteract');
const { MessageEmbed } = require('discord.js');
const InteractionCommandBuilder = require('../scripts/interactionCommandBuilder');

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
                        const response = await Translator(query, { to: 'en' });

                        if(!response) throw new Error('No translation response received!');

                        console.log(response);
                        const embed = new MessageEmbed()
                            .setAuthor('Translate', Client.user.avatarURL({ format: 'png', dynamic: true }))
                            .addField('Translation', response.text, false)
                            .setFooter(`Translated from "${query}"`)
                            .setColor(Client.AxisUtility.getConfig().embedColor);

                        if(response.pronunciation) embed.addField('Pronunciation', response.pronunciation, false);
                        if(response.from.text.didYouMean) embed.addField('Did you mean?', response.from.text.didYouMean, false);
                        
                        await SafeInteract.editReply(interaction, { content: ' ', embeds: [ embed ] });
                    } catch (err) {
                        console.error(err);
                        await SafeInteract.editReply(interaction, { content: ' ', embeds: [ new MessageEmbed().setAuthor('Translator Error').setDescription(`\`\`\`\n${err.stack}\n\`\`\``).setColor('RED') ] });
                    }
                })
        ];
        return true;
    }
}

module.exports = new TranslatorCommand();