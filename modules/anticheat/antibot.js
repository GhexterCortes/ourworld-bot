const MessageCommandBuilder = require('../../scripts/messageCommandBuilder');
const SafeMessage = require('../../scripts/safeMessage');

let whitelistOn = false;
let config = {};

module.exports.commands = [
    new MessageCommandBuilder()
        .setName('antibot')
        .setDescription('Anti Bot')
        .setExecute(async (args, message, Client) => {
            if(args.length < 1) return;

            if(args[0] == 'toggle') {
                await SafeMessage.send(message.channel, `Under bot attack status was set to: ${(whitelistOn ? 'Sleep' : 'Active')}`);
                whitelistOn = whitelistOn ? false : true;

                if(whitelistOn) {
                    await underBotAttack(Client);
                } else {
                    await cooldownAttack(Client);
                }
            }
        })
];

module.exports.start = (Client, rawConfig) => {
    config = rawConfig;

    if(!config.antiBot.enabled) return;

    Client.on('messageCreate', async (message) => {
        if(message.author.id != config.serverBotId || message.channelId.toString() != config.consoleChannelId) return;

        const check = checkMessage(message.content, config.antiBot.botNameKeywords);
        if(!check || whitelistOn) return;

        console.log(`Bot name detected`);
        await underBotAttack(Client);
    });
}

async function cooldownAttack(Client) {
    for (const message of returnMessage(config.messages.botAttackCooldownMessage)) {
        const channelMessages = await Client.channels.cache.get(config.messagesChannelId);
        if(!channelMessages) break;

        await SafeMessage.send(channelMessages, message);
    }
    for (const command of returnMessage(config.messages.botAttackCooldownCommands)) {
        const consoleChannel = await Client.channels.cache.get(config.consoleChannelId);
        if(!consoleChannel) break;

        await SafeMessage.send(consoleChannel, command);
    }

    whitelistOn = false;
}

async function underBotAttack(Client) {
    for (const message of returnMessage(config.messages.underBotAttackMessage)) {
        const channelMessages = await Client.channels.cache.get(config.messagesChannelId);
        if(!channelMessages) break;

        await SafeMessage.send(channelMessages, message);
    }
    for (const command of returnMessage(config.messages.underBotAttackConsoleCommands)) {
        const consoleChannel = await Client.channels.cache.get(config.consoleChannelId);
        if(!consoleChannel) break;

        await SafeMessage.send(consoleChannel, command);
    }

    whitelistOn = true;
    setTimeout(async () => {
        await cooldownAttack(Client);
    }, config.antiBot.cooldown);
}

function returnMessage(message) {
    return typeof message === 'object' ? message : [message];
}

function checkMessage(content, keywords) {
    let match = 0;
    let requiredKeywordPrefix = 'UUID of player';

    for (const value of keywords) {
        if(content.indexOf(requiredKeywordPrefix) > -1 && content.indexOf(value) > -1) match++;
    }

    return match;
}