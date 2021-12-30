const Fetcher = require('node-fetch');
const SafeMessage = require('../scripts/safeMessage');
const SafeInteract = require('../scripts/safeInteract');
const MessageCommandBuilder = require('../scripts/messageCommandBuilder');
const InteractionCommandBuilder = require('../scripts/interactionCommandBuilder');
const { MessageEmbed } = require('discord.js');

class Create {
    constructor() {
        this.versions = ['1.4.1', '1.4.4'];
        this.commands = [
            new MessageCommandBuilder()
                .setName('wiki')
                .setDescription('Search the Minecraft Wiki')
                .addArgument('query', true, 'The query to search for')
                .setExecute(async (args, message, Client) => SafeMessage.reply(message, await get(args.join(' '), Client))),
            new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('wiki')
                    .setDescription('Search the Minecraft Wiki')
                    .addStringOption(query => query.setName('query').setDescription('The query to search for').setRequired(true))
                )
                .setExecute(async (interaction, Client) => SafeInteract.reply(interaction, await get(interaction.options.getString('query'), Client)))
        ];
    }

    async start(Client) {
        return true;
    }
}

async function search(query) {
    if(!query) return null;

    const res = await Fetcher(`https://minecraft.fandom.com/api.php?action=opensearch&search=${ encodeURIComponent(query.toString().trim()) }&limit=2&namespace=0&format=json`);
    const data = await res.json();

    return typeof data[1][0] === 'string' ? data[1][0] : null;
}
async function extract(title) {
    if(!title) return null;

    const res = await Fetcher(`https://minecraft.fandom.com/api.php?action=query&prop=extracts&format=json&exintro=true&explaintext=true&titles=${ encodeURIComponent(title) }`);
    const data = await res.json();
    const item = data?.query.pages[Object.keys(data.query.pages)[0]];

    return typeof item === 'object' && item.extract.trim() != '' ? item : null;
}
async function get(query, Client) {
    const title = await search(query);
    const page = await extract(title);
    const embed = new MessageEmbed().setColor(Client.AxisUtility.getConfig().embedColor);
    if(!page) return { content: ' ', embeds: [embed.setTitle('No results found.').setColor( Client.AxisUtility.getConfig().embedColor )] };

    embed.setAuthor({ name: page.title, url: `https://minecraft.fandom.com/wiki/${ encodeURIComponent(page.title) }`});
    embed.setDescription(trim(limitNewLines(page.extract), 4090));
    embed.setFooter({ text: 'Minecraft Wiki'});

    return { content: ' ', embeds: [embed] };
}

function trim(str, max) {
    return str.length > max ? str.substr(0, max) + '...' : str;
}
function limitNewLines(str) {
    str = str.replace(/\n{5,}/g, '\n\n');
    return str.replace(/\n/g, '\n\n');
}

module.exports = new Create();