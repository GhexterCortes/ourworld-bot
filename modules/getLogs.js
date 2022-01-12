const { InteractionCommandBuilder, MessageCommandBuilder} = require('../scripts/builders');
const { SafeInteract, SafeMessage } = require('../scripts/safeActions');
const { MessageEmbed } = require('discord.js');
const { limitText } = require('fallout-utility');
const PasteGG = require('paste.gg');
const Fs = require('fs');

class GetLog {
    constructor() {
        this.versions = ['1.6.0','1.6.1'];
        this.Paste = new PasteGG();
    }

    async onStart(Client) {
        this.commands = [
            new MessageCommandBuilder()
                .setName('log')
                .setDescription('Get the bot latest log')
                .setExecute(async (args, message) => {
                    await SafeMessage.react(message, '⌛');
                    await SafeMessage.send(message.author, { content: ' ', embeds: await this.getLog() });
                    await SafeMessage.reactionRemoveAll(message);
                    await SafeMessage.react(message, '✅');
                }),
            new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('log')
                    .setDescription('Get the bot latest log')    
                )
                .setAllowExecuteViaDm(true)
                .setExecute(async (interaction) => SafeInteract.reply(interaction, { content: ' ', embeds: await this.getLog(), ephemeral: true }))
        ];
        return true;
    }

    async getLog() {
        const embed = new MessageEmbed().setAuthor({ name: 'latest.log' }).setColor('BLUE');

        try{
            const log = Fs.readFileSync('./logs/latest.log', 'utf8');
            if(!log || !log.length) { return [embed.setDescription('```\nLog is empty.\n```')]; }
            
            const paste = await this.Paste.post({
                files: [
                    {
                        content: {
                            format: "text",
                            value: log
                        }
                    }
                ]
            });

            embed.setDescription('```\n' + limitText(log, 4000, '...') + '\n```');
            if(paste && paste.status === 'success') embed.setFooter({ text: 'Full Log at ' + paste.result.url });  

            return [embed];
        } catch (err) {
            console.error(err);
            embed.setDescription('```\nError while reading the log\n```\n```\n'+ err.stack +'\n```');
            return [embed];
        }
    }
}

module.exports = new GetLog();