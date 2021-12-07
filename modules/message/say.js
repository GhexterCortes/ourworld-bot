const InteractionCommandBuilder = require('../../scripts/interactionCommandBuilder');
const SafeMessage = require('../../scripts/safeMessage');
const SafeInteract = require('../../scripts/safeInteract');

module.exports = new InteractionCommandBuilder()
    .setCommand(SlashCommandBuilder => SlashCommandBuilder
        .setName('say')
        .setDescription('Says something')
        .addStringOption(text => text
            .setName('text')
            .setDescription('The text to say')
            .setRequired(true)    
        )    
    )
    .setExecute(async (interaction, Client) => {
        const text = interaction.options.getString('text');
        
        await SafeInteract.deferReply(interaction, { ephemeral: true });
        const message = await SafeMessage.send(interaction.channel, text);

        if(!message) {
            await SafeInteract.editReply(interaction, 'I could not send the message!');
        } else {
            await SafeInteract.editReply(interaction, 'Message sent!');
        }
    });