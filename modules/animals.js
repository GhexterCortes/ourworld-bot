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
                .addArgument('caption', false, 'Set custom caption')
                .setExecute(async (args, message) => {
                    const caption = args ? args.join(' ') : null;
                    return SafeMessage.reply(message, await getDog(caption));
                }),
            new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('dog')
                    .setDescription('Get random dog')    
                    .addStringOption(caption => caption
                        .setName('caption')
                        .setDescription('Set custom caption')
                        .setRequired(false)    
                    )
                )
                .setExecute(async (interaction) => {
                    const caption = interaction.options.getString('caption');
                    return SafeInteract.reply(interaction, await getDog(caption));
                })
        ]
    
        async function getDog(caption) {
            const dog = await RandomAnimalsAPI.dog();
            
            if(!dog) return { embeds: [ new MessageEmbed().setTitle(config) ] };
    
            return { embeds: [
                new MessageEmbed()
                    .setTitle(caption ? caption : getRandomKey(config.animals.dog.textTitle))
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
                .addArgument('caption', false, 'Set custom caption')
                .setExecute(async (args, message) => {
                    const caption = args ? args.join(' ') : null;
                    return SafeMessage.reply(message, await getCat(caption));
                }),
            new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('cat')
                    .setDescription('Get random cat')    
                    .addStringOption(caption => caption
                        .setName('caption')
                        .setDescription('Set custom caption')
                        .setRequired(false)    
                    )
                )
                .setExecute(async (interaction) => {
                    const caption = interaction.options.getString('caption');
                    SafeInteract.reply(interaction, await getCat(caption));
                })
        ]
    
        async function getCat(caption) {
            const cat = await RandomAnimalsAPI.cat();
            
            if(!cat) return { embeds: [ new MessageEmbed().setTitle(config) ] };
    
            return { embeds: [
                new MessageEmbed()
                    .setTitle(caption ? caption : getRandomKey(config.animals.cat.textTitle))
                    .setImage(cat)
                    .setColor(Client.AxisUtility.get().config.embedColor)
            ] };
        }
    }
}

module.exports = new RandomAnimals();