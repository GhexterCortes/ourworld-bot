const MemberPermission = require('../scripts/memberPermissions');
const SafeMessage = require('../scripts/safeMessage');

class Spammer {
    constructor() {
        this.versions = ['1.4.2'];
    }

    async start(Client) {
        Client.on('messageCreate', async (message) => {
            if (message.author.bot) return;
            if (message && MemberPermission.admin(message.member)) return;

            // count message pings
            if((message.content.toLowerCase().includes('pls') || message.content.toLowerCase().includes('owo')) && message.mentions.users.size > 0) {
                const reply = await SafeMessage.reply(message, ':no_entry_sign: Avoid pinging people when using bots!');

                setTimeout(async () => SafeMessage.delete(reply), 5000);
            }
        });
        
        return true;
    }
}

module.exports = new Spammer();