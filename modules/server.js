const { ping } = require('minecraft-protocol');
const Util = require('fallout-utility');
const Yml = require('yaml');
const MakeConfig = require('../scripts/makeConfig');
const SafeMessage = require('../scripts/safeMessage');
const SafeInteract = require('../scripts/safeInteract');
const MessageCommandBuilder = require('../scripts/messageCommandBuilder');
const InteractionCommandBuilder = require('../scripts/interactionCommandBuilder');

class Create {
    constructor() {
        this.versions = ['1.4.1'];
    }

    async start(Client) {
        return true;
    }
}

module.exports = new Create();