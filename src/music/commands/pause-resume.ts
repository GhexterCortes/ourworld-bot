import { GuildMember } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder, RecipleMessageCommandExecute } from 'reciple';
import { MusicPlayer } from '../../music-player';
import { errorEmbed } from '../../_errorEmbed';

export default function (musicClient: MusicPlayer) {
    const messageCommand = async (command: RecipleMessageCommandExecute) => {
        const message = command.message;
        const member = message.member as GuildMember;

        if (!member || !message.inGuild()) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))]});

        const queue = musicClient.player?.getQueue(message.guildId);

        if (!queue || queue.destroyed) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('noQueue'))] });
        if (member.voice.channelId !== queue.connection.channel.id) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('joinSameVoiceChannel'))] });

        const action = musicClient.togglePlayPause(queue);
        switch (action) {
            case 'UNPAUSED':
                message.reply({ embeds: [errorEmbed(musicClient.getMessage('unpaused', queue.nowPlaying().title), true, false)] });
                break;
            case 'PAUSED':
                message.reply({ embeds: [errorEmbed(musicClient.getMessage('paused', queue.nowPlaying().title), true, false)] });
                break;
            case 'FAILED':
                message.reply({ embeds: [errorEmbed(musicClient.getMessage('error'))] });
                break;
        }
    };

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
            }),
        new MessageCommandBuilder()
            .setName('pause')
            .setDescription('Pauses or resumes the queue')
            .setExecute(messageCommand),
        new MessageCommandBuilder()
            .setName('resume')
            .setDescription('Resumes or pauses the queue')
            .setExecute(messageCommand)
    ];
}