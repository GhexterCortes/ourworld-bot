import { GuildMember } from 'discord.js';
import { isNumber } from 'fallout-utility';
import { InteractionCommandBuilder, MessageCommandBuilder } from 'reciple';
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
                .setMinValue(1)
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
            }),
        new MessageCommandBuilder()
            .setName('remove-track')
            .setDescription('Remove a track from the queue')
            .addOption(track => track
                .setName('track-number')
                .setDescription('Track number to remove')
                .setRequired(true)
                .setValidator(val => isNumber(val) && parseInt(val, 10) >= 1)    
            )
            .setExecute(async command => {
                const message = command.message;
                const member = message.member as GuildMember;

                if (!member || !message.inGuild()) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))]});

                const queue = musicClient.player?.getQueue(message.guildId);

                if (!queue || queue.destroyed || !queue.tracks.length) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('noQueue'))] });
                if (member.voice.channelId !== queue.connection.channel.id) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('joinSameVoiceChannel'))] });

                let trackNumber = command.command.args ? parseInt(command.command.args[0], 10) : undefined;
                if (trackNumber && isNumber(trackNumber)) trackNumber =  trackNumber - 1 < 0 ? 0 : trackNumber - 1;
                if (typeof trackNumber == 'undefined' || trackNumber >= queue.tracks.length) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('trackNotFound'), true)] });

                const track = queue.remove(trackNumber);
                return message.reply({ embeds: [errorEmbed(musicClient.getMessage('removedTrack', track.title), true, false)] })
            })
    ];
}