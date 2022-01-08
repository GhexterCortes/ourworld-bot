const Database = require('./_database');
const { SafeMessage, SafeInteract } = require('../scripts/safeActions');
const { InteractionCommandBuilder } = require('../scripts/builders');
const MakeConfig = require('../scripts/makeConfig');
const StringSmilarity = require('string-similarity');
const { MessageEmbed } = require('discord.js');
const Yml = require('yaml');

class BannedWords {
    constructor() {
        this.versions = ['1.6.0'];
        this.scriptConfig = this.getConfig('./config/bannedWords/config.yml');
        this.database = new Database(this.scriptConfig.database.databaseGuildId, this.scriptConfig.database.databaseChannelId, this.scriptConfig.database.databaseName);
    }

    async onStart(Client) {

        this.commands = [
            new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('bannedwords')
                    .setDescription('Modify bannedwords')
                    .addSubcommand(add => add
                        .setName('add')
                        .setDescription('Ban a word')
                        .addStringOption(word => word
                            .setName('word')
                            .setDescription('The word to ban')
                            .setRequired(true)
                        )
                    )    
                    .addSubcommand(remove => remove
                        .setName('remove')
                        .setDescription('Remove banned word')
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

        await this.database.start(Client);
        await this.database.fetchData(this.scriptConfig.database.databaseMessageId, true);
        return true;
    }

    getConfig(location) {
        return Yml.parse(MakeConfig(location, {
            database: {
                databaseGuildId: '',
                databaseChannelId: '',
                databaseMessageId: '',
                databaseName: 'BannedWords',
            },
            matchingPercentage: 0.8
        }));
    }

    async execute(interaction, Client) {
        const command = interaction.options.getSubcommand();

        switch(command) {
            case 'list':
                const words = this.database.response.words;

                if(!words.length) return SafeInteract.reply(interaction, 'No words are banned');
                return SafeInteract.reply(interaction, { content: ' ', embeds: [
                    new MessageEmbed()
                        .setAuthor({ name: 'Banned words' })
                        .setDescription(`||${words.join('||\n||')}||`)
                        .setColor('RED')
                ] });
            case 'add':
                const word = interaction.options.getString('word');

                if(!word || word == '@a') return SafeInteract.reply(interaction, 'Please provide a word');
                if(await this.addBannedWord(word.replace(/\n/g, ' ').split(' '))) {
                    return SafeInteract.reply(interaction, { content: ' ', embeds: [ new MessageEmbed().setColor('RED').setDescription('`'+ word.replace(/\n/g, ' ').split(' ').join('`, `') +'` banned!') ] });
                } else {
                    return SafeInteract.reply(interaction, 'Can\'t add word to banned words');
                }
            case 'remove':
                const removeWord = interaction.options.getString('word');

                if(!removeWord) return SafeInteract.reply(interaction, 'Please provide a word');
                if(!this.database.response.words.includes(removeWord) && removeWord != '@a') return SafeInteract.reply(interaction, 'Word is not banned');
                
                const bannedWords = this.database.response.words.filter(w => w !== removeWord && removeWord !== '@a');

                try {
                    await this.database.update({ words: bannedWords });
                    return SafeInteract.reply(interaction, { content: ' ', embeds: [ new MessageEmbed().setColor('RED').setDescription('`'+ removeWord +'` removed from banned words') ] });
                } catch(err) {
                    return SafeInteract.reply(interaction, 'Can\'t remove word from banned words');
                }
        }

        await this.database.automaticFetch();
    }

    async onLoad(Client) {
        if(!this.database.response || !Object.keys(this.database.response).length || !this.database.response?.words) await this.startDatabase();

        Client.on('messageCreate', async (message) => {
            if(!message.content) return false;

            const words = this.database.response.words;
            const content = this.removeSpecialChars(message.content.toLowerCase()).split(' ');

            if(!words.length || !content) return false;

            let bannedWords = content.filter(w => words.some(bw => {
                return w.toLowerCase().startsWith(bw.toLowerCase()) || StringSmilarity.compareTwoStrings(w, bw) >= this.scriptConfig.matchingPercentage;
            }));
                bannedWords = bannedWords.filter((val, index, self) => self.indexOf(val) === index);
            const embed = new MessageEmbed();

            if(!bannedWords.length) return false;
            if(message.author.bot) return SafeMessage.delete(message);

            embed.setAuthor({ name: (bannedWords.length > 1 ? 'Banned words' : 'Banned word') });
            embed.setDescription('```\n'+ bannedWords.join(', ') +'\n```');
            embed.setColor('RED');
            
            const reply = await SafeMessage.reply(message, { content: 'Foker timed out for 10s', embeds: [embed] });

            await message?.member?.timeout(10000, 'Banned words').catch(err => true);

            await SafeMessage.react(message, '🇫');
            await SafeMessage.react(message, '🇴');
            await SafeMessage.react(message, '🇰');
            await SafeMessage.react(message, '🇪');
            await SafeMessage.react(message, '🇷');

            setTimeout(async () => {
                await SafeMessage.delete(message);
                await SafeMessage.delete(reply);
            }, 3000);
        });
    }

    async startDatabase() {
        return this.database.update({
            words: []
        });
    }

    async addBannedWord(word) {
        if(!word) return false;
        await this.database.automaticFetch();

        switch(typeof word) {
            case 'string':
                word = [this.removeSpecialChars(word)];
                break;
            case 'object':
                word.map(w => this.removeSpecialChars(w));
                break;
            default:
                return false;
        }

        if(!word.length) return false;
        word.filter(w => w.length > 0 && !this.database.response?.words.includes(w));
        let words = [...this.database.response.words, ...word];
        
        words = words.filter((val, index, self) => self.indexOf(val) === index);
        try {
            await this.database.update({
                words: words
            });

            return true;
        } catch(err) {
            return false;
        }
    }

    removeSpecialChars(string) {
        return string.toLowerCase().replace(/[^\w\s]/gi, '');
    }
}

module.exports = new BannedWords();