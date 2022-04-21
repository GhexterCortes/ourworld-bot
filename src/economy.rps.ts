import { Message, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { randomInt } from 'fallout-utility';
import { InteractionCommandBuilder, MessageCommandBuilder, RecipleClient, RecipleScript, version } from 'reciple';
import { Economy } from './economy/economy';
import { errorEmbed } from './_errorEmbed';

class EconomyPlugin implements RecipleScript {
    public versions: string[] = [version];
    public commands: (MessageCommandBuilder|InteractionCommandBuilder)[] = [];
    public economy: Economy = require('./economy.a.main');

    public onStart() {
        this.commands = [
            new InteractionCommandBuilder()
                .setName('rock-paper-scissors')
                .setDescription('Play rock-paper-scissors with another user')
                .addUserOption(user => user
                    .setName('user')
                    .setDescription('The user to play against')
                    .setRequired(true)
                )
                .setExecute(async command => {
                    await command.interaction.deferReply();

                    const interaction = command.interaction;
                    const user = interaction.options.getUser('user');

                    const player = await this.economy.getUser(interaction.user.id).catch(() => undefined);
                    if (!player) return interaction.editReply({ embeds: [errorEmbed(`You're not registered`)] });

                    const opponent = user ? await this.economy.getUser(user.id).catch(() => undefined) : undefined;
                    if (!opponent) return interaction.editReply({ embeds: [errorEmbed(user ? `**${user.tag}** is not registered` : `Can't find opponent's account`, false, false)] });
                    if (player.user_id === opponent.user_id) return interaction.editReply({ embeds: [errorEmbed('You can\'t play against yourself')] });

                    let turn = player.user_id;
                    let answers: { user_id: string; answer: "ROCK"|"PAPER"|"SCISSORS"; }[] = [];
                    
                    const winnerMap = {
                        'ROCK': 'SCISSORS',
                        'SCISSORS': 'PAPER',
                        'PAPER': 'ROCK'
                    }

                    await interaction.editReply({
                        content: `<@${player.user_id}> vs <@${opponent.user_id}>`,
                        embeds: [
                            new MessageEmbed()
                                .setAuthor({ name: `Rock, Paper, and Scissors` })
                                .setDescription(`<@${turn}>'s turn`)
                                .setColor('GREEN')
                        ],
                        components: [
                            new MessageActionRow().setComponents([
                                new MessageButton()
                                    .setCustomId('ROCK')
                                    .setEmoji('🪨')
                                    .setStyle('PRIMARY'),
                                new MessageButton()
                                    .setCustomId('PAPER')
                                    .setEmoji('🧾')
                                    .setStyle('PRIMARY'),
                                new MessageButton()
                                    .setCustomId('SCISSORS')
                                    .setEmoji('✂️')
                                    .setStyle('PRIMARY')
                            ])
                        ]
                    });

                    const reply = await interaction.fetchReply().catch(() => undefined);
                    if (!reply) return interaction.editReply({ embeds: [errorEmbed(`Can't fetch game content`)] });

                    const collector = (reply as Message).createMessageComponentCollector({
                        time: 20000,
                        filter: (component) => component.customId === 'ROCK' || component.customId === 'PAPER' || component.customId === 'SCISSORS'
                    });

                    collector.on('collect', async (i) => {
                        if (i.user.id !== player.user_id && i.user.id !== opponent.user_id) { interaction.reply({ embeds: [errorEmbed('This is not your game')], ephemeral: true }).catch(() => {}); return; }
                        if (i.user.id !== turn) { interaction.reply({ embeds: [errorEmbed('It is not your turn')], ephemeral: true }).catch(() => {}); return; }
                        if (!i.deferred) await i.deferUpdate().catch(() => {});

                        switch (i.customId) {
                            case 'ROCK':
                                answers.push({ user_id: turn, answer: 'ROCK' });
                                break;
                            case 'PAPER':
                                answers.push({ user_id: turn, answer: 'PAPER' });
                                break;
                            case 'SCISSORS':
                                answers.push({ user_id: turn, answer: 'SCISSORS' });
                                break;
                        }

                        if (turn === player.user_id) {
                            turn = opponent.user_id;

                            await interaction.editReply({
                                embeds: [
                                    new MessageEmbed()
                                        .setAuthor({ name: `Rock, Paper, and Scissors` })
                                        .setDescription(`<@${turn}>'s turn`)
                                        .setColor('GREEN')
                                ]
                            }).catch(() => {});
                        }

                        if (answers.length === 2) collector.stop();
                    });

                    collector.on('end', async () => {
                        if (answers.length !== 2) {
                            interaction.reply({ content: ' ', embeds: [errorEmbed('You did not answer in time')], components: [] }).catch(() => {});
                            return;
                        }

                        if (answers[0].answer === answers[1].answer) {
                            interaction.reply({ content: ' ', embeds: [errorEmbed('It\'s a tie').setColor('YELLOW')], components: [] });
                            return;
                        }

                        const winner = winnerMap[answers[0].answer] === answers[1].answer ? player : opponent;
                        const loser = winnerMap[answers[0].answer] === answers[1].answer ? opponent : player;

                        const reward =  randomInt(10, 30);

                        winner.setBalance(winner.balance + reward);
                        loser.setBalance(loser.balance - reward);

                        await interaction.editReply({
                            content: ' ',
                            embeds: [
                                new MessageEmbed()
                                    .setAuthor({ name: `Rock Paper and Scissors` })
                                    .setColor('GREEN')
                                    .setDescription(`<@!${winner.user_id}> won! **+${reward}** 🪙\n<@!${loser.user_id}> lost! **-${reward}** 🪙`)
                                    .setFooter({ text: `${player.playername} vs ${opponent.playername}` })
                            ],
                            components: []
                        });
                    });
                })
        ];

        return !!this.economy.client;
    }
}

module.exports = new EconomyPlugin();