import { GuildMember, MessageEmbed } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder } from 'reciple';
import { MusicPlayer } from '../../music-player';
import { errorEmbed } from '../../_errorEmbed';
import { Client as Genius, Song } from 'genius-lyrics';

export default function (musicClient: MusicPlayer) {
    const genius = new Genius();

    const searchSong = async (song: string) => {
        const songs = await genius.songs.search(song).catch(() => undefined);

        return songs ? songs[0] : undefined;
    }

    const getLyrics = async (song?: Song) => {
        if (!song) return undefined;

        return song.lyrics().catch(() => undefined);
    }

    const splitString = (str: string, maxLength: number) => {
        let split = [];
        let i = 0;
        while (i < str.length) {
            split.push(str.substring(i, i += maxLength));
        }
        return split;
    }
    
    const makeBold = (str: string) => {
        return str.replace(/\[([^\]]+)\]/g, '**$1**');
    }

    const fetchLyricsEmbed = async (query: string) => {
        const song = await searchSong(query);
        const lyrics = await getLyrics(song);

        if (!lyrics) return;

        const splitedLyrics = splitString(lyrics, 4000);

        return splitedLyrics.map((lyrics, i) => {
            const embed = new MessageEmbed()
                .setColor('BLUE')
                .setAuthor({ name: song?.artist.name ?? 'unknown artist', iconURL: song?.artist.thumbnail })
                .setThumbnail(song?.thumbnail ?? '')
                .setURL(song?.url ?? '')
                .setFooter({ text: `Lyrics provided by Genius`, iconURL: 'https://images.genius.com/ba9fba1d0cdbb5e3f8218cbf779c1a49.300x300x1.jpg' });

            if (!i) embed.setTitle(makeBold(song?.title ?? query));
            
            embed.setDescription(makeBold(lyrics));
            return embed;
        });
    }

    return [
        new InteractionCommandBuilder()
            .setName('lyrics')
            .setDescription('Searches for lyrics for the current song.')
            .addStringOption(query => query
                .setName('query')
                .setDescription('Query the lyrics instead')
                .setRequired(false)    
            )
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member as GuildMember;

                if (!member || !interaction.guild) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))] });

                const queue = musicClient.player?.getQueue(interaction.guild.id);
                const query = interaction.options.getString('query');

                if ((!queue || queue.destroyed) && !query) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('noQueue'))] });

                const title = query || queue?.nowPlaying().title;
                if (!title) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('noQuery'))] });

                await interaction.deferReply();

                const lyrics = await fetchLyricsEmbed(title);
                if (!lyrics) return interaction.editReply({ embeds: [errorEmbed(musicClient.getMessage('noResult', title), false, false)] });

                return interaction.editReply({ embeds: lyrics });
            }),
        new MessageCommandBuilder()
            .setName('lyrics')
            .setDescription('Searches for lyrics for the current song.')
            .addOption(query => query
                .setName('query')
                .setDescription('Query the lyrics instead')
                .setRequired(false)    
            )
            .setExecute(async command => {
                const message = command.message;
                const member = message.member as GuildMember;

                if (!member || !message.inGuild()) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))]});

                const queue = musicClient.player?.getQueue(message.guildId);
                const query = command.command.args ? command.command.args.join(' ') : undefined;

                if ((!queue || queue.destroyed) && !query) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('noQueue'))] });
                
                const title = query || queue?.nowPlaying().title;
                if (!title) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('noQuery'))] });

                const lyrics = await fetchLyricsEmbed(title);
                if (!lyrics) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('noResult', title), false, false)] });

                return message.reply({ embeds: lyrics });
            })
    ];
}