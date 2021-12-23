const Message = require('./message/index.js');

class Create {
    constructor() {
        this.versions = ['1.4.4'];
        this.commands = Message.commands();
    }

    async start() {
        return true;
    }
}

module.exports = new Create();