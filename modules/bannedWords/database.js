const Database = require('../_database');
const MakeConfig = require('../../scripts/makeConfig');
const { replaceAll } = require('fallout-utility');
const Fs = require('fs');

module.exports = class BannedWordsDatabase {
    constructor(options = { databaseGuildId, databaseChannelId, databaseMessageId, databaseName }) {
        this.databaseGuildId = options.databaseGuildId;
        this.databaseChannelId = options.databaseChannelId;
        this.databaseMessageId = options.databaseMessageId;
        this.databaseName = options.databaseName;

        if(!this.databaseGuildId || !this.databaseChannelId || !this.databaseName) {
            throw new Error('Invalid database options');
        }

        this.database = new Database(this.databaseGuildId, this.databaseChannelId, this.databaseName);
    }

    async start(Client) {
        await this.database.start(Client);
        await this.database.fetchData(this.databaseMessageId ? this.databaseMessageId : null, true);
        
        if(!this.databaseMessageId) MakeConfig('./config/bannedWords/config.yml', replaceAll(Fs.readFileSync('./config/bannedWords/config.yml', 'utf8'), '%messageId%', this.database.messageId), true);
        return this;
    }

    async fetch() {
        await this.database.automaticFetch();
        return this.database.response;
    }

    getData() {
        return this.database.response;
    }

    async setData(data) {
        await this.database.update(data ? data : { words: [] });

        return this.database.response;
    }

    async addData(options = { word: null, punishment: 'timeout' }) {
        const data = this.getData();
        const words = data.words;

        if(!options.word) throw new Error('Invalid word');

        words.push({
            word: options.word,
            punishment: options.punishment
        });

        await this.setData({ words: words });

        return this.database.response;
    }

    async removeData(word, caseSensitive = false) {
        const data = this.getData();
        const words = data.words;

        if(!word) throw new Error('Invalid word');

        words.filter(w => caseSensitive && w.word !== word || !caseSensitive && w.word.toLowerCase() !== word.toLowerCase());

        await this.setData({ words: words });

        return this.database.response;
    }
}