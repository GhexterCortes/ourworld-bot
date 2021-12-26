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
                if(word.indexOf('eli') > -1 || word.indexOf('elijah') > -1 || word.indexOf('elijahh') > -1 || word.indexOf('elijahh1') > -1 || word.indexOf('gheli') > -1) return true;
                if(word.indexOf('xae') > -1 || word.indexOf('abby') > -1 || word.indexOf('xaecortes') > -1 || word.indexOf('xaecortes_yt') > -1) return true;

                return false;
            });

            if(filter.length) {
                const reply = await SafeMessage.reply(message, 'sas words! **' + filter.join(', ') + '**');
                await SafeMessage.delete(message);
                setTimeout(async () => {
                    await SafeMessage.delete(reply);
                }, 5000);
            }
        });

        return true;
    }
}

module.exports = new BannedWords();