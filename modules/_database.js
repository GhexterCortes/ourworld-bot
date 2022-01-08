const { SafeMessage } = require('../scripts/safeActions');
const { MessageEmbed } = require('discord.js');

module.exports = class Database {
    constructor(ServerId, ChannelId, databaseName = 'Database') {
        this.guild = ServerId ? ServerId : false;
        this.channel = ChannelId && this.guild ? ChannelId : false;
        this.messageData = null;
        this.messageId = null;

        this.databaseName = databaseName;
        this.response = {};
    }

    async start(Client) {
        this.guild = this.guild ? await Client.guilds.fetch(this.guild) : new TypeError('ServerId is not defined');
        this.channel = this.channel && this.guild ? await this.guild.channels.fetch(this.channel) : new TypeError('Channel not found');

        if(this.guild instanceof Error) throw this.guild;
        if(this.channel instanceof Error) throw this.channel;
        return this;
    }

    async fetchData(messageId, matchDatabaseName = false) {
        let fetchedMessage = messageId ? await this.channel.messages.fetch(messageId) : await SafeMessage.send(this.channel, { 
            content: ' ',
            embeds: [
                new MessageEmbed()
                    .setAuthor({ name: `${this.databaseName} ${new Date().toDateString()}` })
                    .setDescription(JSON.stringify({}))
                    .setFooter({ text: 'Database script made by BlobHuman and GhexterCortes - Last Update ' })
                    .setTimestamp()
                ]
            });

        this.messageData = fetchedMessage ? fetchedMessage : new TypeError('Message not found');
        this.messageId = messageId ? messageId : fetchedMessage.id;

        if(this.messageData instanceof Error) throw this.messageData;
        if(matchDatabaseName) {
            if(!this.databaseName) throw new TypeError('DatabaseName is not defined');
            if(!this.messageData.embeds[0].author.name.includes(this.databaseName)) throw new Error('Message does not match database name');
        }

        this.response = JSON.parse(this.messageData.embeds[0].description);
        return this;
    }

    async automaticFetch() {
        if(!this.messageId) throw new TypeError('MessageId is not defined');
        return this.fetchData(this.messageId);
    }

    async update(newData) {
        if(!newData || typeof newData !== 'object') throw new TypeError('invalid NewData');
        if(!this.messageData) throw new Error('Database is not loaded');

        this.messageData = await SafeMessage.edit(this.messageData, {
            content: ' ',
            embeds: [
                new MessageEmbed()
                    .setAuthor({ name: `${this.databaseName} ${new Date().toDateString()}` })
                    .setDescription(JSON.stringify(newData))
                    .setFooter({ text: 'Database script made by BlobHuman and GhexterCortes - Last Update ' })
                    .setTimestamp()
                ]
        });
        
        return this.automaticFetch();
    }

    async deleteDatabase() {
        if(!this.messageData) throw new Error('Database is not loaded');
        if(!this.messageId) throw new TypeError('MessageId is not defined');

        await this.messageData.delete();
        this.messageData = null;
        this.messageId = null;

        return this;
    }
};