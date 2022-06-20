import { GuildMember, MessageEmbed } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder } from 'reciple';
import { MusicPlayer } from '../../_music-player';
import { errorEmbed } from '../../_errorEmbed';

export default function (musicClient: MusicPlayer) {
    return [
        new InteractionCommandBuilder()
            .setName('now-playing')
            .setDescription('Shows the currently playing song.')
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member as GuildMember;

                if (!member || !interaction.guild) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))] });
                
                const queue = musicClient.player?.getQueue(interaction.guild.id);
                if (!queue || queue.destroyed) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('noQueue'))] });

                const nowPlaying = queue.nowPlaying();
                if (!nowPlaying) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('notPlaying'))] });

                const embed = new MessageEmbed()
                    .setTitle(nowPlaying.title)
                    .setThumbnail(nowPlaying.thumbnail)
                    .setURL(nowPlaying.url)
                    .setColor('BLUE')
                    .setDescription(`Requested by: **${nowPlaying.requestedBy.tag}** \n\`${nowPlaying.duration}\` **` + queue.createProgressBar({
                        length: 30,
                        line: '-',
                        indicator: '●'
                    }) + `**`);

                return interaction.reply({ embeds: [embed] });
            }),
        new MessageCommandBuilder()
            .setName('np')
            .setDescription('Shows the currently playing song.')
            .setExecute(async command => {
                const message = command.message;
                const member = message.member as GuildMember;

                if (!member || !message.inGuild()) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))]});

                const queue = musicClient.player?.getQueue(message.guildId);

                if (!queue || queue.destroyed) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('noQueue'))] });
                
                const nowPlaying = queue.nowPlaying();
                if (!nowPlaying) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('notPlaying'))] });

                const embed = new MessageEmbed()
                    .setTitle(nowPlaying.title)
                    .setThumbnail(nowPlaying.thumbnail)
                    .setURL(nowPlaying.url)
                    .setColor('BLUE')
                    .setDescription(`Requested by: **${nowPlaying.requestedBy.tag}** \n\`${nowPlaying.duration}\` **` + queue.createProgressBar({
                        length: 30,
                        line: '-',
                        indicator: '●'
                    }) + `**`);

                return message.reply({ embeds: [embed] });
            })
    ];
}
