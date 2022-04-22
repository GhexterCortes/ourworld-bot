import { GuildMember } from 'discord.js';
import { InteractionCommandBuilder } from 'reciple';
import { MusicPlayer } from '../../music-player';
import { errorEmbed } from '../../_errorEmbed';

export default function (musicClient: MusicPlayer) {
    return [
        new InteractionCommandBuilder()
            .setName('pause-resume')
            .setDescription('Pauses or resumes the current song.')
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member as GuildMember;

                if (!member || !interaction.guild) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))] });
                
                const queue = musicClient.player?.getQueue(interaction.guild.id);
                if (!queue || queue.destroyed) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('noQueue'))] });
                if (member.voice.channelId !== queue.connection.channel.id) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('joinSameVoiceChannel'))] });

                const action = musicClient.togglePlayPause(queue);
                switch (action) {
                    case 'UNPAUSED':
                        interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('unpaused', queue.nowPlaying().title), true, false)] });
                        break;
                    case 'PAUSED':
                        interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('paused', queue.nowPlaying().title), true, false)] });
                        break;
                    case 'FAILED':
                        interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('error'))] });
                        break;
                }
            })
    ];
}