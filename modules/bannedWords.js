const { SafeMessage, SafeInteract } = require('../scripts/safeActions');
const { InteractionCommandBuilder } = require('../scripts/builders');
const { MessageEmbed } = require('discord.js');
const { getRandomKey } = require('fallout-utility');
const ms = require('ms');

const BannedWordsUtil = require('./bannedWords/');

const config = BannedWordsUtil.Config('./config/bannedWords/config.yml');
const database = new BannedWordsUtil.Database({
    databaseGuildId: config.database.databaseGuildId,
    databaseChannelId: config.database.databaseChannelId,
    databaseMessageId: config.database.databaseMessageId !== '%messageId%' ? config.database.databaseMessageId : null,
    databaseName: config.database.databaseName
});

class BannedWords {
    constructor() {
        this.versions = ['1.6.0','1.6.1'];
        this.scriptConfig = config;
        this.database = database;
    }

    async onStart(Client) {
        await this.database.start(Client);

        if(typeof this.database.getData() !== 'object') return false;
        if(!this.database.getData()?.words || !this.database.getData()?.words?.length) await this.database.setData({ words: [] });

        this.commands = [
            new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('bannedwords')
                    .setDescription('Banned words')
                    .addSubcommand(add => add
                        .setName('add')
                        .setDescription('Add a word to the banned words list')
                        .addStringOption(word => word
                            .setName('word')
                            .setDescription('The word to ban')
                            .setRequired(true)
                        )
                        .addStringOption(punishment => punishment
                            .setName('punishment')
                            .setDescription('The punishment to apply to the word (default: timeout)')
                            .setRequired(false)
                            .addChoice('Temp mute/timeout user', 'timeout')
                            .addChoice('Kick user', 'kick')
                            .addChoice('Ban user', 'ban')
                        )
                    )
                    .addSubcommand(remove => remove
                        .setName('remove')
                        .setDescription('Remove a word from the banned words list')
                        .addStringOption(word => word
                            .setName('word')
                            .setDescription('Remove word from blacklist')
                            .setRequired(true)
                        )
                    )
                    .addSubcommand(list => list
                        .setName('list')
                        .setDescription('List all banned words')
                    )
                )
                .setExecute(async (interaction) => this.execute(interaction, Client))
        ];

        return true;
    }

    async onLoad(Client) {
        Client.on('messageCreate', async (message) => {
            if(!this.scriptConfig.wordMatching.ignoreBots && (message.author.bot || message.author.system)) return;

            const words = this.database.getData()?.words;
            if(!message.content || !words) return;

            const match = BannedWordsUtil.Matchings(this.removeSpecialChars(message.content), words, this.scriptConfig.wordMatching);

            if(!match.status) return;

            let punishment = 0;
            match.banned.map(w => {
                w = this.translatePunishment(w.punishment);
                
                punishment = w > punishment ? w : punishment;
            });

            if(punishment === 0) return;
            await this.punish(message, punishment, this.scriptConfig.punishments, match);
        })
    }

    async punish(message, punishment, punishmentConfig, words) {
        const member = message?.member;

        if(!member) return;

        console.log(punishment);
        switch (punishment) {
            case 1:
                await BannedWordsUtil.Punishment.timeout({ member: member, reason: getRandomKey(punishmentConfig.timeout.defaultReason), time: ms(punishmentConfig.timeout.duration) });
                break;
            case 2:
                await BannedWordsUtil.Punishment.kick({ member: member, reason: getRandomKey(punishmentConfig.kick.defaultReason) });
                break;
            case 3:
                await BannedWordsUtil.Punishment.ban({ member: member, reason: getRandomKey(punishmentConfig.ban.defaultReason) });
                break;
            default:
                break;
        }

        const reply = await SafeMessage.reply(message, {
            content: ' ',
            embeds: [
                new MessageEmbed()
                    .setAuthor({ name: 'Banned words' })
                    .setDescription('`' + words.banned.map(w => w.word).join('`, `') + '` <:susboi:915589409330561054>')
                    .setColor('RED')
                    .setFooter({ text: message.author.username + '#' + message.author.discriminator })
                    .setTimestamp()
            ]
        });

        if(!this.scriptConfig.wordMatching.deleteMatchedMessage) return;
        setTimeout(async () => {
            await SafeMessage.delete(reply);
            await SafeMessage.delete(message);
        }, 5000);
    }

    async execute(interaction, Client) {
        const command = interaction.options.getSubcommand();

        let words = await this.database.fetch();
            words = words.words;

        let word = null;
        let newWords = [];
        switch (command) {
            case 'add':
                word = interaction.options.getString('word');
                let punishment = interaction.options.getString('punishment') ? interaction.options.getString('punishment').toLowerCase() : this.scriptConfig.wordMatching.defaultPunishment;

                if(!word) return interaction.reply({ content: ' ', embeds: [ new MessageEmbed().setAuthor({ name: 'No word provided' }).setColor('RED') ] });
                if(!this.translatePunishment(punishment)) return interaction.reply({ content: ' ', embeds: [ new MessageEmbed().setAuthor({ name: 'Invalid punishment' }) ] });

                const banWords = word.split(' ').map(w => this.removeSpecialChars(w)).filter(w => !words.some(bw => bw.word.toLowerCase() == w.toLowerCase()));
                newWords = [...words, ...banWords.map(w => { return { word: w, punishment: punishment }; })];

                try{
                    await this.database.setData({ words: newWords });
                    await SafeInteract.reply(interaction, { content: ' ', embeds: [ new MessageEmbed().setAuthor({ name: 'Added '+ (banWords.length > 1 ? 'words' : 'word' ) }).setDescription('Banned: `' + banWords.join('` `') + '`').addField('Punishment', punishment, false).setColor('GREEN') ] });
                } catch(err) {
                    await SafeInteract.reply(interaction, { content: ' ', embeds: [ new MessageEmbed().setAuthor({ name: 'Error' }).setColor('RED').setDescription('An error occured while adding the word to the database') ] });
                }

                break;
            case 'remove':
                word = interaction.options.getString('word');

                if(!word) return interaction.reply({ content: ' ', embeds: [ new MessageEmbed().setAuthor({ name: 'No word provided' }).setColor('RED') ] });

                const removeWords = word.split(' ').map(w => this.removeSpecialChars(w)).filter(w => words.some(bw => bw.word.toLowerCase() == w.toLowerCase()));
                newWords = words.filter(w => !removeWords.some(bw => bw.toLowerCase() == w.word.toLowerCase()));

                try{
                    await this.database.setData({ words: newWords });
                    await SafeInteract.reply(interaction, { content: ' ', embeds: [ new MessageEmbed().setAuthor({ name: 'Removed '+ (removeWords.length > 1 ? 'words' : 'word' ) }).setDescription('Removed: `' + removeWords.join('` `') + '`').setColor('GREEN') ] });
                } catch(err) {
                    await SafeInteract.reply(interaction, { content: ' ', embeds: [ new MessageEmbed().setAuthor({ name: 'Error' }).setColor('RED').setDescription('An error occured while removing the word from the database') ] });
                }

                break;
            case 'list':
                const embed = new MessageEmbed();
                embed.setAuthor({ name: 'Banned words' });
                embed.setColor('RED');
                embed.setDescription('||`' + words.map(w => w.word).join('`|| ||`') + '`||');

                await SafeInteract.reply(interaction, { content: ' ', embeds: [ embed ] });
                break;
        }
    }

    translatePunishment(punishment) {
        switch (punishment.toLowerCase()) {
            case 'timeout':
                punishment = 1;
                break;
            case 'kick':
                punishment = 2;
                break;
            case 'ban':
                punishment = 3;
                break;
            default:
                punishment = 0;
                break;
        }

        return punishment;
    }

    removeSpecialChars(string) {
        return string.toLowerCase().replace(/[^\w\s]/gi, '');
    }
}

module.exports = new BannedWords();