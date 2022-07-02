import { Logger, replaceAll } from 'fallout-utility';
import yml from 'yaml';
import path from 'path';
import { RecipleClient, RecipleScript } from 'reciple';
import { createConfig } from './_createConfig';
import { TextChannel } from 'discord.js';
import stringSimilarity from 'string-similarity-js';
import { weirdToNormalChars } from 'weird-to-normal-chars';

export interface BannedWordsMCConfig {
    bannedWords: {
        word: string;
        command: string;
    }[],
    executedCommandLimit: number,
    chatUsernameSeparator: string,
    consoleBotIds: string[],
    gameChannels: string[],
    consoleChannels: string[],
    similarWordThreshold: number
}

export class BannedWordsMC implements RecipleScript {
    public versions: string[] = ['1.6.x'];
    public client?: RecipleClient;
    public logger: Logger = new Logger('BannedWords-MC');
    public config = BannedWordsMC.getConfig();
    public consoleChannels: TextChannel[] = [];

    public onStart(client: RecipleClient) {
        this.client = client;
        this.logger = this.client.logger.cloneLogger();
        this.logger.defaultPrefix = 'BannedWords-MC';

        this.logger.info('Loaded banned words for minecraft');

        return true;
    }

    public async onLoad() {
        this.logger.debug('Loading console channels');

        for (const channelId of this.config.consoleChannels) {
            const channel = this.client?.channels.cache.find(c => c.id === channelId && c.type == 'GUILD_TEXT') ?? await this.client?.channels.fetch(channelId).then(c => c?.type == 'GUILD_TEXT' ? c : undefined).catch(() => undefined) ?? undefined;
            if (!channel) continue;

            this.consoleChannels.push(channel as TextChannel);
            this.logger.debug(`Loaded console channel ${channel.id}`);
        }

        this.client?.on('messageCreate', async message => {
            if (!message.inGuild() || !message.author.bot || !this.config.consoleBotIds.includes(message.author.id)) return;
            if (!this.config.gameChannels.includes(message.channelId)) return;

            const data = this.separateUsernameChat(message.content);
            if (!data.author) return;

            const check = BannedWordsMC.checkExplicity(weirdToNormalChars(data.message).split(' '), this.config.bannedWords, this.config.similarWordThreshold);

            if (!check.words.length) return;

            const commands = check.commands.map(c => c ? replaceAll(c, '%player%', data.author) : c).splice(0, this.config.executedCommandLimit);

            this.logger.debug(`${data.author} used banned words: ${check.words.join(', ')}`);

            for (const channel of this.consoleChannels) {
                message.channel.send(`**${data.author}** used banned ${check.words.length > 1 ? 'words' : 'word'}: ||${check.words.join('|| ||')}||`).catch(err => this.logger?.error(err));
                
                for (const command of commands) {
                    if (!command) { continue; }
                    await channel.send(command).catch(err => this.logger?.error(err));
                }
            }
        });
    }

    public separateUsernameChat(message: string): { author: string; message: string; } {
        const split = message.split(this.config.chatUsernameSeparator);
        if (split.length < 2) return { author: '', message: BannedWordsMC.clean(message) };

        const msg = split.pop() ?? '';
        const author = split.pop()?.split(' ').pop() ?? '';

        return { author, message: BannedWordsMC.clean(msg) };
    }

    public static checkExplicity(words: string[], explicitWords: BannedWordsMCConfig['bannedWords'], stringSimilarityThreshold: number = 0.6): { words: string[], commands: string[] } {
        let commands: string[] = [];

        const matched = explicitWords.filter(word => {
            const match = words.includes(word.word.toLowerCase()) ||
                words.some(w => stringSimilarity(word.word, w) >= stringSimilarityThreshold);

            if (!match) return false;

            commands.push(word.command);

            return true;
        });

        return { words: matched.map(w => w.word), commands };
    }

    public static clean(str: string): string {
        return str.replace(/[^\w\s]/gi, '');
    }

    public static getConfig(): BannedWordsMCConfig {
        const configPath = path.join(process.cwd(), 'config/bannedwords-mc/config.yml');
        const defaultConfig: BannedWordsMCConfig = {
            bannedWords: [
                {
                    word: 'bitch',
                    command: 'warn %player% bad language'
                }
            ],
            executedCommandLimit: 1,
            chatUsernameSeparator: '>',
            consoleBotIds: ['000000000000000000', '000000000000000000'],
            gameChannels: ['000000000000000000', '000000000000000000'],
            consoleChannels: ['000000000000000000', '000000000000000000'],
            similarWordThreshold: 0.6
        };

        return yml.parse(createConfig(configPath, defaultConfig));
    }
}

export default new BannedWordsMC();
