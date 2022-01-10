const Message = require('./message/index.js');

class Create {
    constructor() {
        this.versions = ['1.6.0','1.6.1'];
        this.commands = Message.commands();
    }

    async onStart() {
        return true;
    }
}

module.exports = new Create();