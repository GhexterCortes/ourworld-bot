const InteractionCommandBuilder = require('../../scripts/interactionCommandBuilder');
const SafeMessage = require('../../scripts/safeMessage');
const SafeInteract = require('../../scripts/safeInteract');
const { replaceAll } = require('fallout-utility');

module.exports = new InteractionCommandBuilder()
    .setCommand(SlashCommandBuilder => SlashCommandBuilder
        .setName('send')
        .setDescription('Send a custom message')
        .addSubCommand(say => say
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
        .addSubCommand(embed => embed
            .setName('embed')
            .setDescription('Send an embed')
            .addStringOption(description => description
                .setName('description')
                .setDescription('The description of the embed')
                .setRequired(true)
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
                .setName('authorIcon')
                .setDescription('The icon of the author of the embed')
                .setRequired(false)
            )
            .addStringOption(authorUrl => authorUrl
                .setName('authorUrl')
                .setDescription('The url of the author of the embed')
                .setRequired(false)
            )
            .addStringOption(thumbnail => thumbnail
                .setName('thumbnail')
                .setDescription('The thumbnail of the embed')
                .setRequired(false)
            )
            .addStringOption(thumbnailUrl => thumbnailUrl
                .setName('thumbnailUrl')
                .setDescription('The url of the thumbnail of the embed')
                .setRequired(false)
            )
            .addStringOption(image => image
                .setName('image')
                .setDescription('The image of the embed')
                .setRequired(false)
            )
            .addStringOption(imageUrl => imageUrl
                .setName('imageUrl')
                .setDescription('The url of the image of the embed')
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
                .setName('footerIcon')
                .setDescription('The icon of the footer of the embed')
                .setRequired(false)
            )
            .addStringOption(footerUrl => footerUrl
                .setName('footerUrl')
                .setDescription('The url of the footer of the embed')
                .setRequired(false)
            )
            .addBooleanOption(setTimestamp => setTimestamp
                .setName('setTimestamp')
                .setDescription('Set the timestamp of the embed')
                .setRequired(false)
            )
        )
    )
    .setExecute(async (interaction, Client) => {
        this.say = async () => {
            const text = replaceAll(interaction.options.getString('text'), '[br]', '\n');
        
            await SafeInteract.deferReply(interaction, { ephemeral: true });
            let reply = interaction.options.getString('reply') ? await getMessage(interaction.options.getString('reply')) : false;
    
            const message = reply ? await SafeMessage.reply(reply, text) : await SafeMessage.send(interaction.channel, text);
    
            if(!message) {
                await SafeInteract.editReply(interaction, 'I could not send the message!');
            } else {
                await SafeInteract.editReply(interaction, 'Message sent!');
            }
    
            async function getMessage(id) {
                const foundMessage = await interaction.channel.messages.fetch(id).catch(() => false);
    
                if(!foundMessage) await interaction.editReply('I could not find the reply message id!');
    
                return foundMessage ? foundMessage : false;
            }
        }
    });