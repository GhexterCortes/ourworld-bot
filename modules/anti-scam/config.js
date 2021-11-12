const Yml = require('yaml');
const MakeConfig = require('../../scripts/makeConfig');

const scamDomains = require('./discordScamDomains.json');
const config = {
    banOffenders: {
        enabled: true,
        reason: 'Discord scam'
    },
    reply: {
        enabled: true,
        title: 'Scam detected!',
        description: '%username%, Scam link deleted.',
        footer: 'Antiscam module by Ghex#7338',
        addTimestamp: false
    },
    blacklistedDomains: scamDomains
}

module.exports = Yml.parse(MakeConfig('./config/anti-scam.yml', config)); 