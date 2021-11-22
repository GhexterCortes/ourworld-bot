const SafeMessage = require('../../scripts/safeMessage');
const { replaceAll } = require('fallout-utility');
const { MessageEmbed } = require('discord.js');
const { getRandomKey } = require('fallout-utility');

module.exports = async (message, config) => {
    const punishment = config.punishment;
    const reply = config.reply;

    if(!punishment.enabled) return;

    // Ban member
    if(punishment.banMember) await ban(message.member, punishment.reason);

    // Send reply
    if(reply.enabled) sendReply(reply, message.channel, message.member);

    // Send direct message
    if(punishment.dmMember.enabled && message.member) await SafeMessage.send(message.member, getRandomKey(punishment.dmMessage.message));

    // Delete message
    if(message.content) await SafeMessage.delete(message);
}

async function ban(member, reason) {
    if(!member || !member.bannable) return;
    return member.ban({ reason: getRandomKey(reason) }).catch(err => console.error(err));
}

async function sendReply(config, channel, member) {
    if(!channel || !member) return;
    let description = config.description;
        description = replaceAll(description, '%username%', member.user.tag);
        description = replaceAll(description, '%userid%', member.user.id);
        description = replaceAll(description, '%channel%', channel.name);


    const embed = new MessageEmbed()
        .setAuthor(getRandomKey(config.title))
        .setDescription(getRandomKey(description))
        .setFooter(getRandomKey(config.footer))
        .setColor(config.embedColor);

    if(config.addTimestamp) embed.setTimestamp();


    const reply = await SafeMessage.send(channel, { embeds: [embed] });

    if(!config.autoDeleteMessage.enabled) return;

    setTimeout(() => {
        SafeMessage.delete(reply);
    }, config.autoDeleteMessage.timeMilliseconds);
}