const config = require('./anti-scam/config.js');
const { getRandomKey, replaceAll } = require('fallout-utility');
const SafeMessage = require('../scripts/safeMessage');
const { MessageEmbed } = require('discord.js');

const autoDetect = require('./anti-scam/autoDetect');
const domainDetect = require('./anti-scam/domainDetect');
const punishment = require('./anti-scam/punishment');

class Create {
    constructor() {
        this.versions = ['1.4.1', '1.4.2']
    }

    async start(Client) {
        Client.on('messageCreate', async (message) => {
            if(!config.punishment.ignoreBots && (message.author.bot || message.author.system) || message.author.id == Client.user.id) return;

            const detection = {
                autoDetect: autoDetect(message, config),
                domainDetect: domainDetect(message, config)
            };

            if(detection.autoDetect || detection.domainDetect) {
                await punishment(message, config, Client);
            }
        });

        return true;
    }
}

module.exports = new Create();