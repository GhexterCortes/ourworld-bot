const Fs = require('fs');
const Yml = require('yaml');
const SafeMessage = require('../scripts/safeMessage');
const Util = require('fallout-utility');

let enabled = true;
let cache = {};
let config = GetConfig('./config/antiSwear.yml');

class EditCache {
    setCache(name, value) {
        cache[name] = value;
        return cache[name];
    }

    getCache(name) {
        return cache[name];
    }

    clearCache(name) {
        if(name && cache[name]) { delete cache[name]; }
        cache = {};
        return cache;
    }

    addCache(name, value) {
        if(cache[name]) cache[name] = this.getCache(name) + value;
        else cache[name] = value;
        return cache[name];
    }
}

const data = new EditCache();

class Create {
    constructor() {
        this.versions = ['1.1.2'];
        this.arguments = {
            'action': {
                required: true,
                values: ['toggle', 'clear']
            }
        }
    }

    async start(Client, conf, lang) {
        Client.on('messageCreate', (message) => {
            if(!config.enabled || message.channelId !== config.chatsChannelIf || message.author.id !== config.botId) return;
            const msg = message.content.toLowerCase();
            const name = getName(message.content);
            const swearWords = config.bannedWords.map(str => str.toLowerCase());

            if(!name || config.blacklistNames.find(Name => name === Name)) return;

            // count matched words
            let count = data.addCache(name, 0);
            swearWords.forEach(word => {
                if(!config.matchWordOnly){
                    if(msg.includes(word)) count++;
                } else {
                    if(msg.includes(` ${word} `) || msg.includes(` ${word}`) || msg.includes(`${word} `)) count++;
                }
            });
            data.setCache(name, count);

            count = count.toString();
            if(!config.levels[count]) return;

            if(typeof config.levels[count].chatMessage === 'string') SafeMessage.send(message.channel, Util.replaceAll(config.levels[count].chatMessage, '%name%', name));
            if(typeof config.levels[count].chatMessage === 'object') for(let key of config.levels[count].chatMessage) { SafeMessage.send(message.channel, Util.replaceAll(key, '%name%', name)); }

            if(typeof config.levels[count].consoleMessage === 'string') send(config.consoleChannelId, Util.replaceAll(config.levels[count].consoleMessage, '%name%', name));
            if(typeof config.levels[count].consoleMessage === 'object') for(let key of config.levels[count].consoleMessage) { send(config.consoleChannelId, Util.replaceAll(key, '%name%', name)); }

            async function send(id, sendMessage) {
                return SafeMessage.send(Client.channels.cache.get(id), sendMessage);
            }
            
        });
        return true;
    }

    async execute(args, message, Client) {
        if(!args.length) return;
        if(args.length && args[0].toLowerCase() == 'toggle') {
            if(config.enabled) {
                config.enabled = false;
                SafeMessage.send(message.channel ,`Anti-Swear has been disabled.`);
            } else {
                config.enabled = true;
                SafeMessage.send(message.channel ,`Anti-Swear has been enabled.`);
            }
        } else {
            if(config.enabled) {
                if(args[1]) {
                    data.clearCache(args[1]);
                    SafeMessage.send(message.channel ,`Cleared checks for ${args[1]}`);
                } else {
                    data.clearCache();
                    SafeMessage.send(message.channel ,`Anti-Swear checks has been cleared.`);
                }
            } else {
                SafeMessage.send(message.channel ,`Anti-Swear disabled! Turn it on to run this action`);
            }
        }
    }
}

function getName(chat) {
    return chat?.replace(/\\(\*|_|`|~|\\)/g, '$1')?.split('>')?.shift()?.trim()?.split(' ')?.pop();
}
function GetConfig(location) {
    const defaultConfig = {
        "enabled": true,
        "botId": "",
        "consoleChannelId": "",
        "chatsChannelIf": "",
        "bannedWords": ['fuck', 'dick', 'pussy', 'nigga', 'nigger'],
        "levels": {
            1: {
                "chatMessage": "%name%, Watch your words. It may be inappropriate for someone.",
                "consoleMessage": "warn %name% Excessive profanity."
            },
            3: {
                "chatMessage": "%name%, Shall avoid from using lewd words exceedingly.",
                "consoleMessage": "tempban %name% 30s Desist from using too much obscene words."
            },
            8: {
                "chatMessage": "%name%, You are being banned for excessive profanity.",
                "consoleMessage": "ban %name% You are being banned for excessive profanity."
            }
        },
        "blacklistNames": [],
        "matchWordOnly": false
    }

    if(!Fs.existsSync(location)) Fs.writeFileSync(location, Yml.stringify(defaultConfig));

    return Yml.parse(Fs.readFileSync(location, 'utf-8'));
}

function validateUrl(url) {
    const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    return !!pattern.test(url);
}

module.exports = new Create();