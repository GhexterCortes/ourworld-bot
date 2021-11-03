const Fetch = require('node-fetch');
const SafeMessage = require('../scripts/safeMessage');
const { MessageEmbed } = require('discord.js');

function Create() {
    this.versions = ['1.1.2'];
    this.start = () => true;
    this.execute = async (args, message, client, action) => {
        let skin = args.join(' ');
        if (skin.length < 1) {
            return SafeMessage.send(message.channel, 'Please provide a skin name.');
        }
        let url = `https://api.mojang.com/users/profiles/minecraft/${skin}`;
        Fetch(url)
            .then(res => { try { return res.json() } catch (e) { SafeMessage.send(message.channel, 'Invalid skin name.'); return {id: null}; } })
            .then(json => {
                if (!json || json?.id == null) {
                    return SafeMessage.send(message.channel, 'Skin not found.');
                }
                let uuid = json.id;
                let skinUrl = `https://crafatar.com/renders/body/${uuid}?overlay`;
                Fetch(skinUrl)
                    .then(res => res.buffer())
                    .then(buffer => {
                        let embed = new MessageEmbed()
                            .setTitle(`Skin for ${skin}`)
                            .setImage(`attachment://skin.png`)
                            .setColor('#0099ff');
                        SafeMessage.send(message.channel, { files: [{ attachment: buffer, name: 'skin.png' }], embeds: [embed] });
                    });
            });
    }
}

module.exports = new Create();