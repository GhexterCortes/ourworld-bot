const config = require('./anti-scam/config.js');
const autoDetect = require('./anti-scam/autoDetect');
const domainDetect = require('./anti-scam/domainDetect');
const punishment = require('./anti-scam/punishment');

class AntiScam {
    constructor() {
        this.versions = ['1.6.0', '1.6.1'];
    }

    async onStart(Client) {
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

module.exports = new AntiScam();