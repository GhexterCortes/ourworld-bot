import { GuildMember } from 'discord.js';
import { InteractionCommandBuilder } from 'reciple';
import { MusicPlayer } from '../../music-player';
import { errorEmbed } from '../../_errorEmbed';

export default function (musicClient: MusicPlayer) {
    return [
        new InteractionCommandBuilder()
            .setName('skip')
            .setDescription('Skips the current song.')
            .addNumberOption(track => track
                .setName(`skip-to`)
                .setDescription(`Skip to a given track number`)
                .setRequired(false)    
            )
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member as GuildMember;

                if (!member || !interaction.guild) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))] });

                const queue = musicClient.player?.getQueue(interaction.guild.id);
                if (!queue || queue.destroyed) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('noQueue'))] });
                if (member.voice.channelId !== queue.connection.channel.id) return interaction.reply({ embeds: [errorEmbed('joinSameVoiceChannel')] });

                let trackNumber = interaction.options.getNumber('skip-to') ?? undefined;
                if (typeof trackNumber !== 'undefined') trackNumber =  trackNumber - 1 < 0 ? 0 : trackNumber - 1;
                if (trackNumber && trackNumber >= queue.tracks.length) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('trackNotFound'), true)] });

                const skippedTrack = queue.nowPlaying();
                const skip = trackNumber ? queue.skipTo(trackNumber) : queue.skip();
                
                return interaction.reply({ embeds: [skip || skip === undefined ? errorEmbed(musicClient.getMessage('skipped', skippedTrack.title), true, false) : errorEmbed(musicClient.getMessage('error'))] });
            })
    ];
}