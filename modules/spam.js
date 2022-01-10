const MemberPermission = require('../scripts/memberPermissions');
const { SafeMessage } = require('../scripts/safeActions');
const { MessageEmbed } = require('discord.js');

class Spammer {
    constructor() {
        this.versions = ['1.6.0','1.6.1'];
    }

    async onStart(Client) {
        const config = Client.AxisUtility.get().config;
        Client.on('messageCreate', async (message) => {
            if (!message || message.author.bot) return;

            const everyone = message.mentions?.everyone;
            const here = message.mentions?.here;

            if (everyone || here) {
                const reply = await SafeMessage.reply(message, { content: ' ', embeds: [
                    new MessageEmbed()
                        .setColor(config.embedColor)
                        .setAuthor({ name: 'Mass mentions detected!', iconURL: message.author.displayAvatarURL() })
                        .setDescription(`To respect people's peace, avoid mass mention @everyone or @here.\n\`\`\`You may review the rules if you are a member of the staff.\`\`\`\n\n`)
                        .setFooter({ text: `The owner received the original copy of this message for review.` })
                        .setTimestamp()
                ] });


                // get guild from message
                const ownerId = await Client.guilds.cache.get(message.guildId)?.ownerId;
                const owner = ownerId ? await Client.users.fetch(ownerId) : null;

                console.log(owner);
                if(owner) await SafeMessage.send(owner, {
                    content: `This message was marked as spam! by **${message.author.tag}** at **${message.guild.name}**`,
                    embeds: [
                        new MessageEmbed()
                            .setColor(config.embedColor)
                            .setDescription(message.content)
                    ]
                });
                setTimeout(async () => SafeMessage.delete(message), 5000);
            }

            // count message pings
            if(message.member && (!message.member && message.member.permissions.has(['MANAGE_MESSAGES']) ) && message.mentions.users.size > 0 &&
                (
                    message.content.toLowerCase().startsWith('pls ')
                    ||
                    message.content.toLowerCase().startsWith('owo ')
                    ||
                    message.content.toLowerCase().startsWith('tp me to')
                )
            ) {
                const reply = await SafeMessage.reply(message, {
                    content: ' ',
                    embeds: [
                        new MessageEmbed()
                        .setAuthor({ name: '🚫 Notice!' })
                        .setDescription('Avoid pinging people when using bots this can lead to spam!\nYou can try using user id instead of @user\n```\nRight click the user profile then click Copy ID\n```')
                        .setFooter({ text: 'This method doesn\'t always work' })
                        .setTimestamp()
                        .setColor('RED')
                    ]});

                setTimeout(async () => SafeMessage.delete(reply), 5000);
            }
        });
        
        return true;
    }
}

module.exports = new Spammer();