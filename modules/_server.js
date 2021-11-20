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
    "online": "#43b582",
    "offline": "#939393",
    "error": "#ff3838"
}
const log = new Util.Logger('ServerPing');
const scriptConfig = getConfig('./config/serverPinger.yml');

let activeUsers = [];

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
    string = string.trim().toLowerCase().replace(/\\(\*|_|`|~|\\)/g, '$1');

    let match = string.match(/[a-zA-Z0-9_-]+.aternos.me/m) ? string.match(/[a-zA-Z0-9_-]+.aternos.me/m)[0] : false;
    if(match) return match; 

    match = string.match(/server: [a-zA-Z0-9._-]+/m) ? string.match(/server: [a-zA-Z0-9._-]+/m) : false;
    if(match) return match[0].split(':')[1].trim();

    return false;
}

async function pingServer(IP, Client, message) {
    const embed = new MessageEmbed().setAuthor(IP).setColor(colors['offline']);
    const reply = await SafeMessage.send(message.channel, { content: ' ', embeds: [ embed.setDescription('Pinging...') ]});

    if(activeUsers.includes(message.author.id) && scriptConfig.disableMultipleEmbeds) {
        await sendError('You cannot upload server for now.');
        await SafeMessage.delete(message);

        setTimeout(async () => {
            await deleteReply();
        }, 5000);
        return;
    }

    activeUsers.push(message.author.id);
    let errorTried = 0;

    await updateServer();
    async function updateServer() {

        if(message.deleted || reply?.deleted) return deleteReply(true);
        const server = await ping({ host: IP, closeTimeout: 5000 }).catch(err => { log.error(err); });
        const sus = server.motd.

        if(!server || server.description === '§4Server not found.' || server.version.name === "§4● Offline" || server?.players.max == 0) return updateError(server);

        let description = `This server is **online**.\n**${ server.players.online }/${ server.players.max }** players playing on **${ removeColorId(server.version.name) }**`;

        embed.setColor(colors['online']);
        embed.setDescription(description);
        embed.setFooter(`${message.author.tag} • ${ server.latency }ms`, message.author.displayAvatarURL());
        
        if(await SafeMessage.edit(reply, { content: ' ', embeds: [embed] })) {
            errorTried = 0;
            await updateServer();
        }
    }

    async function updateError(server) {
        if(scriptConfig.errorTriesUntilRemove && errorTried > scriptConfig.errorTriesUntilRemove) return deleteReply(true);

        errorTried++;
        await sendError(`Can't connect to server!`);
        
        await updateServer();
    }

    async function sendError(error) {
        return SafeMessage.edit(reply, {
            content: ' ',
            embeds: [
                new MessageEmbed().setAuthor(error).setColor(colors['error'])
            ]
        });
    }

    async function deleteReply(removeUser = false) {
        if(removeUser) activeUsers = activeUsers.filter(user => user !== message.author.id);
        await SafeMessage.delete(reply);
    }
}

function removeColorId(text) {
    return text.replace(/§./g, "");
}

function getConfig(location) {
    const config = {
        allowedChannels: [],
        bannedIps: [],
        errorTriesUntilRemove: 5,
        disableMultipleEmbeds: true,
        disableBots: true
    };

    return Yml.parse(MakeConfig(location, config));
}

module.exports = new Create();