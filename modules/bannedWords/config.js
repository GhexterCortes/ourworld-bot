const MakeConfig = require('../../scripts/makeConfig');
const Yml = require('yaml');

module.exports = (location) => {
    return Yml.parse(MakeConfig(location, {
        database: {
            databaseGuildId: '',
            databaseChannelId: '',
            databaseMessageId: '%messageId%',
            databaseName: 'BannedWords',
        },
        wordMatching: {
            caseSensitive: false,
            fullWord: false,
            ignoreBots: false,
            deleteMatchedMessage: true,
            defaultPunishment: 'timeout',
            similarityMatch: {
                enabled: true,
                percentage: 0.8
            }
        },
        punishments: {
            timeout: {
                duration: '1h',
                defaultReason: 'You have been timed out for using a banned word.'
            },
            kick: {
                defaultReason: 'You have been kicked for using a banned word.'
            },
            ban: {
                defaultReason: 'You have been banned for using a banned word.'
            }
        }
    }));
}