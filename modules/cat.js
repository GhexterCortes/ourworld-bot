const { MessageEmbed } = require('discord.js');
const SafeMessage = require('../scripts/safeMessage');
const { SlashCommandBuilder } = require('@discordjs/builders');
const RandomCats = require('random-cat');

function Create() {
    let config = {};
    this.versions = ['1.1.0', '1.1.0'];

    this.start = (client, action, conf, lang) => { config = conf; return true; }

    this.execute = async (args, message) => {
        await SafeMessage.reply(message, getCat());
    }

    this.slash = {
        command: new SlashCommandBuilder()
            .setName('cat')
            .setDescription('Get random cat'),
        async execute(interaction) {
            await interaction.reply({ embeds: [getCat()] });
        }
    }

    function getCat(){
        const cat = RandomCats.get();
        if(!cat) return new messageEmbed().setTitle('Couldn\'t find cat');

        return new MessageEmbed()
            .setTitle('Meow!')
            .setColor(config.embedColor)
            .setImage(cat)
            .setTimestamp();
    }
}

module.exports = new Create();