import { GuildMember } from 'discord.js';
import { InteractionCommandBuilder } from 'reciple';
import { MusicPlayer } from '../../music-player';
import { errorEmbed } from '../../_errorEmbed';

export default function (musicClient: MusicPlayer) {
    return [
        new InteractionCommandBuilder()
            .setName('remove-track')
            .setDescription('Remove a track from the queue')
            .addNumberOption(track => track
                .setName('track-number')
                .setDescription('Track number to remove')
                .setRequired(true)
            )
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member as GuildMember;

                if (!member || !interaction.guild) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))] });

                const queue = musicClient.player?.getQueue(interaction.guild.id);
                if (!queue || queue.destroyed || !queue.tracks.length) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('noQueue'))] });
                if (member.voice.channelId !== queue.connection.channel.id) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('joinSameVoiceChannel'))] });

                let trackNumber = interaction.options.getNumber('track-number') ?? undefined;
                if (trackNumber) trackNumber = trackNumber - 1 < 0 ? 0 : trackNumber - 1;
                if (typeof trackNumber === 'undefined' || queue.tracks.length < trackNumber) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('trackNotFound'))] });

                const track = queue.remove(trackNumber);
                return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('removedTrack', track.title), true, false)] })
            })
    ];
}