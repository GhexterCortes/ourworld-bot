import { GuildMember } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder } from 'reciple';
import { MusicPlayer } from '../../music-player';
import { errorEmbed } from '../../_errorEmbed';

export default function (musicClient: MusicPlayer) {
    return [
        new InteractionCommandBuilder()
            .setName('shuffle')
            .setDescription('Shuffle the queue')
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member as GuildMember;

                if (!member || !interaction.guild) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))]});
                
                const queue = musicClient.player?.getQueue(interaction.guild.id);
                if (!queue || queue.destroyed || !queue.tracks.length) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('noQueue'))] });
                if (member.voice.channelId !== queue.connection.channel.id) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('joinSameVoiceChannel'))] });

                queue.shuffle();
                return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('shuffleQueue'), true)] });
            }),
        new MessageCommandBuilder()
            .setName('shuffle')
            .setDescription('Shuffle the queue')
            .setExecute(async command => {
                const message = command.message;
                const member = message.member as GuildMember;

                if (!member || !message.inGuild()) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))]});

                const queue = musicClient.player?.getQueue(message.guildId);

                if (!queue || queue.destroyed || !queue.tracks.length) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('noQueue'))] });
                if (member.voice.channelId !== queue.connection.channel.id) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('joinSameVoiceChannel'))] });

                queue.shuffle();
                return message.reply({ embeds: [errorEmbed(musicClient.getMessage('shuffleQueue'), true)] });
            })
    ];
}