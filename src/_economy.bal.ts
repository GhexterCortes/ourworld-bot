import { InteractionCommandBuilder, MessageCommandBuilder, RecipleScript, version } from 'reciple';
import { MessageEmbed } from 'discord.js';
import { Economy } from './economy/economy';
import { errorEmbed } from './_errorEmbed';
import { replaceAll } from 'fallout-utility';

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

                    this.economy.logger.debug(`User ${user_id} requested balance info`);

                    const balance = user.getBalance();
                    const embed = new MessageEmbed()
                        .setAuthor({ name: 'Balance' })
                        .setColor('GREEN')
                        .setDescription(`You have **${balance}** 🪙`);
                    
                    await interaction.editReply({ embeds: [embed] });
                }),
            // new MessageCommandBuilder()
            //     .setName('addbal')
            //     .setDescription('Add money to a user')
            //     .addOption(user => user
            //         .setName('user')
            //         .setDescription('The user to add money to')
            //         .setRequired(true)
            //     )
            //     .addOption(amount => amount
            //         .setName('amount')
            //         .setDescription('The amount to add')
            //         .setRequired(true)
            //         .setValidator(amount => parseInt(amount, 10) > 0 && parseInt(amount) < 1000000)    
            //     )
            //     .setExecute(async command => {
            //         const user = command.command.args ? replaceAll(command.command.args[0], ['<@', '>'], ['', '']) : '';
            //         const message = command.message;

            //         const user_id = message.mentions.repliedUser?.id ?? message.client.users.cache.find(u => u.id === user || u.tag === user)?.id ?? await message.client.users.fetch(user)?.catch(() => undefined).then(u => u?.id) ?? undefined;
            //         if (!user_id) return message.channel.send({ embeds: [errorEmbed('Invalid user')] });

            //         const amount = command.command.args ? parseInt(command.command.args[1]) : 0;
            //         if (!amount) return message.channel.send({ embeds: [errorEmbed('Invalid amount '+ amount)] });

            //         const player = await this.economy.getUser(user_id);
            //         if (!player) return message.channel.send({ embeds: [errorEmbed('User is not registered')] });

            //         const balance = player.getBalance() + amount;
            //         player.setBalance(balance);
                    
            //         await message.channel.send({ embeds: [errorEmbed(`Added **${amount}** 🪙 to **${player.playername}**`, true, false)] });
            //     })
        ];

        return !!this.economy.client;
    }
}

module.exports = new EconomyPlugin();