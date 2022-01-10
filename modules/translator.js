const Translator = require('@vitalets/google-translate-api');
const Languages = require('@vitalets/google-translate-api/languages');
const { MessageEmbed } = require('discord.js');
const { SafeInteract, SafeMessage } = require('../scripts/safeActions');
const { MessageCommandBuilder, InteractionCommandBuilder } = require('../scripts/builders');

class TranslatorCommand {
    constructor() {
        this.versions = ['1.6.0','1.6.1'];
    }

    onStart(Client) {
        this.commands = [
            new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('translate')
                    .setDescription('Translate text.')
                    .addStringOption(query => query.setName('query').setDescription('The text to translate.').setRequired(true))
                    .addStringOption(query => query.setName('from').setDescription('The language to translate from. (eg: en, fr, es)').setRequired(false))
                    .addStringOption(query => query.setName('to').setDescription('The language to translate to. (eg: en, fr, es)').setRequired(false))
                )
                .setExecute(async (interaction) => {
                    const query = interaction.options.getString('query');
                    const from = interaction.options.getString('from');
                    const to = interaction.options.getString('to');

                    if(!query) return SafeInteract.reply(interaction, { content: ' ', embeds: [ new MessageEmbed().setDescription('No text provided!').setColor('RED') ] });

                    try{
                        await SafeInteract.deferReply(interaction);
                        
                        const embed = await this.translate(query, Client, from, to);
                        
                        await SafeInteract.editReply(interaction, { content: ' ', embeds: [ embed ] });
                    } catch (err) {
                        console.error(err);
                        await SafeInteract.editReply(interaction, { content: ' ', embeds: [ new MessageEmbed().setAuthor({ name: 'Translator Error' }).setDescription(`\`\`\`\n${err.message}\n\`\`\``).setColor('RED') ] });
                    }
                }),
            new MessageCommandBuilder()
                .setName('translate')
                .setDescription('Translate text to english.')
                .addArgument('query', true, 'The text to translate.')
                .setExecute(async (args, message) => {
                    const reply = await SafeMessage.reply(message, { content: ' ', embeds: [ new MessageEmbed().setAuthor({ name: 'Translating...', iconURL: Client.user.displayAvatarURL() }) ] });
                    try{
                        const query = args.join(' ').trim();
                        if(!query) throw new Error('No text provided!');
                        
                        const embed = await this.translate(query, Client);
                        await SafeMessage.edit(reply, { content: ' ', embeds: [ embed ] });
                    } catch (err) {
                        console.error(err);
                        await SafeMessage.edit(reply, { content: ' ', embeds: [ new MessageEmbed().setAuthor({ name: 'Translator Error' }).setDescription(`\`\`\`\n${err.message}\n\`\`\``).setColor('RED') ] });
                    }
                })
        ];
        return true;
    }

    async translate(query, Client, from, to) {
        if(to && Languages.isSupported(to)) { to = Languages.getCode(to); } else { to = 'en'; }
        if(from && Languages.isSupported(from)) { from = Languages.getCode(from); }

        const response = await Translator(query, { to: (to ? to : 'en'), from: (from ? from : null) });

        if(!response || !response.text) throw new Error('No translation response received!');

        const embed = new MessageEmbed()
            .setAuthor({ name: 'Translator', iconURL: Client.user.displayAvatarURL() })
            .addField('Translation', response.text, false)
            .setFooter({ text: `Translated from "${query}"`})
            .setColor(Client.AxisUtility.get().config.embedColor);

        if(response.pronunciation) embed.addField('Pronunciation', response.pronunciation, false);
        if(response.from.text.didYouMean || response.from.text.autoCorrected) embed.addField('Did you mean?', response.from.text.didYouMean, false);
        if(from) embed.addField('From', `${from}`, true);
        if(to) embed.addField('To', `${to}`, true);

        return embed;
    }
}

module.exports = new TranslatorCommand();