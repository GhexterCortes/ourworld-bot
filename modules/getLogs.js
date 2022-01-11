const { InteractionCommandBuilder, MessageCommandBuilder} = require('../scripts/builders');
const { SafeInteract, SafeMessage } = require('../scripts/safeActions');
const { MessageEmbed } = require('discord.js');
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
                .setExecute(async (interaction) => SafeInteract.reply(interaction, { content: ' ', embeds: await this.getLog(), ephemeral: true }))
        ];
        return true;
    }

    async getLog() {
        let embeds = [];
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

            const split = this.splitString(log, 4000);
            let limit = 0;
            for (const string of split) {
                const newEmbed = new MessageEmbed().setAuthor({ name: 'latest.log' }).setColor('BLUE');
                newEmbed.setDescription('```log\n' + string + '\n```');
                if(paste && paste.status === 'success') newEmbed.setFooter({ text: 'Log pasted at ' + paste.result.url });
                embeds = [...embeds, newEmbed];

                limit++;
                if(limit >= 10) break;
            }

            return embeds;
        } catch (err) {
            console.error(err);
            embed.setDescription('```\nError while reading the log\n```');
            return [embed];
        }
    }

    splitString (str, n) {
        if (str.length <= n) {
            return [str];
        }
        const result = [];
        let i = 0;
        while (i < str.length) {
            result.push(str.substr(i, n));
            i += n;
        }
        return result;
    }
}

module.exports = new GetLog();