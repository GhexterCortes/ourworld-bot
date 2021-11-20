const MakeConfig = require('../../scripts/makeConfig');
const Yml = require('yaml');

module.exports = (location) => {
    const config = {
        autoEmbedIp: {
            enabled: true,
            ignoreBots: true,
            fetchErrorLimit: 5,
            requireServerIP: true,
            deleteAfterInactive: true,
            disableMultipartUpload: true,
            allowedChannelIds: []
        },
        serverCommands: {
            enabled: true,
            deleteAfterInactive: false,
            disableMultipartUpload: true,
            fetchTimooutMilliseconds: 5000 * 2
        },
        messages: {
            pending: 'Loading...',
            noIpProvided: 'Please enter your server IP address',
            connectionError: 'Can\'t connect to server',
            alreadyUploaded: 'You have already provided your server address',
            serverEmbedDescription: 'This server is **online**.\n**%players_online%/%players_max%** players playing on **%server_version%**',
            embedColors: {
                online: "#43b582",
                error: "#ff3838",
                buffer: "#939393"
            }
        }
    };

    return Yml.parse(MakeConfig(location, config));
}