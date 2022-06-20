import { QueryType } from 'discord-player';
import { GuildMember, MessageEmbed, User } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder } from 'reciple';
import { MusicPlayer } from '../../_music-player';
import { errorEmbed } from '../../_errorEmbed';

export default function (musicClient: MusicPlayer) {
    const play = async (songQuery: string, user: User) => {
        const fetchedSong = await musicClient.player?.search(songQuery, {
            requestedBy: user,
            searchEngine: QueryType.AUTO 
        }).catch(() => undefined);

        if (!fetchedSong) throw new Error('NOT_FOUND');

        const embed = new MessageEmbed().setColor('BLUE');

        switch (!!fetchedSong.playlist) {
            case true:
                embed.setTitle(fetchedSong.playlist!.title);
                embed.setThumbnail(fetchedSong.playlist!.thumbnail);
                embed.setURL(fetchedSong.playlist!.url);
                embed.setDescription(`**${fetchedSong.tracks.length}** ${fetchedSong.tracks.length > 1 ? 'tracks' : 'track'}`);
                break;
            case false:
                embed.setTitle(fetchedSong.tracks[0].title);
                embed.setThumbnail(fetchedSong.tracks[0].thumbnail);
                embed.setURL(fetchedSong.tracks[0].url);
                break;
        }

        return {
            tracks: fetchedSong.playlist ? fetchedSong.playlist.tracks : [fetchedSong.tracks[0]],
            embed
        };
    }

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
                const song = interaction.options.getString('song', true);

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

                const result = await play(song, interaction.user).catch(() => undefined);
                if (!result || !result.tracks.length) return interaction.editReply({ embeds: [errorEmbed(musicClient.getMessage('noResult', song), false, false)] });

                queue?.addTracks(result.tracks);
                if (!queue?.playing) await queue?.play();

                return interaction.editReply({ embeds: [result.embed] });
            }),
        new MessageCommandBuilder()
            .setName('play')
            .setDescription('Play a song')
            .addOption(song => song
                .setName('song')
                .setDescription('Song to play')
                .setRequired(true)    
            )
            .setExecute(async command => {
                const message = command.message;
                const song = command.command.args?.join(' ') ?? '';
                
                if (!message.inGuild()) return;

                const member = message.member;
                const reply = await message.reply({
                    embeds: [errorEmbed(musicClient.getMessage('seaching'), true)]
                });

                if (!member || member.user.bot) return reply.edit({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))] });
                if (!member.voice.channel) return reply.edit({ embeds: [errorEmbed(musicClient.getMessage('joinVoiceChannel'))] });
                if (message.guild?.me?.voice.channelId && message.guild?.me?.voice.channelId !== member.voice.channelId) return reply.edit({ embeds: [errorEmbed(musicClient.getMessage('joinSameVoiceChannel'))] });

                const queue = musicClient.player?.createQueue(message.guild, {
                    metadata: {
                        channel: message.channel
                    }
                });

                const connection = !queue?.connection ? await queue?.connect(member.voice.channel).catch(() => undefined) : true;
                if (!connection) {
                    queue?.destroy(true);
                    return reply.edit({ embeds: [errorEmbed(musicClient.getMessage('connectionError'))] });
                }

                const result = await play(song, member.user).catch(() => undefined);
                if (!result || !result.tracks.length) return reply.edit({ embeds: [errorEmbed(musicClient.getMessage('noResult', song), false, false)] });

                queue?.addTracks(result.tracks);
                if (!queue?.playing) await queue?.play();

                return reply.edit({ embeds: [result.embed] });
            })
    ];
}
