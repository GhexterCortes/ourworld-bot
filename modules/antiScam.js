const config = require('./anti-scam/config.js');
const { getRandomKey, replaceAll } = require('fallout-utility');
const SafeMessage = require('../scripts/safeMessage');
const { MessageEmbed } = require('discord.js');

class Create {
    constructor() {
        this.versions = ['1.4.1']
    }

    async start(Client) {
        Client.on('messageCreate', async (message) => {
            if (!config.blacklistedDomains.some(word => message.content.toLowerCase().includes(word))) return;
            SafeMessage.delete(message);

            if(config.reply.enabled) {
                const description = replaceAll(replaceAll(getRandomKey(config.reply.description), '%username%', message.author.username), '%userid%', message.author.id);
                const embed = new MessageEmbed()
                    .setTitle(getRandomKey(config.reply.title))
                    .setColor(Client.AxisUtility.getConfig().embedColor)
                    .setDescription(description)
                    .setFooter(getRandomKey(config.reply.footer));
                
                if(config.reply.addTimestamp) embed.setTimestamp();

                SafeMessage.send(message.channel, { embeds: [embed] });
            }

            if(config.banOffenders.enabled) {
                if(!message.member || !message.member.bannable) return;
                message.member.ban({ reason: getRandomKey(config.banOffenders.reason) }).catch(err => console.error(err));
            }
        });

        return true;
    }
}

module.exports = new Create();