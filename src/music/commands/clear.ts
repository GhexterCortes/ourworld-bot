import { GuildMember } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder } from 'reciple';
import { MusicPlayer } from '../../_music-player';
import { errorEmbed } from '../../_errorEmbed';

export default function (musicClient: MusicPlayer) {
    return [
        new InteractionCommandBuilder()
            .setName('clear-queue')
            .setDescription('Clear the queue')
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member as GuildMember;

                if (!member || !interaction.guild) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))] });
                
                const queue = musicClient.player?.getQueue(interaction.guild.id);

                if (!queue || queue.destroyed || !queue.tracks.length) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('noQueue'))] });
                if (member.voice.channelId !== queue.connection.channel.id) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('joinSameVoiceChannel'))] });

                const tracksLength = queue.tracks.length;
                queue.clear();

                return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('clearQueue', `${tracksLength}`), true, false)] });
            }),
        new MessageCommandBuilder()
            .setName('clear-queue')
            .setDescription('Clear the queue')
            .setExecute(async command => {
                const message = command.message;
                const member = message.member as GuildMember;

                if (!member || !message.inGuild()) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))]});

                const queue = musicClient.player?.getQueue(message.guildId);

                if (!queue || queue.destroyed || !queue.tracks.length) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('noQueue'))] });
                if (member.voice.channelId !== queue.connection.channel.id) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('joinSameVoiceChannel'))] });

                const tracksLength = queue.tracks.length;
                queue.clear();

                return message.reply({ embeds: [errorEmbed(musicClient.getMessage('clearQueue', `${tracksLength}`), true, false)] });
            })
    ];
}
