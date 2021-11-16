const Yml = require('yaml');
const RandomAnimals = require('random-animals-api');
const MakeConfig = require('../scripts/makeConfig');
const SafeMessage = require('../scripts/safeMessage');
const SafeInteract = require('../scripts/safeInteract');
const { MessageEmbed } = require('discord.js');
const { getRandomKey } = require('fallout-utility');
const MessageCommandBuilder = require('../scripts/messageCommandBuilder');
const InteractionCommandBuilder = require('../scripts/interactionCommandBuilder');

const defaultConfig = {
    animals: {
        cat: {
            enabled: true,
            textTitle: 'A cat'
        },
        dog: {
            enabled: true,
            textTitle: 'A dog'
        }
    },
    noResultsMessage: 'Nothing found.'
}

let config = Yml.parse(MakeConfig('./config/randomAnimals.yml', defaultConfig));

class Create {
    constructor() {
        this.versions = ['1.4.1'];
        this.commands = [];
    }

    async start(Client) {
        const setDog = dogCommand(Client);
        const setCat = catCommand(Client);
        
        this.commands = setDog ? this.commands.concat(setDog) : this.commands;
        this.commands = setCat ? this.commands.concat(setCat) : this.commands;

        return true;
    }
}

function dogCommand(Client) {
    if(!config.animals.dog.enabled) return false;

    return [
        new MessageCommandBuilder()
            .setName('dog')
            .setDescription('Get random dog')
            .setExecute(async (args, message) => SafeMessage.reply(message, await getDog())),
        new InteractionCommandBuilder()
            .setCommand(SlashCommandBuilder => SlashCommandBuilder
                .setName('dog')
                .setDescription('Get random dog')    
            )
            .setExecute(async (interaction) => SafeInteract.reply(interaction, await getDog()))
    ]

    async function getDog() {
        const dog = await RandomAnimals.dog();
        
        if(!dog) return { embeds: [ new MessageEmbed().setTitle(config) ] };

        return { embeds: [
            new MessageEmbed()
                .setTitle(getRandomKey(config.animals.dog.textTitle))
                .setImage(dog)
                .setColor(Client.AxisUtility.getConfig().embedColor)
        ] };
    }
}

function catCommand(Client) {
    if(!config.animals.cat.enabled) return false;

    return [
        new MessageCommandBuilder()
            .setName('cat')
            .setDescription('Get random cat')
            .setExecute(async (args, message) => SafeMessage.reply(message, await getCat())),
        new InteractionCommandBuilder()
            .setCommand(SlashCommandBuilder => SlashCommandBuilder
                .setName('cat')
                .setDescription('Get random cat')    
            )
            .setExecute(async (interaction) => SafeInteract.reply(interaction, await getCat()))
    ]

    async function getCat() {
        const cat = await RandomAnimals.cat();
        
        if(!cat) return { embeds: [ new MessageEmbed().setTitle(config) ] };

        return { embeds: [
            new MessageEmbed()
                .setTitle(getRandomKey(config.animals.cat.textTitle))
                .setImage(cat)
                .setColor(Client.AxisUtility.getConfig().embedColor)
        ] };
    }
}

module.exports = new Create();