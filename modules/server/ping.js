const { ping } = require('minecraft-protocol');
const { isNumber } = require('fallout-utility');

module.exports = async (ip) => {
    try {
        const host = getIp(ip);
        const port = getPort(ip);

        const connect = { host: host, port: port, closeTimeout: 5000 };
        const server = await ping(connect).catch(err => console.error(err.message, ip));
        
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
        console.error(err.message, ip);
        return null;
    }
}

function getPort(ip) {
    const port = ip.split(':');
    return parseInt(port[1]) && isNumber(port[1]) ? parseInt(port[1]) : null;
}

function getIp(ip) {
    ip = ip.split(':');
    return ip[0] ? ip[0] : null;
}