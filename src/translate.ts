import { MessageEmbed, User } from 'discord.js';
import { ContextMenuCommandBuilder } from '@discordjs/builders';
import translate from '@vitalets/google-translate-api';
import { InteractionCommandBuilder, MessageCommandBuilder, RecipleClient, RecipleScript } from 'reciple';
import { errorEmbed } from './_errorEmbed';

export class Translator implements RecipleScript {
    public versions: string[] = ['1.6.x'];
    public commands: (MessageCommandBuilder|InteractionCommandBuilder)[] = [];

    public onStart(client: RecipleClient) {
        this.commands = [
            new MessageCommandBuilder()
                .setName('translate')
                .setDescription('Translate a message \'cause owo isn\'t available lol')
                .addOption(text => text
                    .setName('text')
                    .setDescription('Text to translate')
                    .setRequired(true)    
                )
                .setValidateOptions(true)
                .setExecute(async command => {
                    const message = command.message;
                    const content = command.command.args.join(' ');

                    const translated = await this.translateMessage(content, message.author);
                    
                    message.reply(translated);
                }),
            new InteractionCommandBuilder()
                .setName('translate')
                .setDescription('Translate a message \'cause you\'re ass is too lazy to open google translate')
                .addStringOption(text => text
                    .setName('text')
                    .setDescription('Text to translate')
                    .setRequired(true)    
                )
                .setExecute(async command => {
                    const interaction = command.interaction;
                    const content = interaction.options.getString('text', true);

                    await interaction.deferReply();
                    const translated = await this.translateMessage(content, interaction.user);
                    interaction.editReply(translated);
                })
        ];

        client.on('interactionCreate', async interaction => {
            if (!interaction.isMessageContextMenu() || !interaction.inGuild() || interaction.commandName !== 'translate') return;

            const message = interaction.targetMessage;
            if (!message.content) return interaction.reply({ embeds: [errorEmbed('No content to translate!')], ephemeral: true }).catch(() => {});

            await interaction.deferReply();

            const translated = await this.translateMessage(message.content, interaction.user).catch(() => undefined);
            if (!translated) return interaction.reply({ embeds: [errorEmbed('Failed to translate!')], ephemeral: true }).catch(() => {});

            interaction.editReply(translated).catch(() => {});
        });
        
        return true;
    }

    public async translateMessage(content: string, author?: User) {
        if (!content) return { embeds: [errorEmbed('No content to translate')] };

        const translated = await translate(content, { to: 'en' }).catch(() => undefined);
        if (!translated) return { embeds: [errorEmbed('Failed to translate')] };

        const embed = new MessageEmbed()
            .setDescription(translated.text || 'None')
            .setColor('BLUE')
            .setFooter({ text: `Translated from "${content}"` });
        
        if (author) embed.setAuthor({ name: author.tag, iconURL: author.displayAvatarURL() });
        if (translated.pronunciation) embed.addField('Pronunciation', translated.pronunciation);
        
        return { embeds: [embed] };
    }

    public async onLoad(client: RecipleClient) {
        client.otherApplicationCommandData = [
            ...client.otherApplicationCommandData,
            new ContextMenuCommandBuilder()
                .setName('translate')
                .setType(3)
        ]
    }
}

module.exports = new Translator();
