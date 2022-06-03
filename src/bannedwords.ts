import { Logger } from 'fallout-utility';
import path from 'path';
import yml from 'yaml';
import stringSimilarity from 'string-similarity-js';
import { weirdToNormalChars } from 'weird-to-normal-chars';
import { isIgnoredChannel, RecipleClient, RecipleScript, version } from 'reciple';
import { createConfig } from './_createConfig';
import { MessageEmbed, TextChannel } from 'discord.js';

export interface BannedWordsConfig {
    bannedWords: {
        word: string;
        allowInNSFW?: boolean;
        punishment: 'kick' | 'ban' | 'mute' | '';
    }[],
    similarWordThreshold: number
}

export class BannedWords implements RecipleScript {
    public versions: string[] = ['1.3.x'];
    public client?: RecipleClient;
    public logger: Logger = new Logger('BannedWords');
    public config: BannedWordsConfig = BannedWords.getConfig();

    public onStart(client: RecipleClient) {
        this.client = client;
        this.logger = this.client.logger.cloneLogger();
        this.logger.defaultPrefix = 'BannedWords';

        this.logger.info('Loaded banned words');

        return true;
    }

    public onLoad() {
        this.client?.on('messageCreate', async message => {
            if (message.author.bot || message.author.system) return;
            if (isIgnoredChannel(message.channelId, this.client!.config!.ignoredChannels)) return;

            const words = weirdToNormalChars(message.content).toLowerCase().split(' ');
            let explicitWords = BannedWords.checkExplicity(words, this.config.bannedWords, this.config.similarWordThreshold, (message.channel as TextChannel)?.nsfw);
            if (!explicitWords.words.length) return;

            this.logger.debug(`${message.author.username} (${message.author.id}) in ${message.channelId} said: ${message.content}`);

            message.delete().catch(() => {});

            if (!explicitWords.punishment) return;

            const embed = new MessageEmbed()
                .setAuthor({ name: `Banned ${explicitWords.words.length > 1 ? 'words' : 'word'}` })
                .setDescription(`||\`${explicitWords.words.join('`|| ||`')}\`||`)
                .addField('Punishment', `\`${explicitWords.punishment.toUpperCase()}\``)
                .setColor('RED');

                message.channel.send({ embeds: [embed] }).catch(() => {});

            switch (explicitWords.punishment) {
                case 'kick':
                    if (!message.member?.kickable) break;
                    await message.member?.kick().catch(err => this.logger.error(err));
                    break;
                case 'ban':
                    if (!message.member?.bannable) break;
                    await message.member?.ban().catch(err => this.logger.error(err));
                    break;
                case 'mute':
                    if (message.member?.isCommunicationDisabled()) break;
                    await message.member?.timeout(1000 * 60 * 1).catch(err => this.logger.error(err));
                    break;
            }
        });
    }

    public static checkExplicity(words: string[], explicitWords: BannedWordsConfig['bannedWords'], stringSimilarityThreshold: number = 0.6, nsfw: boolean = false): { words: string[], punishment: string } {
        let punishment: string = '';

        words = words.map(w => this.clean(w));

        const matched = explicitWords.filter(word => {
            word.word = this.clean(word.word);

            const match = words.includes(word.word.toLowerCase()) ||
                words.some(w => stringSimilarity(word.word, w) >= stringSimilarityThreshold);

            if (nsfw && word.allowInNSFW) return false;
            if (!match) return false;

            switch (word.punishment) {
                case 'ban':
                    if (punishment == 'kick' || punishment == 'mute' || !punishment) punishment = 'ban';
                    break;
                case 'kick':
                    if (punishment == 'mute' || !punishment) punishment = 'kick';
                    break;
                case 'mute':
                    if (!punishment) punishment = 'mute';
            }

            return true;
        });

        return { words: matched.map(w => w.word), punishment };
    }

    public static clean(str: string): string {
        return str.replace(/[^\w\s]/gi, '');
    }

    public static getConfig(): BannedWordsConfig {
        const configPath = path.join(process.cwd(), 'config/bannedwords/config.yml');
        const defaultConfig: BannedWordsConfig = {
            bannedWords: [
                { word: 'bitch', punishment: 'mute' }
            ],
            similarWordThreshold: 0.6
        }; 

        return yml.parse(createConfig(configPath, defaultConfig));
    }
}

export default new BannedWords();
