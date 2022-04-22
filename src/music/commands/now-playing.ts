import { GuildMember, MessageEmbed } from 'discord.js';
import { InteractionCommandBuilder } from 'reciple';
import { MusicPlayer } from '../../music-player';
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
            })
    ];
}