const { MessageEmbed } = require('discord.js');
const SafeMessage = require('../scripts/safeMessage');
const { SlashCommandBuilder } = require('@discordjs/builders');
const RandomAnimals = require('random-animals-api');

function Create() {
    let config = {};
    this.versions = ['1.1.0', '1.1.1', '1.1.2'];

    this.start = (client, action, conf, lang) => { config = conf; return true; }

    this.execute = async (args, message) => {
        await SafeMessage.reply(message, { embeds: [await getDog()]});
    }

    this.slash = {
        command: new SlashCommandBuilder()
            .setName('dog')
            .setDescription('Get random dog'),
        async execute(interaction) {
            await interaction.reply({ embeds: [await getDog()] });
        }
    }

    async function getDog(){
        const dog = await RandomAnimals.dog();
        if(!dog) return new messageEmbed().setTitle('Couldn\'t find dog');

        return new MessageEmbed()
            .setTitle('Alpha arf arf!')
            .setColor(config.embedColor)
            .setImage(dog);
    }
}

module.exports = new Create();