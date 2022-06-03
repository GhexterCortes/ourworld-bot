import { ColorResolvable, MessageEmbed, TextChannel } from 'discord.js';
import { replaceAll } from 'fallout-utility';
import { escapeRegExp } from 'fallout-utility/dist/scripts/escapeRegExp';
import { InteractionCommandBuilder, MessageCommandBuilder, RecipleClient, RecipleScript, version } from 'reciple';
import { errorEmbed } from './_errorEmbed';

export class SendMessage implements RecipleScript {
    public versions: string[] = ['1.3.x'];
    public commands: (MessageCommandBuilder | InteractionCommandBuilder)[] = [];
    
    public onStart(client: RecipleClient) {
        this.commands = [
            (new InteractionCommandBuilder()
                .setName('send')
                .setDescription('Sends a message to channel')
                .addSubcommand(text => text
                    .setName('text')
                    .setDescription('Sends a message to channel')
                    .addStringOption(message => message
                        .setName('message')
                        .setDescription('The message to send')
                        .setRequired(true)    
                    )
                    .addUserOption(to => to
                        .setName('send-to')
                        .setDescription('The user to send the embed to')
                        .setRequired(false)    
                    )
                )
                .addSubcommand(embed => embed
                    .setName('embed')
                    .setDescription('Sends an embed to channel')
                    .addUserOption(to => to
                        .setName('send-to')
                        .setDescription('The user to send the embed to')
                        .setRequired(false)    
                    )
                    .addStringOption(content => content
                        .setName('content')
                        .setDescription('The content of the embed')
                        .setRequired(false)
                    )
                    .addStringOption(authorName => authorName
                        .setName('author-name')
                        .setDescription('The name of the author')
                        .setRequired(false)
                    )
                    .addStringOption(authorIconUrl => authorIconUrl
                        .setName('author-icon-url')
                        .setDescription('The url of the author icon')
                        .setRequired(false)
                    )
                    .addStringOption(authorUrl => authorUrl
                        .setName('author-url')
                        .setDescription('The url of the author')
                        .setRequired(false)
                    )
                    .addStringOption(title => title
                        .setName('title')
                        .setDescription('The title of the embed')
                        .setRequired(false)
                    )
                    .addStringOption(description => description
                        .setName('description')
                        .setDescription('The description of the embed')
                        .setRequired(false)
                    )
                    .addStringOption(imageUrl => imageUrl
                        .setName('image-url')
                        .setDescription('The url of the image')
                        .setRequired(false)
                    )
                    .addStringOption(thumbnailUrl => thumbnailUrl
                        .setName('thumbnail-url')
                        .setDescription('The url of the thumbnail')
                        .setRequired(false)
                    )
                    .addStringOption(footerText => footerText
                        .setName('footer-text')
                        .setDescription('The text of the footer')
                        .setRequired(false)
                    )
                    .addStringOption(footerIconUrl => footerIconUrl
                        .setName('footer-icon-url')
                        .setDescription('The url of the footer icon')
                        .setRequired(false)
                    )
                    .addStringOption(url => url
                        .setName('url')
                        .setDescription('The url of the embed')
                        .setRequired(false)    
                    )
                    .addStringOption(color => color
                        .setName('color')
                        .setDescription('The color of the embed')
                        .setAutocomplete(true)
                        .setRequired(false)
                    )
                ) as InteractionCommandBuilder)
                .setExecute(async command => {
                    const interaction = command.interaction;
                    const subcommand = interaction.options.getSubcommand();
                    const sendTo = interaction.options.getUser('send-to') ?? interaction.channel;

                    switch (subcommand) {
                        case 'text':
                            const message = interaction.options.getString('message');
                            
                            await interaction.reply({ content: `Sending Message`, ephemeral: true });
                            if (!message) return interaction.editReply({ content: `Message is empty` });
                            if (!sendTo) return interaction.editReply({ content: `No channel found` });

                            const textReply = await sendTo.send(SendMessage.lineBreaks(message)).catch(() => undefined);
                            if (!textReply) return interaction.editReply({ content: `Failed to send message` }).catch(() => {});

                            command.client.logger.debug(`Sent text to ${(sendTo as TextChannel).name ?? 'unknown channel'}`);
                            return interaction.editReply({ content: `Message sent` });
                            
                        case 'embed':
                            const content = interaction.options.getString('content') ?? undefined;
                            const authorName = interaction.options.getString('author-name') ?? undefined;
                            const authorIconUrl = interaction.options.getString('author-icon-url') ?? undefined;
                            const authorUrl = interaction.options.getString('author-url') ?? undefined;
                            const title = interaction.options.getString('title') ?? undefined;
                            const description = interaction.options.getString('description') ?? undefined;
                            const imageUrl = interaction.options.getString('image-url') ?? undefined;
                            const thumbnailUrl = interaction.options.getString('thumbnail-url') ?? undefined;
                            const footerText = interaction.options.getString('footer-text') ?? undefined;
                            const footerIconUrl = interaction.options.getString('footer-icon-url') ?? undefined;
                            const url = interaction.options.getString('url') ?? undefined;
                            const color = interaction.options.getString('color') ?? undefined;

                            await interaction.reply({ content: `Sending Embed`, ephemeral: true });
                            if (!sendTo) return interaction.editReply({ content: `No channel found` });

                            const embed = new MessageEmbed();
                            
                            if (authorName) embed.setAuthor({ name: authorName, iconURL: authorIconUrl, url: authorUrl });
                            if (title) embed.setTitle(title);
                            if (description) embed.setDescription(SendMessage.lineBreaks(description));
                            if (imageUrl) embed.setImage(imageUrl);
                            if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
                            if (footerText) embed.setFooter({ text: footerText, iconURL: footerIconUrl });
                            if (url) embed.setURL(url);
                            if (color) embed.setColor(color as ColorResolvable);

                            const reply = await sendTo.send({ content: content ?? ' ', embeds: [embed] }).catch(() => undefined);
                            if (!reply) return interaction.editReply({ content: `Failed to send embed` });
                            
                            command.client.logger.debug(`Sent embed to ${(sendTo as TextChannel).name ?? 'unknown channel'}`);
                            return interaction.editReply({ content: `Embed sent` });
                    }
                }),
            new MessageCommandBuilder()
                .setName('send-text')
                .setDescription('Sends a message to current channel')
                .addOption(text => text
                    .setName('message')
                    .setDescription('The message to send')
                    .setRequired(true)    
                )
                .setExecute(async command => {
                    const message = command.message;
                    const text = command.command.args ? command.command.args.join(' ') : undefined;

                    if (!text) return message.reply({ embeds: [errorEmbed(`No message provided`)] })
                    
                    await message.delete();
                    await message.channel.send(text);

                    command.client.logger.debug(`Sent text to ${(message.channel as TextChannel).name ?? 'unknown channel'}`);
                })
        ];
        
        client.on('interactionCreate', async interaction => {
            if (!interaction.isAutocomplete()) return;
            if (interaction.commandName !== 'send') return;

            const text = interaction.options.getFocused() ?? undefined;
            const color = SendMessage.getColors(text.toString());

            return interaction.respond(color.map(c => { return { name: c.toString(), value: c.toString()}; })).catch(() => {});
        });

        return true;
    }

    public static getColors(filter?: string) {
        const colors: ColorResolvable[] = ['DEFAULT', 'WHITE', 'AQUA', 'GREEN', 'BLUE', 'YELLOW', 'PURPLE', 'LUMINOUS_VIVID_PINK', 'FUCHSIA', 'GOLD', 'ORANGE', 'RED', 'GREY', 'DARKER_GREY', 'NAVY', 'DARK_AQUA', 'DARK_GREEN', 'DARK_BLUE', 'DARK_PURPLE', 'DARK_VIVID_PINK', 'DARK_GOLD', 'DARK_ORANGE', 'DARK_RED', 'DARK_GREY', 'LIGHT_GREY', 'DARK_NAVY', 'BLURPLE', 'GREYPLE', 'DARK_BUT_NOT_BLACK', 'NOT_QUITE_BLACK', 'RANDOM'];
        
        return filter ? colors.filter(c => c.toString().toLowerCase().includes(filter?.toString().toLowerCase())) : colors;
    }

    public static lineBreaks(text: string) {
        return replaceAll(text, ['[br]', '<br>', '\\n'].map(r => escapeRegExp(r)), ['\n', '\n', '\n']);
    }
}

export default new SendMessage();
