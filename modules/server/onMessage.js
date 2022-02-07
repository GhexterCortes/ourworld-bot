const Ping = require('./ping');
const { replaceAll, getRandomKey, isNumber } = require('fallout-utility');
const { MessageEmbed } = require('discord.js');
const { SafeMessage } = require('../../scripts/safeActions');

const cache = {};

module.exports = function (Client, config) {
    if(!config.autoEmbedIp.enabled) return;
    
    Client.on('messageCreate', async message => {
        if(!message.content
            ||
            config.autoEmbedIp.ignoreBots && (message.author.bot || message.author.system)
            ||
            message.author.id === Client.user.id
            ||
            !checkChannel(message.channelId, config.autoEmbedIp.allowedChannelIds)
        ) return;

        const ip = getIp(message.content);
        if(!ip) return config.autoEmbedIp.requireServerIP ? sendError(getRandomKey(config.messages.noIpProvided), message, config.messages.embedColors['error'], true, true) : false;

        await addServer(ip, message, config);
    });
}

// Main server updates
async function addServer(ip, message, config) {
    if(config.autoEmbedIp.disableMultipleUpload && findCache(message.author.id, message.channelId)) return sendError(getRandomKey(config.messages.alreadyUploaded), message, config.messages.embedColors['error'], true, true);
    insertCache(message.author.id, message.channelId);

    const embed = new MessageEmbed().setAuthor({ name: displayIp(ip) }).setColor(config.messages.embedColors['buffer']);
    const reply = await sendError(getRandomKey(config.messages.pending), message, config.messages.embedColors['buffer']);

    let errors = 0;
    await updateServer();

    // Update loop
    async function updateServer() {
        if(deleted(message) || deleted(reply)) return deleteReply(true);
        if(message.edit && !getIp(message.content)) { return deleteReply(true); } else { ip = getIp(message.content); }
        const server = await Ping(ip);

        if(!server || server.players?.max == 0) return updateError();

        let description = placeholders(config.messages.serverEmbedDescription, server, ip);

        embed.setAuthor({ name: displayIp(ip) });
        embed.setColor(config.messages.embedColors['online']);
        embed.setDescription(description);
        embed.setFooter({ text: `${message.author.tag} • ${ server.latency }ms`, iconURL: message.author.displayAvatarURL() });

        if(await SafeMessage.edit(reply, { content: ' ', embeds: [embed] })) {
            errors = 0;
            return updateServer();
        } else {
            return deleteReply(true);
        }
    }

    async function updateError() {
        if(config.autoEmbedIp.fetchErrorLimit && errors >= config.autoEmbedIp.fetchErrorLimit) return deleteReply(true);
        errors++;

        await sendUpdateError(getRandomKey(config.messages.connectionError));
        await updateServer();
    }

    async function sendUpdateError(error) {
        const errorEmbed = new MessageEmbed().setColor(config.messages.embedColors['error']);
        if(/[\n]/m.test(error)) { errorEmbed.setDescription(error); } else { errorEmbed.setAuthor({ name: error }); }

        return SafeMessage.edit(reply, {
            content: ' ',
            embeds: [
                errorEmbed
            ]
        });
    }

    async function deleteReply(removeUserChannelCache = true) {
        if(removeUserChannelCache) removeCache(message.author.id, message.channelId);
        if(config.autoEmbedIp.deleteAfterInactive && !deleted(message)) await SafeMessage.delete(message);
        if(!deleted(reply)) await SafeMessage.delete(reply);
    }
}

// User id cache
function findCache(userid, channelid) {
    if(!cache.hasOwnProperty(userid)) return false;
    if(!cache[userid].includes(channelid)) return false;

    return true;
}

function insertCache(userid, channelid) {
    if(!cache[userid]) cache[userid] = [];
    cache[userid] = [...cache[userid], channelid];

    return true;
}

function removeCache(userid, channelid) {
    if(!cache[userid]) cache[userid] = [];
    cache[userid] = cache[userid].filter(channel => channel.toString() !== channelid);

    return true;
}

// Other utility functions
function placeholders(description, server, ip) {
    description = replaceAll(description, '%players_online%', server.players.online);
    description = replaceAll(description, '%players_max%', server.players.max);
    description = replaceAll(description, '%ip%', ip);
    description = replaceAll(description, '%server_version%', removeColorId(server.version.name));
    description = replaceAll(description, '%server_version_raw%', server.version.name);
    description = replaceAll(description, '%server_motd%', removeColorId( (server.motd ? server.motd : '') ));
    description = replaceAll(description, '%server_motd_raw%', (server.motd ? server.motd : ''));

    return description;
}

function getIp(content) {
    content = content.toString().trim().toLowerCase().replace(/\\(\*|_|`|~|\\)/g, '$1');
    content = replaceAll(content, '\\', '');
    content = replaceAll(content, '\n', ' ').split(' ');

    const matches = [];
    for (const w of content) {
        const parse = parseIp(w);
        if(parse) matches.push(parse);
    }


    function parseIp(word) {
        word = word.split(':');
        if(!word.length) return false;

        let match = word[0].match(/^(([a-zA-Z]{1})|([a-zA-Z]{1}[a-zA-Z]{1})|([a-zA-Z]{1}[0-9]{1})|([0-9]{1}[a-zA-Z]{1})|([a-zA-Z0-9][a-zA-Z0-9-_]{1,61}[a-zA-Z0-9]))\.([a-zA-Z]{2,6}|[a-zA-Z0-9-]{2,30}\.[a-zA-Z]{2,3})$/m);
        if(match) return addPort(match[0], word[1]);

        let ipv4 = word[0].match(/\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b/m);
        if(ipv4) return addPort(ipv4[0], word[1]);

        return false;

        function addPort(host, port) {
            let n = host;
            if(isNumber(port) && parseInt(port) >= 0 && parseInt(port) <= 65535) n += ':' + port;

            return n;
        }
    }

    return matches.length ? matches.pop() : false;
}

function checkChannel(channelId, allowedChannelIds) {
    return typeof allowedChannelIds.find(channel => channel.toString() === channelId) !== 'undefined' ? true : false;
}

async function sendError(message, source, embedColor, autoDeleteReply, deleteOriginalMessage) {
    message = replaceAll(message, '%username%', source.author.username);
    message = replaceAll(message, '%userid%', source.author.id);
    

    const embed = new MessageEmbed().setColor(embedColor);

    if(/[\n]/m.test(message)) { embed.setDescription(message); } else { embed.setAuthor({ name: message }); }
    
    const reply = await SafeMessage.send(source.channel, { content: ' ', embeds: [embed] });
    if(deleteOriginalMessage) await SafeMessage.delete(source);
    if(autoDeleteReply) setTimeout(() => SafeMessage.delete(reply), 5000);

    return reply;
}

function deleted(message) {
    const channel = message ? message.channel : null;
    const targetMessage = channel ? channel.messages.cache.get(message.id) : false;

    return targetMessage ? false : true;
}

function removeColorId(text) {
    return text.replace(/§./g, "");
}

function displayIp(ip) {
    ip = ip.split(':');
    return ip[0] ? ip[0] : 'Unknown';
}