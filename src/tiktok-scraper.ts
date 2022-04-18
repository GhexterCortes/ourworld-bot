import { TTScraper as TikTok } from 'tiktok-scraper-ts';
import { MessageEmbed } from 'discord.js';
import { isIgnoredChannel, RecipleClient, RecipleScript } from 'reciple';

class TikTokScraper implements RecipleScript {
    public versions: string[] = ['1.0.11'];
    public scraper: TikTok = new TikTok();
    
    public onStart() { return true; }

    public onLoad(client: RecipleClient) {
        client.on('messageCreate', async message => {
            if (message.author.bot || message.author.system || isIgnoredChannel(message.channelId, client.config?.ignoredChannels)) return;
            if (!TikTokScraper.isTikTokDomain(message.content)) return;

            const video = await this.scraper.video(message.content).catch(() => null);
            if (!video) { client.logger.error(`An error occured while trying to fetch TikTok URL: ${message.content}`, 'TikTokScraper'); return; }

            const embed = new MessageEmbed()
                .setAuthor({ name: video?.author ? `@${video?.author}` : 'Unknown Author' })
                .setDescription(video.description ? TikTokScraper.formatDescription(video.description) : ' ')
                .setFooter({ text: `💬 ${TikTokScraper.formatNumber(video.commentCount ?? 0)} 💖 ${TikTokScraper.formatNumber(video.likesCount ?? 0)} 👀 ${TikTokScraper.formatNumber(video.playCount ?? 0)}` })
                .setURL(video.downloadURL)
                .setColor('BLUE');

            const reply = await message.reply({
                content: ' ',
                embeds: [embed],
                files: [
                    {
                        attachment: video.downloadURL,
                        name: video.id + '.' + video.format
                    }
                ]
            }).catch(() => null);

            if (reply) await message.suppressEmbeds().catch(() => null);
        });
    }

    public static isTikTokDomain(url: string): boolean {
        return url.includes('tiktok.com');
    }

    public static formatNumber(num: number): string {
        if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}b`;
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}m`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
        return num.toString();
    }

    public static formatDescription(description: string): string {
        // bold mentions
        description = description.replace(/\B@\w+/g, '`$&`');

        // bold words starting with #
        description = description.replace(/\B#\w+/g, '**$&**');

        return description;
    }
}

module.exports = new TikTokScraper();