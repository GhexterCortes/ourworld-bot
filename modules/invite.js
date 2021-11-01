const SafeMessage = require('../scripts/safeMessage');
const { SlashCommandBuilder } = require('@discordjs/builders');

function Create() {
    this.versions = ['1.1.0','1.1.1'];

    this.start = () => true;

    this.execute = async (args, message, client, action) => {
        await SafeMessage.reply(message, `**Invite:** ${action.createInvite(client)}`)
    }

    this.slash = {
        command: new SlashCommandBuilder()
            .setName('invite')
            .setDescription('Get bot invite'),
        async execute(interaction, client, action) {
            await interaction.reply(`**Invite:** ${action.createInvite(client)}`);
        }
    }
}

module.exports = new Create();