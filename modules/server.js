const fetch = require("node-fetch");
const { MessageEmbed } = require('discord.js');

module.exports = new Create();

function Create() {
    this.start = function() { return true; }
    this.execute = async function(args, message, action, client) {
        console.log(args);
        if(args.lenght == 0) { action.reply(message, 'Incomplete args lenght!').catch(e => console.error); return false; }

        const IP = args[0];

        if(IP === '') { action.reply(message, 'Incomplete args!').catch(e => console.error); return false; }

        const reply = await message.channel.send('Loading...').catch(e => console.error);
        
        
        let interval = setInterval(async () => {
            const embed = await fetchAPI(IP);
            await reply.edit({ content: ' ', embeds: [embed]}).catch(err => { console.error(err); clearInterval(interval);});
        }, 3000);

        async function fetchAPI(ip) {
            try {
                const response = await fetch(`https://api.mcsrvstat.us/2/${ip}`);
                const data = await response.json();

                let motd = typeof data.motd.clean[0] === 'string' ? data.motd.clean[0] : '';
                    motd += typeof data.motd.clean[1] === 'string' ? '\n' + data.motd.clean[1] : '';

                const status = {
                    "online": "<:online:853258979907469322> Online",
                    "offline": "<:crashed:853258980066852896> Offline"
                }
            
                const embed = new MessageEmbed()
                            .setAuthor(`${ip} status`)
                            .addField('Status', data.online ? status['online'] : status['offline'], true)
                            .addField('Players', data.players.online ? `${data.players.online}/${data.players.max}` : `0`, true)
                            .addField('Version', data.version ? data.version : 'Unknown', true)
                            .setFooter('Last updated').setTimestamp();

                if(motd != '') embed.setDescription(motd);
                
                return embed;
            } catch (err) {
                console.error(err);
            }
        }
    }
}