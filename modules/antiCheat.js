const Yml = require('yaml');
const MakeConfig = require('../scripts/makeConfig');

const AntiVPN = require('./anticheat/antivpn');
const AntiBot = require('./anticheat/antibot');

const defaultConfig = {
    // Server and Bot ingormations
    serverBotId: '',
    consoleChannelId: '',
    messagesChannelId: '',

    // Messages
    messages: {
        // Anti Bot
        underBotAttackMessage: ["Bot username keyword detected.\n**Server Under Bot Attack enabled!**\n```yml\nTurning on whitelist\n```"],
        underBotAttackConsoleCommands: ['whitelist on', 'whitelist reload'],
        botAttackCooldownMessage: ["Resetting bot name detection.\n**Server bot name detection reset!**\n```yml\nTurning off whitelist\n```"],
        botAttackCooldownCommands: ['whitelist off', 'whitelist reload'],

        // Anti VPN
        proxyDetectedMessage: ['kick %name% This ip is detect using VPN or proxy.']
    },

    // Anti VPN
    antiVPN: {
        enabled: true,
        APIKey: ''
    },

    // Anti Bot
    antiBot: {
        enabled: true,
        cooldown: 60000,
        botNameKeywords: ['McDown', 'McDown_pw'],
    }
}
let config = Yml.parse(MakeConfig('./config/anticheat.yml', defaultConfig));

class Create {
    constructor() {
        this.versions = ['1.4.1', '1.4.4'];
        this.commands = createCommands();
    }

    async start(Client) {
        AntiVPN.start(Client, config);
        AntiBot.start(Client, config);

        return true;
    }
}

function createCommands() {
    let commands = [];

    if(config.antiVPN.enabled) 
        commands = commands.concat(AntiVPN.commands);
    if(config.antiBot.enabled)
        commands = commands.concat(AntiBot.commands);
    
    return commands;
}

module.exports = new Create();