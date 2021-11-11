const Yml = require('yaml');
const RandomAnimals = require('random-animals-api');
const MakeConfig = require('../scripts/makeConfig');
const MessageCommandBuilder = require('../scripts/messageCommandBuilder');
const InteractionCommandBuilder = require('../scripts/interactionCommandBuilder');

const defaultConfig = {
    enableAnimals: {
        cat: true,
        dog: true,
        fox: true,
        horse: true,
        pig: true,
        rabbit: true
    }
}
let config = Yml.parse(MakeConfig('./config/randomAnimals.yml', defaultConfig));

class Create {
    constructor() {
        this.versions = ['1.4.1'];
    }

    async start(Client) {
        return true;
    }
}

module.exports = new Create();