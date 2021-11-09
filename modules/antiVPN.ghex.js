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

            if(!validateIPaddress(ip)) { console.log(ip); return; }

            const GetName = getName(message.content);
            let name = GetName ? GetName : null;
            console.log(`${ip} - ${name} (${fetched}) joined!`);

            // a function to check if the ip is vpn or not
            if(!config.enabled) return;
            const check = await register.check(ip, { vpn: true });

            if(check.status == 'ok' && check[ip]?.proxy === 'yes') {
                console.log(`IP ${ip} is detected using vpn/proxy`);
                console.log(check);
                
                setTimeout(async () => {
                    for(const msg of config.proxyMessage) {
                        await message.channel.send(replaceAll(replaceAll(msg, '%name%', name), '%ip%', ip));
                    }
                }, 1000)
            } else {
                console.log(ip + ' is not detected using vpn/proxy');
                console.log(check);
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
        "proxyMessage": ['kick %name% This ip is detect using VPN or proxy.'],
        "key": ""
    }

    if(!Fs.existsSync(location)) Fs.writeFileSync(location, Yml.stringify(defaultConfig));

    return Yml.parse(Fs.readFileSync(location, 'utf-8'));
}
function getName(input) {
    input = input.replace(/\\(\*|_|`|~|\\)/g, '$1');
    const regex = /[a-zA-Z0-9_]+\[\/\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b:[0-9]+\]/gmi;
    let match = input.match(regex);

    console.log(match, ' [Object Data]');
    if(typeof match === 'object' && match?.length) { match = match.shift(); }
    return typeof match === 'string' ? match.split('[/').shift() : false;
}


module.exports = new Create();