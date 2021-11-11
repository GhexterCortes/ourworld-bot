const Yml = require('yaml');
const MakeConfig = require('../scripts/makeConfig');
const MessageCommandBuilder = require('../scripts/messageCommandBuilder');
const InteractionCommandBuilder = require('../scripts/interactionCommandBuilder');

const defaultConfig = {
    // Server and Bot ingormations
    serverBotId: '',
    consoleChannelId: '',
    messagesChannelId: '',

    // Messages
    messages: {
        // Anti Bot
        underBotAttack: "Bot username keyword detected.\n**Server Under Bot Attack enabled!**\n```yml\nTurning on whitelist\n```",
        underBotAttackConsoleCommands: ['whitelist on', 'whitelist reload'],
        botAttackCooldownMessage: "Resetting bot name detection.\n**Server bot name detection reset!**\n```yml\nTurning off whitelist\n```",
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
        botNameKeywords: ['McDown', 'McDown_pw'],
    }
}
let config = Yml.parse(MakeConfig('./config/anticheat.yml', defaultConfig));

class Create {
    constructor() {
        this.versions = ['1.4.1'];
    }

    async start(Client) {
        return true;
    }
}

module.exports = new Create();