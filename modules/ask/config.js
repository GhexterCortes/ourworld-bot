const Fs = require('fs');
const Yml = require('yaml');

const config = {
    chatbotChannels: []
};

function createConfig() {
    if(!Fs.existsSync(`./config/ask.yml`)) Fs.writeFileSync(`./config/ask.yml`, Yml.stringify(config));

    return Yml.parse(Fs.readFileSync('./config/ask.yml', 'utf8'));
}

module.exports = createConfig();