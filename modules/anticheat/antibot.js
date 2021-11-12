const MessageCommandBuilder = require('../../scripts/messageCommandBuilder');
const InteractionCommandBuilder = require('../../scripts/interactionCommandBuilder');

module.exports.executeMessageCommand = (args, message, Client) => {}
module.exports.executeInteractionCommand = (interaction, Client) => {}
module.exports.commands = [
    new MessageCommandBuilder()
        .setName('antibot')
        .setDescription('Anti Bot')
        .setExecute(async (args, message, Client) => AntiBot.executeMessageCommand(args, message, Client)),
    new InteractionCommandBuilder()
        .setCommand(SlashCommandBuilder => SlashCommandBuilder
            .setName('antibot')
            .setDescription('Anti Bot')
        )
        .setExecute(async (interaction, Client) => AntiBot.executeInteractionCommand(interaction, Client))
];