const { ping } = require('minecraft-protocol');
const Util = require('fallout-utility');
const Yml = require('yaml');
const { MessageEmbed, version } = require('discord.js');
const MakeConfig = require('../scripts/makeConfig');
const SafeMessage = require('../scripts/safeMessage');
const SafeInteract = require('../scripts/safeInteract');
const MessageCommandBuilder = require('../scripts/messageCommandBuilder');
const InteractionCommandBuilder = require('../scripts/interactionCommandBuilder');

const colors = {
    "online": "#43b582"
}
const log = new Util.Logger('ServerPing');
const scriptConfig = getConfig('./config/serverPinger.yml');

class Create {
    constructor() {
        this.versions = ['1.4.1'];
    }

    async start(Client) {
        Client.on('messageCreate', async (message) => {
            if(scriptConfig.allowedChannels.length > 0 && !scriptConfig.allowedChannels.find(channel => channel.toString() === message.channelId)) return;
            if(scriptConfig.disableBots && (message.author.system || message.author.bot) || message.content == '' || message.author.id === Client.user.id) return;

            const IP = getServer(message.content);
            if(!IP) return;

            await pingServer(IP, Client, message);
        });
        return true;
    }
}

function getServer(string) {
    let match = string.match(/[a-zA-Z0-9]+.aternos.me/m) ? string.match(/[a-zA-Z0-9]+.aternos.me/m)[0] : false;
    if(match) return match; 

    match = string.match(/server: [a-zA-Z.]+/m);
    if(match) return match[0].split(':')[1].trim();

    return false;
}

async function pingServer(IP, Client, message) {
    const embed = new MessageEmbed().setAuthor(IP);
    const reply = await SafeMessage.send(message.channel, '`'+ IP +'`\nPinging server...');

    await updateServer();
    async function updateServer() {
        if(message.deleted) return SafeMessage.delete(reply);
        const server = await ping({ host: IP, closeTimeout: 5000 }).catch(err => { log.error(err); });

        if(!server || server.description === '§4Server not found.' || server.version.name === "§4● Offline") return SafeMessage.delete(reply);

        let description = `This server is **online**.\n**${ server.players.online }/${ server.players.max }** players playing on **${ removeColorId(server.version.name) }**`;

        embed.setColor(colors['online']);
        embed.setDescription(description);
        embed.setFooter(`${message.author.tag} • ${ server.latency }ms`, message.author.displayAvatarURL());
        
        if(await SafeMessage.edit(reply, { content: ' ', embeds: [embed] })) updateServer();
    }
}

function removeColorId(text) {
    return text.replace(/§./g, "");
}

function getConfig(location) {
    const config = {
        allowedChannels: [],
        bannedIps: [],
        disableBots: true
    };

    return Yml.parse(MakeConfig(location, config));
}

module.exports = new Create();