import { GuildMember } from 'discord.js';
import { isNumber } from 'fallout-utility';
import { InteractionCommandBuilder, MessageCommandBuilder } from 'reciple';
import { MusicPlayer } from '../../_music-player';
import { errorEmbed } from '../../_errorEmbed';

export default function (musicClient: MusicPlayer) {
    return [
        new InteractionCommandBuilder()
            .setName('skip')
            .setDescription('Skips the current song.')
            .addNumberOption(track => track
                .setName(`skip-to`)
                .setDescription(`Skip to a given track number`)
                .setMinValue(1)
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
                if (trackNumber) trackNumber =  trackNumber - 1 < 0 ? 0 : trackNumber - 1;
                if (trackNumber && trackNumber >= queue.tracks.length) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('trackNotFound'), true)] });

                const skippedTrack = queue.nowPlaying();
                const skip = trackNumber ? queue.skipTo(trackNumber) : queue.skip();
                
                return interaction.reply({ embeds: [skip || skip === undefined ? errorEmbed(musicClient.getMessage('skipped', skippedTrack.title), true, false) : errorEmbed(musicClient.getMessage('error'))] });
            }),
        new MessageCommandBuilder()
            .setName('skip')
            .setDescription('Skips track')
            .addOption(skipTo => skipTo
                .setName('skip-to')
                .setDescription('Skip to track')
                .setRequired(false)
                .setValidator(val => isNumber(val) && parseInt(val, 10) >= 1)    
            )
            .setExecute(async command => {
                const message = command.message;
                const member = message.member as GuildMember;

                if (!member || !message.inGuild()) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))]});

                const queue = musicClient.player?.getQueue(message.guildId);

                if (!queue || queue.destroyed) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('noQueue'))] });
                if (member.voice.channelId !== queue.connection.channel.id) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('joinSameVoiceChannel'))] });

                let trackNumber = command.command.args ? parseInt(command.command.args[0], 10) : undefined;
                if (trackNumber && isNumber(trackNumber)) trackNumber =  trackNumber - 1 < 0 ? 0 : trackNumber - 1;
                if (trackNumber && trackNumber >= queue.tracks.length) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('trackNotFound'), true)] });

                const skippedTrack = queue.nowPlaying();
                const skip = trackNumber ? queue.skipTo(trackNumber) : queue.skip();
                
                return message.reply({ embeds: [skip || skip === undefined ? errorEmbed(musicClient.getMessage('skipped', skippedTrack.title), true, false) : errorEmbed(musicClient.getMessage('error'))] });
            })
    ];
}
