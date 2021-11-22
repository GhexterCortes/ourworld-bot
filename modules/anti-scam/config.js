const Yml = require('yaml');
const MakeConfig = require('../../scripts/makeConfig');

const scamDomains = require('./discordScamDomains.json');
const config = {
    punishment: {
        enabled: true,
        deleteMessage: true,
        banMember: true,
        ignoreBots: false,
        dmMember: {
            enabled: true,
            message: 'Your message was removed because of possible scam.'
        },
        reason: 'Discord scam'
    },
    reply: {
        enabled: true,
        embedColor: '#eb3a34',
        autoDeleteMessage: {
            enabled: true,
            timeMilliseconds: 5000
        },
        title: 'Scam detected!',
        description: '%username%, Scam link deleted.',
        footer: 'Antiscam module by Ghex#7338',
        addTimestamp: false
    },
    autoDetect: {
        enabled: true,
        channels: {
            blacklist: [],
            convertToWhitelist: false
        },
        mustContainLink: true,
        messageLengthLimit: 20,
        shouldMatchAllWords: true,
        scamWords: ['get', 'free']
    },
    domainNameMatch: {
        enabled: true,
        blacklistedDomains: scamDomains
    }
}

module.exports = Yml.parse(MakeConfig('./config/anti-scam.yml', config)); 