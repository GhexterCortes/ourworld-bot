const Lyrics = require('genius-lyrics');
const SafeMessage = require('../scripts/safeMessage');
const { MessageEmbed } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders')

const Genius = new Lyrics.Client();

function Create() {
    this.versions = ['1.1.2'];
    this.arguments = {
        query: {
            required: true
        }
    };
    this.start = (client, action, conf, lang) => {
        return true;
    }

    this.execute = async (args, message, client, action) => {
        if(!args[0]) {
            return SafeMessage.reply(message, 'Enter your query');
        }

        const reply = await SafeMessage.reply(message, 'Searching...');
        const query = args.join(' ');

        const embed = await parseAll(query);

        return SafeMessage.edit(reply, { content: ' ', embeds: [ embed ] });
    }

    this.slash = {
        command: new SlashCommandBuilder()
            .setName('lyrics')
            .setDescription('Searches for lyrics of a song')
            .addStringOption(query => query.setName('query').setDescription('Search query').setRequired(true)),
        async execute(interaction, client, action) {
            interaction.deferReply();

            const query = interaction.options.getString('query');
            const embed = await parseAll(query);

            return interaction.editReply({ embeds: [ embed ] });
        }
    }
}

async function searchSong(query) {
    const search = await Genius.songs.search(query);
    return search ? search : false;
}

async function parseLyrics(song) {
    const lyrics = await song.lyrics();
    return typeof lyrics === 'string' ? lyrics : false;
}

// a function that will bold words that are in brackets
function bold(str) {
    return str.replace(/\[([^\]]+)\]/g, '**$1**');
}

// a function that will limit string length to a certain amount of characters
function limit(str, l) {
    return str.length > l ? str.substring(0, l) + '...' : str;
}

async function parseAll(query) {
    const song = await searchSong(query);
    let lyrics = song[0] ? await parseLyrics(song[0]) : false;

    if(!lyrics || lyrics.length < 1) {
        return new MessageEmbed().setTitle('No lyrics found');
    }

    const embed = new MessageEmbed()
            .setAuthor(song[0].fullTitle, null, song[0].url)
            .setDescription(limit(bold(lyrics), 4095));
    
    if(song[0].thumbnail) embed.setThumbnail(song[0].thumbnail);

    return embed;
}

module.exports = new Create();