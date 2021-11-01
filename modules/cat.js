const { MessageEmbed } = require('discord.js');
const SafeMessage = require('../scripts/safeMessage');
const { SlashCommandBuilder } = require('@discordjs/builders');
const RandomAnimals = require('random-animals-api');

function Create() {
    let config = {};
    this.versions = ['1.1.0', '1.1.1', '1.1.2'];

    this.start = (client, action, conf, lang) => { config = conf; return true; }

    this.execute = async (args, message) => {
        await SafeMessage.reply(message, { embeds: [await getCat()]});
    }

    this.slash = {
        command: new SlashCommandBuilder()
            .setName('cat')
            .setDescription('Get random cat'),
        async execute(interaction) {
            await interaction.reply({ embeds: [await getCat()] });
        }
    }

    async function getCat(){
        const cat = await RandomAnimals.cat();
        if(!cat) return new messageEmbed().setTitle('Couldn\'t find cat');

        return new MessageEmbed()
            .setTitle('Meow!')
            .setColor(config.embedColor)
            .setImage(cat);
    }
}

module.exports = new Create();