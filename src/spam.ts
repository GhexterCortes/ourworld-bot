import yml from 'yaml';
import path from 'path';
import { createConfig } from './_createConfig';
import { InteractionCommandBuilder, MessageCommandBuilder, RecipleScript, version } from 'reciple';
import { InteractionReplyOptions, Message, MessageActionRow, MessageButton, MessageEditOptions, MessageEmbed, MessageOptions, ReplyMessageOptions, TextChannel, User } from 'discord.js';
import { errorEmbed } from './_errorEmbed';

export interface SpamConfig {
    spam: {
        max: number;
        allowMentions: boolean;
        prefix: string;
    }
}

export class Spam implements RecipleScript {
    public versions: string[] = [version];
    public config: SpamConfig = Spam.getConfig();
    public commands: (MessageCommandBuilder|InteractionCommandBuilder)[] = [];

    public onStart() {
        this.commands = [
            new MessageCommandBuilder()
                .setName('spam')
                .setDescription('Spam a message')
                .addOption(count => count
                    .setName('count')
                    .setDescription('The amount of times to spam the message')
                    .setRequired(true)
                    .setValidator(c => !isNaN(parseInt(c)) && parseInt(c) > 0)    
                )
                .addOption(message => message
                    .setName('message')
                    .setDescription('The message to spam')
                    .setRequired(true)
                )
                .setValidateOptions(true)
                .setExecute(async command => {
                    const count = command.command.args ? (command.command.args.shift() ?? undefined) : undefined;
                    const spamMessage = command.command.args ? (command.command.args.join(' ') ?? undefined) : undefined;
                    const message = command.message;

                    if (!count || !spamMessage) return message.reply({ embeds: [errorEmbed(`Invalid arguments`)] });
                    if (this.config.spam.max < parseInt(count)) return message.reply({ embeds: [errorEmbed(`You can only spam ${this.config.spam.max} times`)] });
                    if (!this.config.spam.allowMentions && /^<@[!?&]?(\d+)>$/.test(spamMessage)) return message.reply({ embeds: [errorEmbed(`Mentions are not allowed`)] });

                    const reply = await message.reply(Spam.getSpamConfirmMessage() as MessageOptions);
                    const confirm = await Spam.addSpamConfirmCollector(reply, message.author);

                    if (!confirm) return reply.edit(Spam.getSpamCancelledMessage() as MessageEditOptions);
                    
                    command.client.logger.debug(`${count} messages sent to ${(message.channel as TextChannel).name ?? 'unknown channel'}`, 'Spam');
                    await this.spamMessage(message.channel as TextChannel, reply, message.author, spamMessage, parseInt(count));
                }),
            new InteractionCommandBuilder()
                .setName('spam')
                .setDescription('Spam a message')
                .addNumberOption(count => count
                    .setName('count')
                    .setDescription('The amount of times to spam the message')
                    .setRequired(true)
                    .setMinValue(1)
                    .setMaxValue(this.config.spam.max)    
                )
                .addStringOption(message => message
                    .setName('message')
                    .setDescription('The message to spam')
                    .setRequired(true)    
                )
                .setExecute(async command => {
                    const count = command.interaction.options.getNumber('count', true);
                    const spamMessage = command.interaction.options.getString('message', true);
                    const interaction = command.interaction;

                    if (this.config.spam.max < count) return interaction.reply({ embeds: [errorEmbed(`You can only spam ${this.config.spam.max} times`)] });
                    if (!this.config.spam.allowMentions && /^<@[!?&]?(\d+)>$/.test(spamMessage)) return interaction.reply({ embeds: [errorEmbed(`Mentions are not allowed`)] });
                    if (!interaction.channel) return interaction.reply({ embeds: [errorEmbed(`No channel found`)] });

                    await interaction.reply(Spam.getSpamConfirmMessage() as InteractionReplyOptions);

                    const reply = await interaction.fetchReply() as Message;
                    const confirm = await Spam.addSpamConfirmCollector(reply, interaction.user);

                    if (!confirm) return interaction.reply(Spam.getSpamCancelledMessage() as InteractionReplyOptions);

                    command.client.logger.debug(`${count} messages sent to ${(interaction.channel as TextChannel).name ?? 'unknown channel'}`, 'Spam');
                    await this.spamMessage(interaction.channel as TextChannel, reply, interaction.user, spamMessage, count);
                })
        ];

        return true;
    }

    public async spamMessage(channel: TextChannel, reply: Message, author: User, spam: string, count: number): Promise<void> {
        let spamming = true;
        let error = false;
        let spamCount = 0;

        await reply.edit(Spam.getSpammingMessage() as MessageEditOptions).catch(() => { spamming = false; error = true; });
        const collector = reply.createMessageComponentCollector({
            filter: (c) => c.user.id === author.id && (c.customId === 'cancel')
        });

        collector.on('collect', async (component) => {
            if (!component.deferred) await component.deferUpdate().catch(() => {});
            spamming = false;
            error = true;
            collector.stop();
        });

        for (let i = 0; i < count; i++) {
            if (!spamming) break;

            channel.send(`${this.config.spam.prefix}${spam}`).catch(() => { spamming = false; error = true; });
            spamCount++;
        }

        spamming = false;

        if (error) {
            await reply.edit(Spam.getSpamCancelledMessage() as MessageEditOptions).catch(() => {});
        } else {
            await reply.edit(Spam.getDoneSpamMessage() as MessageEditOptions).catch(() => {});
        }
    }

    public static async addSpamConfirmCollector(message: Message, author: User): Promise<boolean> {
        return new Promise((resolve, _reject) => {
            const collector = message.createMessageComponentCollector({
                filter: (component) => component.user.id === author.id && (component.customId === 'confirm' || component.customId === 'cancel'),
                time: 30000
            });

            let confirmed = false;

            collector.on('collect', async (component) => {
                if (component.customId === 'confirm') confirmed = true;
                if (!component.deferred) await component.deferUpdate().catch(() => {});

                collector.stop();
            });

            collector.on('end', () => resolve(confirmed));
        });
    }

    public static getSpamConfirmMessage(): ReplyMessageOptions|MessageEditOptions {
        return {
            content: ' ',
            embeds: [
                new MessageEmbed()
                    .setAuthor({ name: `Spam Message` })
                    .setDescription(`Do you want to spam this message?`)
                    .setColor('RED')
            ],
            components: [
                new MessageActionRow().setComponents(Spam.getSpamConfirmButtons())
            ]
        };
    }

    public static getSpamCancelledMessage(): ReplyMessageOptions|MessageEditOptions {
        return {
            content: ' ',
            embeds: [
                new MessageEmbed()
                    .setAuthor({ name: `Spam Message` })
                    .setDescription(`Spam cancelled`)
                    .setColor('GREEN')
            ],
            components: []
        };
    }

    public static getSpammingMessage(): ReplyMessageOptions|MessageEditOptions {
        return {
            content: ' ',
            embeds: [
                new MessageEmbed()
                    .setAuthor({ name: `Spam Message` })
                    .setDescription(`Spamming message`)
                    .setColor('DARK_BUT_NOT_BLACK')
            ],
            components: [
                new MessageActionRow().setComponents([
                    new MessageButton()
                        .setCustomId('cancel')
                        .setStyle('DANGER')
                        .setLabel('Stop')
                        .setDisabled(false)
                ])
            ]
        };
    }

    public static getDoneSpamMessage(): ReplyMessageOptions|MessageEditOptions {
        return {
            content: ' ',
            embeds: [
                new MessageEmbed()
                    .setAuthor({ name: `Spam Message` })
                    .setDescription(`Spam complete`)
                    .setColor('BLUE')
            ],
            components: []
        };
    }

    public static getSpamConfirmButtons(disabled: boolean = false): MessageButton[] {
        return [
            new MessageButton()
                .setCustomId('confirm')
                .setStyle('DANGER')
                .setDisabled(disabled)
                .setLabel('Yes'),
            new MessageButton()
                .setCustomId('cancel')
                .setStyle('SUCCESS')
                .setDisabled(disabled)
                .setLabel('No')
        ];
    }

    public static getConfig(): SpamConfig {
        const configPath = path.join(process.cwd(), 'config/spam/config.yml');
        const defaultConfig: SpamConfig = {
            spam: {
                max: 10,
                allowMentions: false,
                prefix: '`spam:` '
            }
        };

        return yml.parse(createConfig(configPath, defaultConfig));
    }
}

export default new Spam();
