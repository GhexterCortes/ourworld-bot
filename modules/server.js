const Server = require('./server/');
const SafeMessage = require('../scripts/safeMessage');
const SafeInteract = require('../scripts/safeInteract');
const MessageCommandBuilder = require('../scripts/messageCommandBuilder');
const InteractionCommandBuilder = require('../scripts/interactionCommandBuilder');

const config = Server.getConfig('./config/serverPinger.yml');

class Create {
    constructor() {
        this.versions = ['1.4.1'];
    }

    async start(Client) {
        this.commands = Server.commands(Client, config); 
        Server.onMessage(Client, config);
    }
}

module.exports = new Create();