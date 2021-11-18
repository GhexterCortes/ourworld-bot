const memes = require("random-memes");
const Util = require('fallout-utility');
const { MessageEmbed } = require("discord.js");
const SafeMessage = require("../scripts/safeMessage");
const SafeInteract = require("../scripts/safeInteract");
const MessageCommandBuilder = require("../scripts/messageCommandBuilder");
const InteractionCommandBuilder = require("../scripts/interactionCommandBuilder");

class Create {
    constructor() {
        this.versions = ['1.4.1'];
        this.commands = [
            new MessageCommandBuilder()
                .setName("meme")
                .setDescription("Get a random meme")
                .setExecute(async (args, message, Client) => {
                    const reply = await SafeMessage.reply(message, Util.getRandomKey( Client.AxisUtility.getLanguage().thinking ));

                    await SafeMessage.edit(reply, await meme(message, Client));
                }),
            new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName("meme")
                    .setDescription("Get a random meme")
                )
                .setExecute(async (interaction, Client) => {
                    await SafeInteract.deferReply(interaction);

                    await SafeInteract.editReply(interaction, await meme(interaction, Client));
                })
        ];
    }

    async start(Client) {
        return true;
    }
}

async function meme(message, Client) {
    const embed = new MessageEmbed().setColor(Client.AxisUtility.getConfig().embedColor);
    const image = await memes.random();
    let author = { tag: 'A sus user', avatar: null };

    if(message.member) author = { tag: message.member.user.tag, avatar: message.member.user.displayAvatarURL() };

    if(!image) {
        return {
            content: ' ',
            embed: [
                embed.setAuthor(Util.getRandomKey( Client.AxisUtility.getLanguage().noResponse ))
            ]
        };
    }

    if(image?.caption) embed.setAuthor(image.caption, null);
    embed.setImage(image.image);
    embed.setFooter(`Requested by ${ author.tag }`, author.avatar);
    
    return { content: ' ', embeds: [embed] };
}

module.exports = new Create();