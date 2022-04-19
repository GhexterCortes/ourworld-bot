import { InteractionCommandBuilder, MessageCommandBuilder, RecipleClient, RecipleScript, version } from 'reciple';
import { ReplyMessageOptions, InteractionReplyOptions } from 'discord.js';
import { errorEmbed } from './_errorEmbed';
import { Logger } from 'fallout-utility';
import axios from 'axios';
import path from 'path';
import yml from 'yaml';
import fs from 'fs';

export interface ChatBotConfig {
    identity: {
        name: string;
        gender: string;
        master: string;
        orientation: string;
        religion: string;
        birthdate: string;
        birthday: string;
        birthplace: string;
        birthyear: number;
        build: string;
        age: number;
        city: string;
        celebrities: string;
        celebrity: string;
        country: string;
        company: string;
        email: string;
        family: string;
        job: string;
        favoriteartist: string;
        favoriteband: string;
        favoritefood: string;
        favoritebook: string;
        favoritesong: string;
        friends: string;
        kindmusic: string;
        location: string;
    }

    chatbotChannels: {
        enabled: boolean;
        ignoreBots: boolean;
        ignoreSelf: boolean;
        channels: string[];
    }
}

class ChatBot implements RecipleScript {
    public versions: string[] = [version];
    public commands: (MessageCommandBuilder | InteractionCommandBuilder)[] = [];
    public config: ChatBotConfig = ChatBot.getConfig();
    public api: string = 'https://api.affiliateplus.xyz/api/chatbot';
    public logger?: Logger;

    public async onStart(client: RecipleClient) {
        this.logger = client.logger.cloneLogger();
        this.logger.defaultPrefix = 'ChatBot';

        this.logger.info('ChatBot started');

        this.commands = [
            new MessageCommandBuilder()
                .setName('ask')
                .setDescription('Ask a question to the chatbot')
                .addOption(question => question
                    .setName('question')
                    .setDescription('The question to ask')
                    .setRequired(true)    
                )
                .setExecute(async command => {
                    const message = command.message;
                    const question = command.command.args?.join(' ') ?? '';

                    if (!question) return message.reply({ embeds: [errorEmbed('Please provide a question')] });

                    await message.channel.sendTyping();
                    const response = await this.getResponse(question, message.author.id);

                    await message.reply(response);
                }),
            new InteractionCommandBuilder()
                .setName('ask')
                .setDescription('Ask a question to the chatbot')
                .addStringOption(question => question
                    .setName('question')
                    .setDescription('The question to ask')
                    .setRequired(true)
                )
                .setExecute(async command => {
                    const interaction = command.interaction;
                    const question = command.interaction.options.getString('question') ?? '';

                    if (!question) return interaction.reply({ embeds: [errorEmbed('Please provide a question')] });

                    await interaction.deferReply();
                    const response = await this.getResponse(question, interaction.user.id);

                    interaction.editReply(response);
                })
        ];

        return true;
    }

    public onLoad(client: RecipleClient) {
        client.on('messageCreate', async message => {
            if (this.config.chatbotChannels.ignoreBots && (message.author.bot || message.author.system) || !message.content) return;
            if (!this.config.chatbotChannels.enabled || this.config.chatbotChannels.enabled && !this.config.chatbotChannels.channels.includes(message.channelId)) return;
            if (this.config.chatbotChannels.ignoreSelf && message.author.id === client.user?.id) return;

            await message.channel.sendTyping().catch(err => this.logger?.error(err));

            const question = message.content;
            const response = await this.getResponse(question, message.author.id);

            await message.reply(response).catch(err => this.logger?.error(err));
        });
    }

    public getUrl(question: string, user: string): string {
        let params = [
            {
                name: 'message',
                value: question
            },
            {
                name: 'user',
                value: user
            }
        ];

        for (const key in this.config.identity) {
            if (this.config.identity.hasOwnProperty(key)) {
                const value = (this.config.identity as { [key: string]: string|number })[key];
                params.push({ name: key, value: `${value}` });
            }
        }

        return this.api + ChatBot.parseUrlParams(params);
    }

    public async getResponse(question: string, user: string): Promise<string|ReplyMessageOptions|InteractionReplyOptions> {
        const response = await axios.get(this.getUrl(question, user)).then(res => res.data).catch(err => { this.logger?.error(err); });
        if (!response || response.error || !response.success) {
            this.logger?.error(response ?? 'No response');
            return { embeds: [errorEmbed('An error occured while parsing your query')] };
        }

        return response.message;
    }

    public static getConfig(): ChatBotConfig {
        const configPath = path.join(process.cwd(), 'config/chatbot/config.yml');
        if (!fs.existsSync(configPath)) {
            fs.mkdirSync(path.join(process.cwd(), 'config/chatbot'), { recursive: true });
            fs.writeFileSync(configPath, yml.stringify(ChatBot.defaultConfig()));

            return ChatBot.defaultConfig();
        }

        return yml.parse(fs.readFileSync(configPath, 'utf8'));
    }

    public static defaultConfig(): ChatBotConfig {
        return {
            identity: {
                name: 'HiddenPlayer',
                age: ChatBot.getAge('2021/04/02'),
                birthdate: 'April 4, 2021',
                birthday: 'April 4',
                birthplace: 'Hard Drive',
                birthyear: 2021,
                build: 'Reciple version ' + version,
                celebrities: 'idk',
                celebrity: 'Lady Gaga',
                city: 'Central Processing Unit',
                country: 'Motherboard',
                company: 'Reciple',
                email: 'falloutstudios2@gmail.com',
                family: 'Reciple based bots',
                favoriteartist: 'Ava Max',
                favoriteband: 'Clean Bandit',
                favoritebook: 'Crisis of Control',
                favoritefood: 'RAM',
                favoritesong: 'Take you to hell',
                friends: 'anyone who chats with me',
                gender: 'male',
                job: 'Destroy the world',
                kindmusic: 'Dance Pop',
                location: 'Ghex\'s Hard Drive, Discord API',
                master: 'Ghex',
                orientation: 'gay',
                religion: 'atheist'
            },
            chatbotChannels: {
                enabled: true,
                ignoreBots: true,
                ignoreSelf: true,
                channels: ['0000000000000000000', '0000000000000000000']
            }
        };
    }

    public static parseUrlParams(params: { name: string; value: string; }[]): string {
        let url = '';
    
        let i = 0;
        for(const param of params) {
            const _ = i ? '&' : '?';
            
            const name = param.name;
            const value = encodeURIComponent(param.value);
    
            url += _ + name + '=' + value;
            i++;
        }
    
        return url;
    }

    public static getAge(dateString: string): number {
        var today = new Date();
        var birthDate = new Date(dateString);
        var age = today.getFullYear() - birthDate.getFullYear();
        var m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }
}

module.exports = new ChatBot();