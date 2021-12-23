const Server = require('./server/');

const config = Server.getConfig('./config/serverPinger.yml');

class Create {
    constructor() {
        this.versions = ['1.4.1', '1.4.4'];
    }

    async start(Client) {
        Server.onMessage(Client, config);

        return true;
    }
}

module.exports = new Create();