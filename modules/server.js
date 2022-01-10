const Server = require('./server/');

const config = Server.getConfig('./config/serverPinger/config.yml');

class Create {
    constructor() {
        this.versions = ['1.6.0','1.6.1'];
    }

    async onStart(Client) {
        Server.onMessage(Client, config);

        return true;
    }
}

module.exports = new Create();