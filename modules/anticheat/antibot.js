const MessageCommandBuilder = require('../../scripts/messageCommandBuilder');

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
    Client.on('messageCreate', (message) => {
        if(message.author.id != config.serverBotId || message.channelId.toString() != config.consoleChannelId) return;

        const check = checkMessage(message.content, config.antiBot.botNameKeywords);
        if(check == 0 || whitelistOn) return;

        console.log(`Bot name detected`);
        await underBotAttack();

        setTimeout(() => {
            cooldownAttack();
        }, config.antiBot.cooldown);
    });

    async function cooldownAttack() {
        for (const message of config.messages.botAttackCooldownMessage) {
            const channelMessages = await Client.channels.cache.get(config.messagesChannelId).catch(err => { console.log(err); return false; });
            if(!channelMessages) break;

            await SafeMessage.send(channelMessages, message);
        }
        for (const command of config.messages.botAttackCooldownCommands) {
            const consoleChannel = await Client.channels.cache.get(config.consoleChannelId).catch(err => { console.log(err); return false; });
            if(!consoleChannel) break;

            await SafeMessage.send(consoleChannel, command);
        }

        whitelistOn = false;
    }

    async function underBotAttack() {
        for (const message of config.messages.underBotAttackMessage) {
            const channelMessages = await Client.channels.cache.get(config.messagesChannelId).catch(err => { console.log(err); return false; });
            if(!channelMessages) break;

            await SafeMessage.send(channelMessages, message);
        }
        for (const command of config.messages.underBotAttackConsoleCommands) {
            const consoleChannel = await Client.channels.cache.get(config.consoleChannelId).catch(err => { console.log(err); return false; });
            if(!consoleChannel) break;

            await SafeMessage.send(consoleChannel, command);
        }

        whitelistOn = true;
    }
}

function checkMessage(content, keywords) {
    let match = 0;
    let requiredKeywordPrefix = 'UUID of player';

    for (const value of keywords) {
        if(content.indexOf(requiredKeywordPrefix) > -1 && content.indexOf(value) > -1) match++;
    }

    return match;
}