const SafeMessage = require('../../scripts/safeMessage');
const { replaceAll } = require('fallout-utility');
const { MessageEmbed } = require('discord.js');
const { getRandomKey } = require('fallout-utility');

module.exports = async (message, config, Client) => {
    const punishment = config.punishment;
    const reply = config.reply;
    const member = await getMember(message, Client);

    if(!punishment.enabled) return;

    // Send reply
    if(reply.enabled) await sendReply(reply, message.channel, member);

    // Send direct message
    if(punishment.dmMember.enabled && member) await SafeMessage.send(member, getRandomKey(punishment.dmMember.message));

    // Ban member
    if(punishment.banMember) await ban(member, punishment.reason);

    // Delete message
    if(message.content) await SafeMessage.delete(message);
}

async function ban(member, reason) {
    if(!member || !member.bannable) return false;
    return member.ban({ reason: getRandomKey(reason) }).catch(err => console.error(err));
}

async function sendReply(config, channel, member) {
    if(!channel || !member) return false;
    let description = getRandomKey(config.description);
        description = replaceAll(description, '%username%', member.user.tag);
        description = replaceAll(description, '%userid%', member.user.id);
        description = replaceAll(description, '%channel%', channel.name);


    const embed = new MessageEmbed()
        .setAuthor({ name: getRandomKey(config.title) })
        .setDescription(description)
        .setFooter({ text: getRandomKey(config.footer) })
        .setColor(getRandomKey(config.embedColor));

    if(config.addTimestamp) embed.setTimestamp();


    const reply = await SafeMessage.send(channel, { embeds: [embed] });

    if(!config.autoDeleteMessage.enabled) return false;

    setTimeout(() => {
        SafeMessage.delete(reply);
    }, config.autoDeleteMessage.timeMilliseconds);
}

async function getMember(message, Client) {
    const guild = message?.guildId;
    const member = message?.author.id;

    if(!guild || !member) return false;
    
    const cache = Client.guilds.cache.get(guild).members.cache.get(member);
    return cache ? cache : false;
}