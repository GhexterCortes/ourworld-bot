import { InteractionCommandBuilder, MessageCommandBuilder, RecipleScript, version } from 'reciple';
import { Economy } from './economy/economy';
import { errorEmbed } from './_errorEmbed';

export class EconomyPlugin implements RecipleScript {
    public versions: string[] = [version];
    public commands: (MessageCommandBuilder|InteractionCommandBuilder)[] = [];
    public economy: Economy = require('./economy.a.main');

    public onStart() {
        this.commands = [
            new InteractionCommandBuilder()
                .setName('send-balance')
                .setDescription('Send your balance to another user')
                .addUserOption(user => user
                    .setName('user')
                    .setDescription('The user to send your balance to')
                    .setRequired(true)    
                )
                .addNumberOption(amount => amount
                    .setName('amount')
                    .setDescription('The amount to send')
                    .setMinValue(1)
                    .setRequired(true)    
                )
                .setExecute(async command => {
                    const interaction = command.interaction;
                    const to = interaction.options.getUser('user', true);

                    await interaction.deferReply();

                    const player = await this.economy.getUser(interaction.user.id).catch(() => undefined);
                    if (!player) return interaction.editReply({ embeds: [errorEmbed(`You're not registered`)] });

                    const user = to ? await this.economy.getUser(to.id).catch(() => undefined) : undefined;
                    if (!user) return interaction.editReply({ embeds: [errorEmbed(user ? `**${to?.tag}** is not registered` : `Can't find opponent's account`, false, false)] });

                    const amount = player.getBalance() - interaction.options.getNumber('amount', true);
                    if (amount < 0) return interaction.editReply({ embeds: [errorEmbed('You don\'t have enough balance')] });

                    player.setBalance(amount);
                    user.setBalance(user.getBalance() + (interaction.options.getNumber('amount') ?? 0));

                    this.economy.logger.debug(`User ${player.playername} sent ${user.playername} ${interaction.options.getNumber('amount')} 🪙`);

                    await interaction.editReply({
                        embeds: [
                            errorEmbed(`Sent **${interaction.options.getNumber('amount')}** 🪙 to **${to?.tag}**`, true, false)
                        ]
                    });
                })
        ];

        return !!this.economy;
    }
}

export default new EconomyPlugin();
