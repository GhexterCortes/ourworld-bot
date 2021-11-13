const MessageCommandBuilder = require('../../scripts/messageCommandBuilder');
const InteractionCommandBuilder = require('../../scripts/interactionCommandBuilder');

module.exports.start = (Client, config) => {
    
}
module.exports.commands = [
    new MessageCommandBuilder()
        .setName('antivpn')
        .setDescription('Anti VPN')
        .setExecute(async (args, message, Client) => {

        })
];