import { InteractionCommandBuilder, MessageCommandBuilder, RecipleScript, version } from 'reciple';
import { MessageEmbed } from 'discord.js';
import { Economy } from './economy/economy';
import { errorEmbed } from './_errorEmbed';

class EconomyPlugin implements RecipleScript {
    public versions: string[] = [version];
    public commands: (MessageCommandBuilder | InteractionCommandBuilder)[] = [];
    public economy: Economy = require('./economy.a.main');

    public onStart() {
        this.commands = [
            new InteractionCommandBuilder()
                .setName('balance')
                .setDescription('Check your balance')
                .setExecute(async command => {
                    const interaction = command.interaction;
                    const user_id = interaction.user.id;

                    await interaction.deferReply();

                    const user = await this.economy.getUser(user_id).catch(() => null);
                    if (!user) return interaction.editReply({ embeds: [errorEmbed('You are not registered')] });

                    const balance = user.getBalance();
                    const embed = new MessageEmbed()
                        .setAuthor({ name: 'Balance' })
                        .setColor('GREEN')
                        .setDescription(`You have **${balance}** 🪙`);
                    
                    await interaction.editReply({ embeds: [embed] });
                })
        ];

        return !!this.economy.client;
    }
}

module.exports = new EconomyPlugin();