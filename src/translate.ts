import { MessageEmbed } from 'discord.js';
import { ContextMenuCommandBuilder } from '@discordjs/builders';
import translate from '@vitalets/google-translate-api';
import { RecipleClient, RecipleScript, version } from 'reciple';
import { errorEmbed } from './_errorEmbed';
import { ApplicationCommandTypes } from 'discord.js/typings/enums';

class Translator implements RecipleScript {
    public versions: string[] = [version];

    public onStart(client: RecipleClient) {
        client.on('interactionCreate', async interaction => {
            if (!interaction.isMessageContextMenu() || !interaction.inGuild() || interaction.commandName !== 'translate') return;

            const message = interaction.targetMessage;
            if (!message.content) return interaction.reply({ embeds: [errorEmbed('No content to translate!')] }).catch(() => {});

            await interaction.deferReply();

            const translated = await translate(message.content, { to: 'en' }).catch(() => undefined);
            if (!translated) return interaction.reply({ embeds: [errorEmbed('Failed to translate!')] }).catch(() => {});

            const author = client.users.cache.get(message.author.id);
            const embed = new MessageEmbed()
                .setAuthor({ name: author?.tag ?? message.author.username, iconURL: author?.displayAvatarURL() })
                .setDescription(translated.text || ' ')
                .setColor('BLUE')
                .setFooter({ text: `Translated from "${message.content}"` });

            interaction.editReply({ embeds: [embed] }).catch(() => {});
        });
        
        return true;
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