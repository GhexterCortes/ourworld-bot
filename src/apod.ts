import { RecipleClient, InteractionCommandBuilder, MessageCommandBuilder, RecipleScript, version } from 'reciple';
import { errorEmbed } from './_errorEmbed';
import { MessageEmbed } from 'discord.js';
import axios from 'axios';
import dayjs from 'dayjs';
import { isNumber } from 'fallout-utility';

export interface PictureOfTheDay {
    copyright?: string;
    date: string;
    explanation?: string;
    hdurl: string;
    media_type?: string;
    service_version?: string;
    title?: string;
    url: string;
}

export class Apod implements RecipleScript {
    public versions: string | string[] = ['1.3.x', '1.4.x'];
    public commands: (MessageCommandBuilder | InteractionCommandBuilder)[] = [];

    public onStart() {
        this.commands = [
            new InteractionCommandBuilder()
                .setName('apod')
                .setDescription('Get the Astronomy Picture of the Day')
                .addStringOption(date => date
                    .setName('date')
                    .setDescription('A date in the format YYYY-MM-DD')
                    .setRequired(false)    
                )
                .setExecute(async command => {
                    const interaction = command.interaction;
                    const dateOption = interaction.options.getString('date');

                    if (dateOption && (dateOption.split('-').length < 3 || !dateOption.split('-').every(x => Number.isInteger(Number(x))))) {
                        return interaction.reply({ embeds: [errorEmbed('Invalid date')] });
                    }

                    const date = dateOption ? dateOption.split('-') : undefined;
                    const dateY = date ? Number(date[0]) : undefined;
                    const dateM = date ? Number(date[1]) : undefined;
                    const dateD = date ? Number(date[2]) : undefined;

                    const image = await this.getImage(dateY && dateM && dateD ? { y: Apod.addBeginningZero(dateY), m: Apod.addBeginningZero(dateM), d: Apod.addBeginningZero(dateD) } : undefined);
                    if (!image) return interaction.reply({ embeds: [errorEmbed('No image found')] });

                    const embed = new MessageEmbed()
                        .setAuthor(image?.copyright ? { name: image?.copyright } : null)
                        .setTitle(image.title ?? `Astronomy Picture of the Day ${image.date.split('-').join('/')}`)
                        .setURL(image.hdurl)
                        .setDescription(image.explanation ?? ' ')
                        .setImage(image.url)
                        .setTimestamp(new Date(image.date))
                        .setColor('BLUE');
                        
                    return interaction.reply({ embeds: [embed] });
                })
        ];

        return true;
    }

    public async getImage(date?: { y: number|string, m: number|string, d: number|string }): Promise<PictureOfTheDay|undefined> {
        const url = `https://api.nasa.gov/planetary/apod?api_key=${process.env.NASA_API_KEY}`;
        const response = await axios.get(url + (date ? `&date=${date.y}-${date.m}-${date.d}` : '')).catch(() => undefined);

        return response?.data;
    }

    public static addBeginningZero(num: number): string {
        return num < 10 ? `0${num}` : `${num}`;
    }
}

export default new Apod();
