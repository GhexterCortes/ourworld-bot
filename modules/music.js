const Lyrics = require('genius-lyrics');
const { MessageEmbed } = require('discord.js');
const { SafeInteract, SafeMessage } = require('../scripts/safeActions');
const { InteractionCommandBuilder, MessageCommandBuilder } = require('../scripts/builders');

const Genius = new Lyrics.Client();

class Create {
    constructor() {
        this.versions = ['1.6.0'];
        this.commands = [
            new MessageCommandBuilder()
                .setName('lyrics')
                .setDescription('Get the lyrics of a song')
                .addArgument('query', true, 'Search query')
                .setExecute(async (args, message, Client) => {
                    if(!args.length) return;
                    
                    const reply = await SafeMessage.reply(message, 'Searching for lyrics...');

                    args = args.join(' ');
                    let color = Client.AxisUtility.get().config.embedColor;
                    let lyrics = await getReply(args, color);
                        if(!lyrics || !lyrics.length) lyrics = [ new MessageEmbed().setTitle('No lyrics found') ];

                    await SafeMessage.edit(reply, { content: ' ', embeds: lyrics });
                }),
            new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('lyrics')
                    .setDescription('Get the lyrics of a song')
                    .addStringOption(query => query.setName('query').setDescription('Search query').setRequired(true))    
                )
                .setExecute(async (interaction, Client) => {
                    await SafeInteract.deferReply(interaction);

                    let args = interaction.options.getString('query');
                    let color = Client.AxisUtility.get().config.embedColor;
                    let lyrics = await this.getReply(args, color);
                        if(!lyrics || !lyrics.length) lyrics = [ new MessageEmbed().setTitle('No lyrics found') ];

                    await SafeInteract.editReply(interaction, { content: ' ', embeds: lyrics });
                })
        ];
    }

    async onStart(Client) {
        return true;
    }

    async getReply(query, embedColor) {
        const song = await this.searchSong(query);
        const lyrics = song ? await this.getLyrics(song[0]) : false;
        if(!lyrics) return [ new MessageEmbed().setTitle('No lyrics found') ];
    
        let embeds = [];
        let setTitle = false;
    
        for(const content of lyrics) {
            const embed = new MessageEmbed().setDescription(content);
    
            if(song[0].thumbnail && !setTitle) embed.setThumbnail(song[0].thumbnail);
            if(!setTitle) { setTitle = true; embed.setAuthor({ name: song[0].fullTitle, url: song[0].url }); }
            if(embedColor) embed.setColor(embedColor);
    
            embeds.push(embed);
        }
    
        return embeds;
    }

    async getLyrics(song) {
        let lyrics = song ? await this.parseLyrics(song) : false;
            lyrics = lyrics ? bold(lyrics) : lyrics;
            lyrics = lyrics ? splitString(lyrics, 4094) : lyrics;
    
        return lyrics;
    
        function bold(str) {
            return str.replace(/\[([^\]]+)\]/g, '**$1**');
        }
    }

    async searchSong(query) {
        try {
            const search = await Genius.songs.search(query);
            return search ? search : [];
        } catch(err) {
            console.error(err);
            return [];
        }
    }

    async parseLyrics(song) {
        const lyrics = await song.lyrics();
        return typeof lyrics === 'string' ? lyrics : false;
    }
}

// function to split a string into an array of strings, each of which is no longer than maxLength
function splitString(str, maxLength) {
    let split = [];
    let i = 0;
    while (i < str.length) {
        split.push(str.substring(i, i += maxLength));
    }
    return split;
}

module.exports = new Create();