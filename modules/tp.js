const Yml = require('yaml');
const { replaceAll, getRandomKey } = require('fallout-utility');
const MakeConfig = require('../scripts/makeConfig');
const SafeMessage = require('../scripts/safeMessage');

let responses = [];

class Teleport {
    constructor() {
        responses = this.getResponses('./config/teleport.yml');
        this.versions = ['1.4.2'];
    }

    start(Client) {
        const phrase = 'tp me to';

        Client.on('messageCreate', async (message) => {
            if(!message.content.trim().toLowerCase().startsWith(phrase)) return;

            const user = message.content.trim().slice(phrase.length).trim();
            let userInfo = null;

            if(user.length == 0) return this.sendError(message, getRandomKey(responses.error.mention));
            if(message.mentions.users.size == 0) {
                userInfo = await this.fetchUser(user, Client);
            } else {
                userInfo = !message.mentions.users.first().system ? message.mentions.users.first() : null;
            }

            if(!userInfo) return SafeMessage.reply(message, getRandomKey(responses.error.noUserFound));
            if(userInfo.id == message.author.id) return SafeMessage.reply(message, getRandomKey(responses.error.self));

            const reply = await this.sendBuffer(message, userInfo, getRandomKey(responses.teleporting));
            if(reply) return SafeMessage.edit(reply, replaceAll(replaceAll(getRandomKey(responses.teleported), '{author}', message.author.username), '{user}', userInfo.username));
        });

        return true;
    }

    async fetchUser(user, Client) {
        if(!user.match(/^[0-9]+$/) && !user.match(/[a-zA-Z]+#[\d]+/i)) return false;
          
        // get user information from cache by id discord.js
        if(user.match(/^[0-9]+$/)) {
            const userInfo = await Client.users.cache.get(user);
            return userInfo ? userInfo : false;
        } else if (user.match(/[a-zA-Z]+#[\d]+/i)) {
            const userData = user.split('#').map(item => item.trim());

            const userInfo = await Client.users.cache.find(fetchUser => fetchUser.username == userData[0] && fetchUser.discriminator == replaceAll(userData[1], '#', ''));
            return userInfo ? userInfo : false;
        }

        return false;
    }

    async sendBuffer(message, user, buffer) {
        const reply = await SafeMessage.reply(message, '`Loading...`');

        buffer = buffer.sort(() => Math.random() - 0.5);
        buffer = buffer.map(response => {
            response = replaceAll(response, '{author}', message.author.username);
            response = replaceAll(response, '{user}', user.username);

            return response;
        });

        for (const value of buffer) {
            await SafeMessage.edit(reply, value);
            await this.sleep(1000);
        }

        return reply;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async sendError(message, error) {
        const reply = await SafeMessage.reply(message, error);
        setTimeout(async () => SafeMessage.delete(reply), 5000);
    }

    getResponses(location) {
        return Yml.parse(MakeConfig(location, {
            teleporting: [
                [
                    'Starting teleport to {user}',
                    'Getting ready {author}',
                    'A **REAL** teleportation is about to happen {author}!',
                    'Locating where tf is {user}',
                    'Hold on tight bitch, {author}',
                    'Building some command blocks because u **sus**',
                    'Teleporting to {user}'
                ]
            ],
            teleported: [
                'You have been teleported to {user}.',
                '{author} has been teleported to {user}.',
                '{author} has teleported to you {user}.',
            ],
            error: {
                noUserFound: 'Mention a user to teleport to.',
                mention: 'Mention a user to teleport to.',
                self: 'You can\'t teleport to yourself.',
            }
        }))
    }
}

module.exports = new Teleport();