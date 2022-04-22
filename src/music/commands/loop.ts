import { QueueRepeatMode } from 'discord-player';
import { GuildMember } from 'discord.js';
import { InteractionCommandBuilder } from 'reciple';
import { MusicPlayer } from '../../music-player';
import { errorEmbed } from '../../_errorEmbed';

export default function (musicClient: MusicPlayer) {
    return [
        new InteractionCommandBuilder()
            .setName('loop')
            .setDescription('Loop the queue or the current track')
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member as GuildMember;
                const subcommand = interaction.options.getSubcommand();

                if (!member || !interaction.guild) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))] });
                
                const queue = musicClient.player?.getQueue(interaction.guild.id);
                if (!queue || queue.destroyed || !queue.tracks.length) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('noQueue'))] });
                if (member.voice.channelId !== queue.connection.channel.id) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('joinSameVoiceChannel'))] });

                switch (subcommand) {
                    case 'queue':
                        queue.setRepeatMode(QueueRepeatMode.QUEUE);
                        return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('loopQueue'), true)] });
                    case 'track':
                        queue.setRepeatMode(QueueRepeatMode.TRACK);
                        return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('loopTrack', queue.nowPlaying().title), true, false)] });
                    case 'off':
                        queue.setRepeatMode(QueueRepeatMode.OFF);
                        return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('loopOff'), true)] });
                }
            })
            .addSubcommand(queue => queue
                .setName('queue')
                .setDescription('Loop the queue')
            )
            .addSubcommand(track => track
                .setName('track')
                .setDescription('Loop the current track')    
            )
            .addSubcommand(off => off
                .setName('off')
                .setDescription('Turn off looping')    
            )
    ];
}