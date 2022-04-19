import fs from 'fs';
import yml from 'yaml';
import path from 'path';
import { RecipleScript, RecipleClient, version } from 'reciple';
import { Message, GuildMember } from 'discord.js';
import stringSmilarity from 'string-similarity';
import { errorEmbed } from './_errorEmbed';

export interface SpamManagerConfig {
    similarMessageCooldown: number;
    similarMessageThreshold: number;
    similarMessageLimit: number;
    timeoutDuration: number;
    timeoutReason: string;
    scamDomainThreshold: number;
    scamNameThreshold: number;
    scamDomainMessageLength: number;
    scamDomainKickReason: string;
    validDomains: string[];
}

export interface SentMessage {
    user_id: string;
    message: Message;
    sentTimes: number;
}

class SpamManager implements RecipleScript {
    public versions: string[] = [version];
    public config: SpamManagerConfig = SpamManager.getConfig();
    public sentMessages: SentMessage[] = [];

    public onStart() { return true; }

    public onLoad(client: RecipleClient) {
        client.on('messageCreate', async message => {
            if (message.author.bot || message.author.system || !message.member) return;
            
            const isScamMessage = this.isDiscordScamMessage(message.content);
            const isSpam = this.isSimilarMessageSpam(message.author.id, message);

            if (isScamMessage) {
                await this.kick(message.member);
                await message.delete().catch(() => {});
                await message.channel.send({ embeds: [errorEmbed(`**${message.author.tag}** was kicked for possible scam message`, false, false)] }).catch(() => {});
            }

            if (isSpam) {
                await this.timeout(message.member);
                await message.channel.send({ embeds: [errorEmbed(`**${message.author.tag}** You're sending similar messages too fast!`, false, false)] }).catch(() => {});
            }
        });
    }

    public isDiscordScamMessage(content: string): boolean {
        const urls = content.split(' ').filter(u => SpamManager.isUrl(u));
        if (!urls.length) return false;

        let foundSimilarDomain = false;

        for (const url of urls) {
            const domain = SpamManager.getDomain(url);
            if (!domain) continue;

            if (this.config.validDomains.includes(domain)) continue;
            if (this.config.validDomains.some(d => stringSmilarity.compareTwoStrings(d, domain) >= this.config.scamDomainThreshold || stringSmilarity.compareTwoStrings(d.split('.')[0], domain.split('.')[0]) >= this.config.scamNameThreshold)) {
                foundSimilarDomain = true;
                break;
            }
        }

        return content.length >= this.config.scamDomainMessageLength && foundSimilarDomain;
    }

    public isSimilarMessageSpam(user_id: string, message: Message) {
        let result = false;

        const existingMessage = this.sentMessages.find(sentMessage => sentMessage.user_id === user_id);
        if (existingMessage && existingMessage.message.channelId === message.channelId) {
            if ((existingMessage.message.createdTimestamp - message.createdTimestamp) <= this.config.similarMessageCooldown) {
                const similarity = stringSmilarity.compareTwoStrings(existingMessage.message.content.toLowerCase(), message.content.toLowerCase());
                
                if (similarity >= this.config.similarMessageThreshold) {
                    existingMessage.sentTimes++;
                    result = existingMessage.sentTimes > this.config.similarMessageLimit;
                }
            }
        }

        this.sentMessages = this.sentMessages.filter(sm => sm.user_id !== user_id);

        if (!result) {
            this.sentMessages.push({
                user_id,
                message,
                sentTimes: existingMessage ? existingMessage.sentTimes : 1,
            });
        }

        if (result || !existingMessage) {
            
            this.sentMessages.push({
                user_id,
                message,
                sentTimes: 1,
            });
        }

        return result;
    }

    public async timeout(member: GuildMember) {
        return member.isCommunicationDisabled() || !member.moderatable ? member.timeout(this.config.timeoutDuration, this.config.timeoutReason).catch(() => member) : member;
    }

    public async kick(member: GuildMember) {
        return member.kickable ? member.kick().catch(() => member) : member;
    }

    public static getConfig(): SpamManagerConfig {
        const configPath = path.join(process.cwd(), 'config/spam-manager/config.yml');
        if (!fs.existsSync(configPath)) {
            fs.mkdirSync(path.join(process.cwd(), 'config/spam-manager'), { recursive: true });
            fs.writeFileSync(configPath, yml.stringify({
                similarMessageCooldown: 1000,
                similarMessageThreshold: 0.8,
                similarMessageLimit: 10,
                timeoutDuration: 3 * 60 * 1000,
                timeoutReason: 'spam',
                scamDomainThreshold: 0.8,
                scamNameThreshold: 0.6,
                scamDomainMessageLength: 50,
                scamDomainKickReason: 'scam',
                validDomains: [
                    'discord.com',
                    'discordapp.com',
                    'discordapp.net',
                    'discord.gg',
                    'discord.co',
                    'discord.gift',
                    'discord.media',
                    'watchanimeattheoffice.com',
                    'bigbeans.solutions',
                    'dis.gd',
                    's.team',
                    'steam-chat.com',
                    'steamchina.com',
                    'steamcommunity.com',
                    'steamcontent.com',
                    'steamgames.com',
                    'steampowered.com',
                    'steampowered.com.8686c.com',
                    'steamstatic.com',
                    'steamstatic.com.8686c.com',
                    'steamusercontent.com',
                    'valve.net',
                    'valvesoftware.com'
                ]
            }));
        }

        return yml.parse(fs.readFileSync(configPath, 'utf8')) as SpamManagerConfig;
    }

    public static getDomain(url: string): string {
        const domain = url.split('/')[2];
        return domain.split(':')[0];
    }

    public static isUrl(url: string): boolean {
        return url.includes('http');
    }
}

module.exports = new SpamManager();