const MessageCommandBuilder = require('../../scripts/messageCommandBuilder');
const InteractionCommandBuilder = require('../../scripts/interactionCommandBuilder');

module.exports.executeMessageCommand = (args, message, Client) => {}
module.exports.executeInteractionCommand = (interaction, Client) => {}
module.exports.commands = [
    new MessageCommandBuilder()
        .setName('antivpn')
        .setDescription('Anti VPN')
        .setExecute(async (args, message, Client) => AntiVPN.executeMessageCommand(args, message, Client)),
    new InteractionCommandBuilder()
        .setCommand(SlashCommandBuilder => SlashCommandBuilder
            .setName('antivpn')
            .setDescription('Anti VPN')
        )
        .setExecute(async (interaction, Client) => AntiVPN.executeInteractionCommand(interaction, Client))
];