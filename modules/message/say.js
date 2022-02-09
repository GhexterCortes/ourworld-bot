const { replaceAll } = require('fallout-utility');
const { MessageEmbed } = require('discord.js');
const { InteractionCommandBuilder } = require('../../scripts/builders');
const { SafeMessage, SafeInteract } = require('../../scripts/safeActions');
const MakeConfig = require('../../scripts/makeConfig');
const Yml = require('yaml');

let spamming = false;
const config = Yml.parse(MakeConfig('./config/send/config.yml', {
    spam: {
        allowPings: false,
        whitelistChannels: {
            enabled: true,
            channelIds: [],
            convertToBlacklist: true
        }
    }
}));

module.exports = new InteractionCommandBuilder()
    .setCommand(SlashCommandBuilder => SlashCommandBuilder
        .setName('send')
        .setDescription('Send a custom message')
        .addSubcommand(say => say
            .setName('say')
            .setDescription('Says something')
            .addStringOption(text => text
                .setName('text')
                .setDescription('The text to say')
                .setRequired(true)    
            )
            .addStringOption(reply => reply
                .setName('reply')
                .setDescription('Send reply to a message by id')
                .setRequired(false)
            )
        )
        .addSubcommand(embed => embed
            .setName('embed')
            .setDescription('Send an embed')
            .addStringOption(description => description
                .setName('description')
                .setDescription('The description of the embed')
                .setRequired(true)
            )
            .addStringOption(reply => reply
                .setName('reply')
                .setDescription('Send embed reply to a message by id')
                .setRequired(false)
            )
            .addStringOption(title => title
                .setName('title')
                .setDescription('The title of the embed')
                .setRequired(false)
            )
            .addStringOption(author => author
                .setName('author')
                .setDescription('The display author of the embed')
                .setRequired(false)
            )
            .addStringOption(authorIcon => authorIcon
                .setName('author-icon')
                .setDescription('The icon of the author of the embed')
                .setRequired(false)
            )
            .addStringOption(authorUrl => authorUrl
                .setName('author-url')
                .setDescription('The url of the author of the embed')
                .setRequired(false)
            )
            .addStringOption(thumbnail => thumbnail
                .setName('thumbnail')
                .setDescription('The thumbnail of the embed')
                .setRequired(false)
            )
            .addStringOption(image => image
                .setName('image')
                .setDescription('The image of the embed')
                .setRequired(false)
            )
            .addStringOption(color => color
                .setName('color')
                .setDescription('The color of the embed')
                .setRequired(false)
            )
            .addStringOption(footer => footer
                .setName('footer')
                .setDescription('The footer of the embed')
                .setRequired(false)
            )
            .addStringOption(footerIcon => footerIcon
                .setName('footer-icon')
                .setDescription('The icon of the footer of the embed')
                .setRequired(false)
            )
            .addStringOption(footerUrl => footerUrl
                .setName('footer-url')
                .setDescription('The url of the footer of the embed')
                .setRequired(false)
            )
            .addBooleanOption(setTimestamp => setTimestamp
                .setName('set-timestamp')
                .setDescription('Set the timestamp of the embed')
                .setRequired(false)
            )
        )
        .addSubcommand(spam => spam
            .setName('spam')
            .setDescription('Spam a message')
            .addStringOption(text => text
                .setName('text')
                .setDescription('The text to spam')
                .setRequired(true)    
            )
            .addIntegerOption(count => count
                .setName('count')
                .setDescription('The amount of times to spam (1-100)')
                .setRequired(true)    
            )
        )
        .addSubcommand(stopSpam => stopSpam
            .setName('stopspam')
            .setDescription('Stop spamming a message')    
        )
    )
    .setExecute(async (interaction, Client) => {
        this.say = async () => {
            await SafeInteract.deferReply(interaction, { ephemeral: true });
            const text = replaceAll(interaction.options.getString('text'), '[br]', '\n');
            const reply = interaction.options.getString('reply') ? await getMessage(interaction.options.getString('reply')) : false;
            const message = reply ? await SafeMessage.reply(reply, text) : await SafeMessage.send(interaction.channel, text);
    
            if(!message) {
                await SafeInteract.editReply(interaction, 'I could not send the message!');
            } else {
                await SafeInteract.editReply(interaction, 'Message sent!');
            }
        }
        this.embed = async () => {
            await SafeInteract.deferReply(interaction, { ephemeral: true });
            const description = replaceAll(interaction.options.getString('description'), '[br]', '\n');
            const title = interaction.options.getString('title');
            const author = interaction.options.getString('author');
            const authorIcon = interaction.options.getString('author-icon');
            const authorUrl = interaction.options.getString('author-url');
            const thumbnail = interaction.options.getString('thumbnail');
            const image = interaction.options.getString('image');
            const color = interaction.options.getString('color');
            const footer = interaction.options.getString('footer');
            const footerIcon = interaction.options.getString('footer-icon');
            const footerUrl = interaction.options.getString('footer-url');
            const setTimestamp = interaction.options.getBoolean('set-timestamp');

            const embed = new MessageEmbed().setDescription(description);

            if(title) embed.setTitle(title);
            if(author) embed.setAuthor({ name: author, iconURL: (authorIcon ? authorIcon : null), url: (authorUrl ? authorUrl : null) });
            if(thumbnail) embed.setThumbnail(thumbnail);
            if(image) embed.setImage(image);
            if(color) embed.setColor(color);
            if(footer) embed.setFooter({ text: footer, iconURL: (footerIcon ? footerIcon : null), url: (footerUrl ? footerUrl : null) });
            if(setTimestamp) embed.setTimestamp();

            const reply = interaction.options.getString('reply') ? await getMessage(interaction.options.getString('reply')) : false;
            const message = reply ? await SafeMessage.reply(reply, { content: ' ', embeds: [embed] }) : await SafeMessage.send(interaction.channel, { content: ' ', embeds: [embed] });

            if(!message) {
                await SafeInteract.editReply(interaction, 'I could not send the embed!');
            } else {
                await SafeInteract.editReply(interaction, 'Embed sent!');
            }
        }
        this.spam = async () => {
            const text = interaction.options.getString('text');
            const count = interaction.options.getInteger('count');

            if(count > 100 || count < 1) return SafeInteract.reply(interaction, { content: 'The count must be between 1 and 100!', ephemeral: true });
            if(config.spam.whitelistChannels.enabled && !(
                !config.spam.whitelistChannels.channelIds.includes(interaction.channel.id) && config.spam.whitelistChannels.convertToBlacklist
                ||
                config.spam.whitelistChannels.channelIds.includes(interaction.channel.id) && !config.spam.whitelistChannels.convertToBlacklist
            )) return SafeInteract.reply(interaction, { content: 'This command is disabled in this channel!', ephemeral: true });
            if(!config.spam.allowPings && text.includes('<@')) return SafeInteract.reply(interaction, { content: 'Pings are not allowed!', ephemeral: true });
            
            await SafeInteract.deferReply(interaction);
            let success = true;
            spamming = true;

            for (let i = 0; i < count; i++) {
                if(!spamming) { success = false; break; }
                if(!await SafeMessage.send(interaction.channel, `\`spam\`: ${text}`)) {
                    success = false;
                    await SafeMessage.send(interaction.channel, `An error occurred while spamming!`);
                    break;
                }
            }

            await SafeInteract.editReply(interaction, success ? 'Spam success!' : 'Spam cancelled!');
        }
        this.stopspam = async () => {
            await SafeInteract.deferReply(interaction);
            
            await SafeInteract.editReply(interaction, spamming ? 'Stopping spam...' : 'Bot is not spamming!');
            spamming = false;
        }

        const command = interaction.options.getSubcommand();
        if(command && this.hasOwnProperty(command)) await this[command]();

        async function getMessage(id) {
            const foundMessage = await interaction.channel.messages.fetch(id).catch(() => false);

            if(!foundMessage) await interaction.editReply('I could not find the reply message id!');

            return foundMessage ? foundMessage : false;
        }
    });