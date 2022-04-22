import { GuildMember, MessageEmbed } from 'discord.js';
import { InteractionCommandBuilder } from 'reciple';
import { MusicPlayer } from '../../music-player';
import { errorEmbed } from '../../_errorEmbed';

export default function (musicClient: MusicPlayer) {
    return [
        new InteractionCommandBuilder()
            .setName('play')
            .setDescription('Play a song')
            .addStringOption(song => song
                .setName('song')
                .setDescription('Song to play')
                .setRequired(true)    
            )
            .setExecute(async command => {
                const interaction = command.interaction;
                const song = interaction.options.getString('song') ?? '';

                await interaction.deferReply();

                const member = interaction.member ? interaction.member as GuildMember : undefined;

                if (!member || !interaction.guild) return interaction.editReply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))] });
                if (!member.voice.channel) return interaction.editReply({ embeds: [errorEmbed(musicClient.getMessage('joinVoiceChannel'))] });
                if (interaction.guild?.me?.voice.channelId && interaction.guild?.me?.voice.channelId !== (interaction.member as GuildMember).voice.channelId) return interaction.editReply({ embeds: [errorEmbed(musicClient.getMessage('joinSameVoiceChannel'))] });

                const queue = musicClient.player?.createQueue(interaction.guild, {
                    metadata: {
                        channel: interaction.channel
                    }
                });

                const connection = !queue?.connection ? await queue?.connect(member.voice.channel).catch(() => undefined) : true;
                if (!connection) {
                    queue?.destroy(true);
                    return interaction.editReply({ embeds: [errorEmbed(musicClient.getMessage('connectionError'))] });
                }

                const result = await musicClient.player?.search(song, {
                    requestedBy: interaction.user
                })
                .catch(() => undefined);

                if (!result || !result.tracks.length) return interaction.editReply({ embeds: [errorEmbed(musicClient.getMessage('noResult', song), false, false)] });

                const embed = new MessageEmbed().setColor('BLUE');

                switch (!!result.playlist) {
                    case true:
                        embed.setTitle(result.playlist!.title);
                        embed.setThumbnail(result.playlist!.thumbnail);
                        embed.setURL(result.playlist!.url);
                        embed.setDescription(`**${result.tracks.length}** ${result.tracks.length > 1 ? 'tracks' : 'track'}`);

                        queue?.addTracks(result.playlist!.tracks);
                        break;
                    case false:
                        embed.setTitle(result.tracks[0].title);
                        embed.setThumbnail(result.tracks[0].thumbnail);
                        embed.setURL(result.tracks[0].url);
                        
                        queue?.addTrack(result.tracks[0]);
                        break;
                }

                if (!queue?.playing) await queue?.play();

                return interaction.editReply({ embeds: [embed] });
            })
    ];
}