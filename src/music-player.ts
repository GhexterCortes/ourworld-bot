import yml from 'yaml';
import fs from 'fs';
import { Player, PlayerInitOptions, Queue, Track } from 'discord-player';
import { InteractionCommandBuilder, MessageCommandBuilder, RecipleClient, RecipleScript, version } from 'reciple';
import path from 'path';
import { createConfig } from './_createConfig';
import { getRandomKey, Logger } from 'fallout-utility';
import { GuildMember, Message, MessageActionRow, MessageButton, MessageEmbed, TextChannel } from 'discord.js';
import { errorEmbed } from './_errorEmbed';

export interface MusicPlayerConfig {
    playerOptions: PlayerInitOptions;
    messages: { [key: string]: string };
    sendCurrentlyPlaying: boolean;
    deletedSentPlayedMessage: boolean;
}

export type QueueMetadata = { channel: TextChannel };

export class MusicPlayer implements RecipleScript {
    public versions: string[] = [version];
    public commands?: (MessageCommandBuilder | InteractionCommandBuilder)[] = [];
    public config: MusicPlayerConfig = MusicPlayer.getConfig();
    public client?: RecipleClient;
    public logger?: Logger;
    public player?: Player;

    public async onStart(client: RecipleClient) {
        this.client = client;
        this.player = new Player(client, this.config.playerOptions);

        this.logger = this.client.logger.cloneLogger();
        this.logger.defaultPrefix = 'MusicPlayer';

        this.loadCommands(this.client.config?.modulesFolder ?? 'modules');

        this.player.on('error', async (q, e) => {
            this.logger?.error(`Error in queue ${q.id} in guild ${q.guild.name}`);
            this.logger?.error(e);

            if (!q.destroyed) q.destroy(true);

            const queue = q as Queue<QueueMetadata>;
            await queue.metadata?.channel.send({ embeds: [errorEmbed(this.getMessage('error'))] }).catch(() => {});
        });

        this.player.on('connectionError', async (q, e) => {
            this.logger?.error(`Connection error for queue ${q.id} in guild ${q.guild.name}`);
            this.logger?.error(e);

            if (!q.destroyed) q.destroy(true);

            const queue = q as Queue<QueueMetadata>;
            await queue.metadata?.channel.send({ embeds: [errorEmbed(this.getMessage('connectionError'))] }).catch(() => {});
        });

        this.player.on('trackStart', async (q: Queue, track: Track) => {
            const queue = q as Queue<QueueMetadata>;
            const channel = queue.metadata?.channel;
            if (!channel || !this.config.sendCurrentlyPlaying) return;

            const embed = new MessageEmbed().setColor('BLUE');

            embed.setDescription(`Requested by **${track.requestedBy.tag}**`);
            embed.setThumbnail(track.thumbnail);
            embed.setTitle(track.title);
            embed.setURL(track.url);

            const buttons: MessageActionRow = MusicPlayer.getPlayingButtons();
            const message = await channel.send({ embeds: [embed], components: [buttons] });

            if (!message) return;

            const collector = this.addPlayingCollector(message, track, queue);

            queue.connection.once('start', (a) => {
                if (a.metadata.id === track.id) return;
                collector.stop();
            });

            queue.connection.once('finish', (a) => {
                if (a.metadata.id !== track.id) return;
                collector.stop();
            });
       });

        return true;
    }

    public addPlayingCollector(message: Message, track: Track, queue: Queue) {
        const collector = message.createMessageComponentCollector({
            filter: (c) => c.customId === 'play-pause' || c.customId === 'skip' || c.customId === 'stop'
        });

        collector.on('collect', async (c) => {
            if (queue.destroyed) { collector.stop(); await c.deferUpdate().catch(() => {}); return; }
            if (queue.nowPlaying().id !== track.id) { collector.stop(); await c.deferUpdate().catch(() => {}); return; }
            if ((c.member as GuildMember).voice.channelId !== queue.connection.channel.id) { await c.deferUpdate().catch(() => {}); return; }

            switch (c.customId) {
                case 'play-pause':
                    const action = this.togglePlayPause(queue);
                    switch (action) {
                        case 'UNPAUSED':
                            await c.reply({ embeds: [errorEmbed(this.getMessage('unpaused', track.title), true, false)], ephemeral: true }).catch(() => {});
                            break;
                        case 'PAUSED':
                            await c.reply({ embeds: [errorEmbed(this.getMessage('paused', track.title), true, false)], ephemeral: true }).catch(() => {});
                            break;
                        case 'FAILED':
                            await c.reply({ embeds: [errorEmbed(this.getMessage('error'))], ephemeral: true }).catch(() => {});
                            break;
                    }

                    break;
                case 'skip':
                    const skip = queue.skip();

                    if (skip) {
                        await c.reply({ embeds: [errorEmbed(this.getMessage('skipped', track.title), true, false)], ephemeral: true }).catch(() => {});
                    } else {
                        await c.reply({ embeds: [errorEmbed(this.getMessage('error', track.title))], ephemeral: true }).catch(() => {});
                    }

                    break;
                case 'stop':
                    queue.destroy();
                    await c.reply({ embeds: [errorEmbed(this.getMessage('stopped', track.title), false, false)], ephemeral: true }).catch(() => {});
                    break;
            }

            await c.deferUpdate().catch(() => {});
        });

        collector.on('end', async () => {
            if (this.config.deletedSentPlayedMessage) { await message.delete().catch(() => {}); return; }

            await message.edit({ components: [MusicPlayer.getPlayingButtons(true)] }).catch(() => {});
        });

        return collector;
    }

    public togglePlayPause(queue: Queue) {
        return (queue.setPaused(false) ? 'UNPAUSED' : false) || (queue.setPaused(true) ? 'PAUSED' : false) || 'FAILED';
    }

    public getMessage(key: string, ...placeholders: string[]): string {
        let message = getRandomKey(this.config.messages[key]) ?? `${key}`;

        let id = 0;
        for (const placeholder of placeholders) {
            message = message.replace(`{${id}}`, placeholder);
            id++;
        }

        return message;
    }

    public loadCommands(modulesDir: string): MusicPlayer {
        const commandsDir = path.join(process.cwd(), modulesDir, 'music/commands');
        if (!fs.existsSync(commandsDir)) fs.mkdirSync(commandsDir, { recursive: true });

        const files = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
        for (const file of files) {
            try {
                let script = require(path.join(commandsDir, file));
                if (script.default) script = script.default;
                
                this.commands = [...script(this), ...(this.commands ?? [])];
            } catch (e) {
                this.logger?.error(`Failed to load command ${path.join(commandsDir, file)}`);
                this.logger?.error(e);
            }
        }

        return this;
    }

    public static getPlayingButtons(disabled: boolean = false) {
        return new MessageActionRow().setComponents([
            new MessageButton()
                .setCustomId('play-pause')
                .setLabel('Pause/Resume')
                .setStyle('PRIMARY')
                .setDisabled(disabled),
            new MessageButton()
                .setCustomId('skip')
                .setLabel('Skip')
                .setStyle('SECONDARY')
                .setDisabled(disabled),
            new MessageButton()
                .setCustomId('stop')
                .setLabel('Stop')
                .setStyle('DANGER')
                .setDisabled(disabled)
        ]);
    }

    public static getDefaultConfig(): MusicPlayerConfig {
        return {
            playerOptions: {},
            messages: {
                notAMember: 'You are not a member of a server I\'m in.',
                joinVoiceChannel: 'Join a voice channel',
                joinSameVoiceChannel: 'Join voice channel I am already in',
                connectionError: 'Connection Error',
                noResult: 'No results found for `{0}`',
                noQueue: 'No queue found',
                noQuery: 'No query provided',
                notPlaying: 'Not playing anything',
                error: 'An error occurred',
                noTracks: 'No tracks in queue',
                trackNotFound: 'Track not found',
                loopQueue: 'Looping queue',
                loopTrack: 'Looping track **{0}**',
                loopOff: 'Turned off looping',
                clearQueue: 'Cleared **{0}** tracks from queue',
                shuffleQueue: 'Shuffled queue',
                removedTrack: 'Removed track **{0}** from queue',
                paused: 'Paused **{0}**',
                unpaused: 'Resumed **{0}**',
                skipped: 'Skipped Track **{0}**',
                stopped: 'Player Stopped'
            },
            sendCurrentlyPlaying: true,
            deletedSentPlayedMessage: false
        };
    }

    public static getConfig(): MusicPlayerConfig {
        const configPath = path.join(process.cwd(), 'config/music-player/config.yml');

        return yml.parse(createConfig(configPath, MusicPlayer.getDefaultConfig()));
    }
}

module.exports = new MusicPlayer();
