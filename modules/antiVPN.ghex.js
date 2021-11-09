const Fs = require('fs');
const Yml = require('yaml');
const Proxy = require('proxycheck-node.js'); 
const { replaceAll } = require('fallout-utility');
const SafeMessage = require('../scripts/safeMessage');

let config = GetConfig('./config/antiVPN.yml');
const register = new Proxy({api_key: config.key});

class Create {
    constructor() {
        this.versions = ['1.1.2'];
        this.arguments = {
            'toggle': {
                required: true
            }
        };
    }

    async start(Client, conf, lang) {
        Client.on("messageCreate", async (message) => {
            if(message.author.id != config.botId || message.channelId != config.consoleChannelId) return;
            if(message.content.indexOf('logged in with entity id') <= -1) return;
            let fetched = getStringInBrackets(message.content);
            let ip = fetched.replace('/', '').split(':')[0];
            let name = getName(message.content);

            if(!validateIPaddress(ip)) { console.log(ip); return; }
            console.log(ip + ' joined!');

            // a function to check if the ip is vpn or not
            if(!config.enabled) return;
            const check = await register.check(ip, { vpn: true });

            if(check.status == 'ok' && check[ip]?.proxy === 'yes') {
                console.log(`IP ${ip} is detected using vpn/proxy`);
                setTimeout(async () => {
                    for(const msg of config.proxyMessage) {
                        await message.channel.send(replaceAll(replaceAll(msg, '%name%', name), '%ip%', ip));
                    }
                }, 1000)
            }
        })
        return true;
    }

    async execute(args, message, Client) {
        if(!args.length || args.length && !args[0].toLowerCase() == 'toggle') return;

        if(config.enabled) 
            config.enabled = false;
        else
            config.enabled = true;

        await SafeMessage.reply(message, 'AntiVPN set to: '+ config.enabled);
    }
}

function getStringInBrackets(input) {
    const regex = /\[\/\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b:[0-9]+\]/mi;
    const match = input.match(regex)[0];

    return replaceAll(replaceAll(match, '[', ''), ']', '');
}
function validateIPaddress(ipaddress) {
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(:[0-9]{1,5})?$/.test(ipaddress)) {
        return true;
    }
    return false;
}
function GetConfig(location) {
    const defaultConfig = {
        "enabled": true,
        "botId": "",
        "consoleChannelId": "",
        "proxyMessage": ['kick %ip% This ip is detect using VPN or proxy.'],
        "key": ""
    }

    if(!Fs.existsSync(location)) Fs.writeFileSync(location, Yml.stringify(defaultConfig));

    return Yml.parse(Fs.readFileSync(location, 'utf-8'));
}
function getName(input) {
    const regex = /[a-zA-Z]+\[\/\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b:[0-9]+\]/gmi;
    const match = input.match(regex)[0].split('[');

    return match[0];
}


module.exports = new Create();