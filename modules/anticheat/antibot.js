const MessageCommandBuilder = require('../../scripts/messageCommandBuilder');
const SafeMessage = require('../../scripts/safeMessage');
const { Logger } = require('fallout-utility');

const log = new Logger('AntiBot');

let whitelistOn = false;
let config = {};

module.exports.commands = [
    new MessageCommandBuilder()
        .setName('antibot')
        .setDescription('Anti Bot')
        .addArgument('action', true, 'action for the anti bot', ['toggle', 'togglestatus'])
        .setExecute(async (args, message, Client) => {
            if(args.length < 1) return;

            if(args[0] == 'togglestatus') {
                await SafeMessage.send(message.channel, `Under bot attack status was set to: ${(whitelistOn ? 'Sleep' : 'Active')}`);
                whitelistOn = whitelistOn ? false : true;

                if(whitelistOn) {
                    await underBotAttack(Client);
                } else {
                    await cooldownAttack(Client);
                }
            } else if(args[0] == 'toggle') {
                config.antiBot.enabled = config.antiBot.enabled ? false : true;
                await SafeMessage.send(message.channel, `Antibot was ${ config.antiBot.enabled ? 'enabled' : 'disabled'}`);
            }
        })
];

module.exports.start = (Client, rawConfig) => {
    config = rawConfig;

    if(!config.antiBot.enabled) return;

    Client.on('messageCreate', async (message) => {
        if(message.author.id != config.serverBotId || message.channelId.toString() != config.consoleChannelId) return;

        const check = checkMessage(message.content, config.antiBot.botNameKeywords);
        if(!check || whitelistOn || !config.antiBot.enabled) return;

        log.log(`Bot name detected`);
        await underBotAttack(Client);
    });
}

async function cooldownAttack(Client) {
    const channelMessages = await Client.channels.cache.get(config.messagesChannelId);
    const consoleChannel = await Client.channels.cache.get(config.consoleChannelId);

    for (const message of returnMessage(config.messages.botAttackCooldownMessage)) {
        if(!channelMessages) break;

        await SafeMessage.send(channelMessages, message);
    }
    for (const command of returnMessage(config.messages.botAttackCooldownCommands)) {
        if(!consoleChannel) break;

        await SafeMessage.send(consoleChannel, command);
    }

    whitelistOn = false;
}

async function underBotAttack(Client) {
    const channelMessages = await Client.channels.cache.get(config.messagesChannelId);
    const consoleChannel = await Client.channels.cache.get(config.consoleChannelId);
    
    for (const message of returnMessage(config.messages.underBotAttackMessage)) {
        if(!channelMessages) break;

        await SafeMessage.send(channelMessages, message);
    }
    for (const command of returnMessage(config.messages.underBotAttackConsoleCommands)) {
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