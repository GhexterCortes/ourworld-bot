const SafeMessage = require('../scripts/safeMessage');

class BannedWords {
    constructor() {
        this.versions = ['1.4.4'];
    }

    start(Client) {
        Client.on('messageCreate', async (message) => {
            const content = message.content.toLowerCase().trim().split(' ').map(word => word.trim());

            if ((message.author.bot || message.author.system) || !content.length) return;

            const filter = content.filter(word => {
                if(word == 'eli' || word == 'elijah' || word == 'elijahh' || word == 'elijahh1') return true;
                if(word == 'xae' || word == 'abby' || word == 'xaecortes' || word == 'xaecortes_yt') return true;

                return false;
            });

            if(filter.length) {
                const reply = await SafeMessage.reply(message, 'sas words! **' + filter.join(', ') + '**');
                setTimeout(async () => {
                    await SafeMessage.delete(reply);
                    await SafeMessage.delete(message);
                }, 5000);
            }
        });

        return true;
    }
}

module.exports = new BannedWords();