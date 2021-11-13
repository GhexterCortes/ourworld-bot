const MessageCommandBuilder = require('../../scripts/messageCommandBuilder');
const SafeMessage = require('../../scripts/safeMessage');

let whitelistOn = false;

module.exports.commands = [
    new MessageCommandBuilder()
        .setName('antibot')
        .setDescription('Anti Bot')
        .setExecute(async (args, message, Client) => {
            if(args.length < 1) return;

            if(args[0] == 'toggle') {
                await Client.channels.cache.get(config.consoleChannelId).send(`Anti Bot is set to: ${whitelistOn}`);
                whitelistOn = whitelistOn ? false : true;
            }
        })
];

module.exports.start = (Client, config) => {
    if(!config.antiBot.enabled) return;

    Client.on('messageCreate', async (message) => {
        if(message.author.id != config.serverBotId || message.channelId.toString() != config.consoleChannelId) return;

        const check = checkMessage(message.content, config.antiBot.botNameKeywords);
        if(!check || whitelistOn) return;

        console.log(`Bot name detected`);
        await underBotAttack(Client);

        setTimeout(async () => {
            await cooldownAttack(Client);
        }, config.antiBot.cooldown);
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