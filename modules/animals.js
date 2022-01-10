const Yml = require('yaml');
const RandomAnimalsAPI = require('random-animals-api');
const MakeConfig = require('../scripts/makeConfig');
const { MessageEmbed } = require('discord.js');
const { getRandomKey } = require('fallout-utility');
const { SafeMessage, SafeInteract } = require('../scripts/safeActions');
const { MessageCommandBuilder, InteractionCommandBuilder } = require('../scripts/builders');

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

let config = Yml.parse(MakeConfig('./config/randomAnimals/config.yml', defaultConfig));

class RandomAnimals {
    constructor() {
        this.versions = ['1.6.0','1.6.1'];
        this.commands = [];
    }

    async onStart(Client) {
        const setDog = this.dogCommand(Client);
        const setCat = this.catCommand(Client);
        
        this.commands = setDog ? this.commands.concat(setDog) : this.commands;
        this.commands = setCat ? this.commands.concat(setCat) : this.commands;

        return true;
    }

    dogCommand(Client) {
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
            const dog = await RandomAnimalsAPI.dog();
            
            if(!dog) return { embeds: [ new MessageEmbed().setTitle(config) ] };
    
            return { embeds: [
                new MessageEmbed()
                    .setTitle(getRandomKey(config.animals.dog.textTitle))
                    .setImage(dog)
                    .setColor(Client.AxisUtility.get().config.embedColor)
            ] };
        }
    }

    catCommand(Client) {
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
            const cat = await RandomAnimalsAPI.cat();
            
            if(!cat) return { embeds: [ new MessageEmbed().setTitle(config) ] };
    
            return { embeds: [
                new MessageEmbed()
                    .setTitle(getRandomKey(config.animals.cat.textTitle))
                    .setImage(cat)
                    .setColor(Client.AxisUtility.get().config.embedColor)
            ] };
        }
    }
}

module.exports = new RandomAnimals();