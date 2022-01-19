const Tiktok = require('tiktok-scraper-without-watermark');
const { SafeMessage, SafeInteract } = require('../scripts/safeActions');
const { replaceAll } = require('fallout-utility');
const { Attachment, MessageEmbed } = require('discord.js');

class Tangina {
    constructor() {
        this.versions = ['1.6.0','1.6.1'];
    }

    onStart(Client) {
        return true;
    }

    onLoad(Client) {
        Client.on('messageCreate', async (message) => {
            if(message.author.bot || message.author.system) return;
            const contents = replaceAll(message.content, '\n', ' ').toLowerCase().split(' ');

            let sent = false;
            for (const content of contents) {
                if(!this.isUrl(content)) continue;

                try {
                    const video = await Tiktok.tiktokdownload(content).catch(err => false);
                    console.log(video, content);

                    if(!video?.nowm) continue;

                    const reply = await SafeMessage.reply(message, {
                        files: [
                            {
                                attachment: video.nowm,
                                name: 'tiktok.mp4',
                            }
                        ]
                    });

                    if(reply) sent = true;
                } catch (err) {
                    console.log(err);
                }
            }

            // remove attachments 
            if(sent) {
                await message.removeAttachments().catch(err => false);
                await message.suppressEmbeds().catch(err => false);
            }
        });
    }

    isUrl(str) {
        return (str.toLowerCase().startsWith('https://') || str.toLowerCase().startsWith('http://')) && str.toLowerCase().indexOf('tiktok.com') > -1;
    }
}

module.exports = new Tangina();