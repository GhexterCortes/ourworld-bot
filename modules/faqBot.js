const Yml = require('yaml');
const Nlp = require('node-nlp');
const SafeMessage = require('../scripts/safeMessage');
const MakeConfig = require('../scripts/makeConfig');
const { MessageEmbed } = require('discord.js');
const { Logger } = require('fallout-utility');

const log = new Logger('FAQ Bot');
const manager = new Nlp.NlpManager({ languages: ['en'], nlu: { useNoneFeature: false } });
let scriptConfig = {};

class FaqBot {
    constructor() {
        this.versions = ['1.4.4'];
    }

    async start() {
        log.warn('Starting FAQ Bot');
        scriptConfig = this.getConfig('./config/faqBot.yml');

        try{
            await this.loadQueries(scriptConfig.queries);
            log.warn('FAQ Bot loaded');
            return true;
        } catch(err) {
            log.error(err);
            return false;
        }
    }

    loaded(Client) {
        log.warn('FAQ Bot listening to messages');
        Client.on('messageCreate', async (message) => {
            if((message.author.bot || message.author.system) || !this.checkWhitelist(scriptConfig.channelsWhiteList, message.channelId)) return;

            const response = await manager.process(message.content, message.language);

            console.log(response);
            if(response.answer) {
                log.warn(`FAQ Bot replied to asked: ${message.content}`);
                await SafeMessage.reply(message, !scriptConfig.messageSend.sendAsEmbed
                    ? 
                    response.answer 
                    : 
                    {
                        content: ' ',
                        embeds: [
                            new MessageEmbed()
                                .setDescription(response.answer)
                                .setColor(Client.AxisUtility.getConfig().embedColor)
                            ] 
                    });
            }
        });
    }

    checkWhitelist(whitelist, channelId) {
        if(whitelist.enabled && (
            whitelist.convertToBlacklist && !whitelist.channelIds.includes(channelId)
            ||
            !whitelist.convertToBlacklist && whitelist.channelIds.includes(channelId)
        ) || !whitelist.enabled) return true;

        return false;
    }

    async loadQueries(queries) {
        for (const query of queries) {
            if(!query.language) throw new Error('No language specified for a faq query ' + JSON.stringify(query));
            if(!query.id) throw new Error('No id specified for a faq query ' + JSON.stringify(query));
            if(!query.trigger) throw new Error('No trigger specified for a faq query ' + JSON.stringify(query));
            
            manager.addDocument(query.language, query.trigger, query.id);
            if(query.answer) manager.addAnswer(query.language, query.id, query.answer);
        }

        await manager.train();
        manager.save();
    }

    getConfig(location) {
        return Yml.parse(MakeConfig(location, {
            channelsWhiteList: {
                enabled: false,
                channelIds: ['ChannelIdHere'],
                convertToBlacklist: false
            },
            messageSend: {
                sendAsEmbed: false
            },
            queries: [
                {
                    language: 'en',
                    id: 'ask.version',
                    trigger: 'what\'s the version?',
                    answer: 'Currently supports 1.18-1.9.4'
                },
                {
                    language: 'en',
                    id: 'ask.ip',
                    trigger: 'what\'s the ip?',
                    answer: 'The ip is: `play.ourmcworld.ml`'
                }
            ]
        }));
    }
}

module.exports = new FaqBot();