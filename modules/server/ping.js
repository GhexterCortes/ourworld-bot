const { ping } = require('minecraft-protocol');

module.exports = async (ip) => {
    try {
        const server = await ping({ host: ip, closeTimeout: 5000 }).catch(err => console.error(err.message));
        
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
        console.error(err.message);
        return null;
    }
}