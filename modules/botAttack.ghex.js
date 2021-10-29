const Fs = require('fs');
const Yml = require('yaml');
const { Logger } = require('fallout-utility');

const log = new Logger('BotAttack');

module.exports = new Create();

function Create() {
    this.versions = ['1.1.0'];
    let whitelistOn = false;
    let scriptConfig = {};

    this.start = (client, action, conf, lang) => {
        scriptConfig = getScriptConfig();

        client.on('messageCreate', async (message) => {
            if(message.author.id != scriptConfig.serverBotId || message.channelId.toString() != scriptConfig.consoleChannelId) return;

            const check = checkMessage(message.content, scriptConfig.botNameKeywords);
            console.log(`Message check rate: ${check}`);

            if(check == 0 || whitelistOn) return;
            whitelistOn = true;
            console.log(`Bot name detected`);

            for (const command of scriptConfig.messages.underAttackConsoleCommands) {
                await message.channel.send(command).catch( err => { log.error(err); });
            }
        
            await client.channels.cache.get(scriptConfig.ingameChannelId).send(scriptConfig.messages.underAttack).catch( err => { log.error(err); });
        });

        return true;
    }
    this.execute = async (args, message, client, action) => {
        if(args.length == 0) return;
        if(args[0].toString().toLowerCase() != 'reset') return;

        whitelistOn = false;
        await message.reply('Resetting...');

        await client.channels.cache.get(scriptConfig.ingameChannelId).send(scriptConfig.messages.attackCooldownMessage).catch(err => { log.error(err); });
        for (const command of scriptConfig.messages.attackCooldownCommands) {
            await client.channels.cache.get(scriptConfig.consoleChannelId).send(command).catch( err => { log.error(err); });
        }
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

function getScriptConfig() {
    let defaultConfig = {
        botNameKeywords: ['McDown', 'McDown_pw'],
        serverBotId: '',
        consoleChannelId: '',
        ingameChannelId: '',
        messages: {
            underAttack: "Bot username keyword detected.\n**Server Under Bot Attack enabled!**\n```yml\nTurning on whitelist\n```",
            underAttackConsoleCommands: ['whitelist on', 'whitelist reload'],
            attackCooldownMessage: "Resetting bot name detection.\n**Server bot name detection reset!**\n```yml\nTurning off whitelist\n```",
            attackCooldownCommands: ['whitelist off', 'whitelist reload']
        }
    };

    const configLocation = './config/botAttack.yml';

    if(!Fs.existsSync(configLocation)) { Fs.writeFileSync(configLocation, Yml.stringify(defaultConfig)) }

    return Yml.parse(Fs.readFileSync(configLocation, 'utf-8'));
}