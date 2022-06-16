import { InteractionCommandBuilder, MessageCommandBuilder, RecipleScript, version } from 'reciple';
import { Message, MessageEmbed, MessageActionRow, MessageButton, InteractionReplyOptions } from 'discord.js';
import { Economy } from './economy/economy';
import { errorEmbed } from './_errorEmbed';
import { EconomyUser } from './economy/User';

export class EconomyPlugin implements RecipleScript {
    public versions: string[] = ['1.3.x', '1.4.x'];
    public commands: (MessageCommandBuilder | InteractionCommandBuilder)[] = [];
    public economy: Economy = require('./economy.a.main');

    public onStart() {
        this.commands = [
            new InteractionCommandBuilder()
                .setName('withdraw-items')
                .setDescription('Withdraw items from your balance')
                .setExecute(async command => {
                    const interaction = command.interaction;
                    const user_id = interaction.user.id;

                    await interaction.deferReply();

                    const user = await this.economy.getUser(user_id).catch(() => null);
                    if (!user) return interaction.editReply({ embeds: [errorEmbed('You are not registered')] });
                    if (user.banned) return interaction.editReply({ embeds: [errorEmbed('You are banned')] });
                    if (!this.economy.isServerOnline()) return interaction.editReply({ embeds: [errorEmbed('Server is offline')] });

                    this.economy.logger.debug(`User ${user_id} requested withdraw items embed`);

                    const data = this.createShopEmbed(user);
                    await interaction.editReply(data);

                    const reply = await interaction.fetchReply() as Message;
                    if (!reply) return interaction.editReply({ embeds: [errorEmbed('An error occured')] });

                    const collector = reply.createMessageComponentCollector({
                        filter: (component) => component.customId.startsWith('withdraw_') && component.user.id === user_id,
                        time: 30000
                    });

                    collector.on('collect', async (component) => {
                        const itemId = parseInt(component.customId.split('_')[1]);
                        const item = this.economy.config.withdrawItems[itemId];
                        if (!item) {
                            await component.reply({ embeds: [errorEmbed('Invalid Item')], ephemeral: true });
                            return;
                        }

                        if (component.deferred) await component.deferUpdate().catch(() => {});
                        const balance = user.getBalance();

                        if (balance < item.price) {
                            await component.reply({ embeds: [errorEmbed('You do not have enough balance')], ephemeral: true });
                            return;
                        }

                        this.economy.logger.debug(`User ${user_id} requested withdraw item ${item.item}`);

                        await component.reply({ embeds: [errorEmbed(`You have withdrawn **${item.count}** ${item.item}`, true, false)], ephemeral: true });
                        await this.economy.sendToConsoleChannels(`give ${user.playername} ${item.item} ${item.count}`);
                        user.setBalance(balance - item.price);

                        if (data.embeds) data.embeds[0].description = `Balance: **${user.getBalance()}** 🪙\n\nMake sure you're in-game before withdrawing items.`;
                        
                        await interaction.editReply(data);
                    });
                    collector.on('end', async () => {
                        await reply.edit({ components: [] }).catch(() => {});
                    });
                })
        ];

        return !!this.economy.client;
    }

    public createShopEmbed(user: EconomyUser): InteractionReplyOptions {
        const embed = new MessageEmbed()
            .setAuthor({ name: 'Withdraw Items' })
            .setDescription(`Balance: **${user.getBalance()}** 🪙\n\nMake sure you're in-game before withdrawing items.`)
            .setColor('GREEN');
        
        const buttons = new MessageActionRow();

        let id = 0;
        for (const item of this.economy.config.withdrawItems) {
            embed.addField(item.label, `${item.emoji} \`${item.item} (${item.count})\` \n🪙 **${item.price}**`);
            buttons.addComponents([
                new MessageButton()
                    .setLabel(item.label)
                    .setEmoji(item.emoji)
                    .setStyle('PRIMARY')
                    .setCustomId(`withdraw_${id}`)
            ]);

            id++;
        }

        return {
            embeds: [embed],
            components: [buttons]
        };
    }
}

export default new EconomyPlugin();
