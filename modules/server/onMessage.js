const Ping = require('./ping');
const { replaceAll, getRandomKey } = require('fallout-utility');
const { MessageEmbed } = require('discord.js');
const SafeMessage = require('../../scripts/safeMessage');
const SafeInteract = require('../../scripts/safeInteract');

const cache = {};

module.exports = function (Client, config) {
    if(!config.autoEmbedIp.enabled) return;
    
    Client.on('messageCreate', async message => {
        if(!message.content
            ||
            ignoreBots && (message.author.bot || message.author.system)
            ||
            message.author.id === Client.user.id
            ||
            !checkChannel(message.channelId, config.autoEmbedIp.allowedChannelIds)
        ) return;

        const ip = getIp(message.content);
        if(!ip) return config.autoEmbedIp.requireServerIP ? sendError(getRandomKey(config.messages.noIpProvided), message, true, true) : false;

        await addServer(ip, message, config);
    });
}

// Main server updates
async function addServer(ip, message, config) {
    if(config.autoEmbedIp.disableMultipartUpload && findCache(message.author.id, message.channelId)) return sendError(getRandomKey(config.messages.alreadyUploaded), message, true, true);
    insertCache(message.author.id, message.channelId);

    const embed = new MessageEmbed().setAuthor(ip).setColor(config.messages.embedColors['buffer']);
    const reply = await SafeMessage.send(message.channel, { content: ' ', embeds: [ embed.setDescription(getRandomKey(config.messages.pending)) ]});

    let errors = 0;
    await updateServer();

    // Update loop
    async function updateServer() {
        if(message.deleted || reply?.deleted) return deleteReply(true);
        const server = await Ping(ip);

        if(!server) return updateError();

        let description = placeholders(config.messages.serverEmbedDescription, server, ip);

        embed.setColor(config.messages.embedColors['online']);
        embed.setDescription(description);
        embed.setFooter(`${message.author.tag} • ${ server.latency }ms`, message.author.displayAvatarURL());

        if(await SafeMessage.edit(reply, { content: ' ', embeds: [embed] })) {
            errors = 0;
            await updateServer();
        }
    }

    async function updateError() {
        if(config.autoEmbedIp.fetchErrorLimit && errors >= config.autoEmbedIp.fetchErrorLimit) return deleteReply(true);
        errors++;

        await sendUpdateError(getRandomKey(config.messages.connectionError));
        await updateServer();
    }

    async function sendUpdateError(error) {
        return SafeMessage.edit(reply, {
            content: ' ',
            embeds: [
                new MessageEmbed().setAuthor(error).setColor(config.messages.embedColors['error'])
            ]
        });
    }

    async function deleteReply(removeUserChannelCache = true) {
        if(removeUserChannelCache) removeCache(message.author.id, message.channelId);
        if(config.autoEmbedIp.deleteAfterInactive) await SafeMessage.delete(message);
        await SafeMessage.delete(reply);
    }
}

// User id cache
function findCache(userid, channelid) {
    if(!cache[userid]) return false;
    if(!cache[userid][channelid]) return false;

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
    content = content.trim().toLowerCase().replace(/\\(\*|_|`|~|\\)/g, '$1');

    let match = content.match(/[a-zA-Z0-9_-]+.aternos.me/m) ? content.match(/[a-zA-Z0-9_-]+.aternos.me/m)[0] : false;
    if(match) return match; 

    match = string.match(/(ip|server): ([a-zA-Z0-9._-]+)/m) ? string.match(/(ip|server): ([a-zA-Z0-9._-]+)/m) : false;
    if(match) return match[0].split(':')[1].trim();

    return false;
}

function checkChannel(channelId, allowedChannelIds) {
    return typeof allowedChannelIds.find(channel => channel.toString() === channelId) !== 'undefined' ? true : false;
}

async function sendError(message, source, embedColor, autoDeleteReply, deleteOriginalMessage) {
    message = replaceAll(message, '%username%', source.author.username);
    message = replaceAll(message, '%userid%', source.author.id);
    
    const embed = new MessageEmbed()
        .setColor(embedColor)
        .setAuthor(message);

    const reply = await SafeMessage.send(source.channel, { content: ' ', embeds: [embed] });
    if(deleteOriginalMessage) await SafeMessage.delete(source);
    if(autoDeleteReply) setTimeout(() => SafeMessage.delete(reply), 5000);
}

function removeColorId(text) {
    return text.replace(/§./g, "");
}