const InteractionCommandBuilder = require('../scripts/interactionCommandBuilder');
const SafeInteract = require('../scripts/safeInteract');

class NewCmd {
    constructor() {
        this.versions = ['1.4.2'];
        this.commands = [
            new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('say')
                    .setDescription('Says something')
                    .addStringOption(message => message
                        .setName('message')
                        .setDescription('The message to say')
                        .setRequired(true)    
                    )
                )
                .setExecute(async (interaction, Client) => {
                    await SafeInteract.deferReply(interaction, { ephemeral: true })
                    await SafeInteract.editReply(interaction, 'This command was moved to `/send say text:'+ interaction.options.getString('message') +'`');
                })
        ]
    }

    async start(Client) { return true; }
}

module.exports = new NewCmd();