const { ping } = require('minecraft-protocol');

module.exports = async (ip) => {
    try {
        const status = await ping(ip);
        
        if(!server
            ||
            server?.description === '§4Server not found.'
            ||
            server?.version.name === "§4● Offline"
            ||
            server?.players.max == 0
        ) return null;

        return server;

    } catch (err) {
        console.error(err);
        return null;
    }
}