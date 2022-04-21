import { MessageEmbed, ReplyMessageOptions } from 'discord.js';
import { getRandomKey } from 'fallout-utility';
import { InteractionCommandBuilder, MessageCommandBuilder, RecipleClient, RecipleScript, version } from 'reciple';

class Larry implements RecipleScript {
    public versions: string[] = [version];
    public commands?: (MessageCommandBuilder | InteractionCommandBuilder)[] = [];

    public async onStart(client: RecipleClient) {
        this.commands = [
            new MessageCommandBuilder()
                .setName('larry-gadon')
                .setDescription('Bobo!')
                .setExecute(async command => {
                    await command.message.reply(Larry.getLarryGadon());
                }),
            new InteractionCommandBuilder()
                .setName('larry-gadon')
                .setDescription('Bobo!')
                .setExecute(async command => {
                    await command.interaction.reply(Larry.getLarryGadon());
                })
        ];

        return true;
    }

    public static getLarryGadon(): ReplyMessageOptions {
        return {
            content: ' ',
            embeds: [
                new MessageEmbed()
                    .setTitle(Larry.randomCaption())
                    .setImage(Larry.randomGifs())
                    .setColor('RANDOM')
                    .setFooter({ text: `We do not endorse any political candidates; this is for meme purposes only` })
            ]
        };
    }

    public static randomCaption(): string {
        const captions = ['Bobo!', 'Ikaw putangina mo kang hindot ka!', 'Tangina ka!', 'Mga Bobo!', 'Tangina mo!', 'Ikaw bobo putangina mo ka!'];

        return getRandomKey(captions);
    }

    public static randomGifs(): string {
        const gifs = [
            'https://i.pinimg.com/originals/ca/04/c2/ca04c231021e0e83de281e2d66173f60.gif',
            'https://c.tenor.com/HtiIV8kAw28AAAAC/larry-gadon-larry.gif',
            'https://c.tenor.com/unAddNr00YMAAAAC/tagumpay.gif',
            'https://c.tenor.com/HjLK-sn4Wz4AAAAd/putang-ina-mo.gif',
            'https://blogger.googleusercontent.com/img/a/AVvXsEhpz9kWExSfr5XWgT9ozM2lG3Fx_34FRzBb3r-SI_Y2wYIWJRzvT6xNsDkModnrylshyq7yg9_GxUFonj_VqDAUtZFmD-DCaKkfbw6KcP7O9sWbgs8mTud4smCrGjL4y9a7ONvJeN2NafTIcxVrRXBSNOvqLKiTD8Iol1-hJ4uEMR-EGtBgGNRYK5iO=s320',
            'https://media.interaksyon.com/wp-content/uploads/2018/08/lorenzo-gadon_2018-04-13_09-53-42_Interaksyon.jpg',
            'https://i1.sndcdn.com/artworks-000364904514-cder3q-t500x500.jpg',
            'https://abogado.com.ph/wp-content/uploads/2018/09/Abogado-Gadon.jpg',
            'https://wethepvblic.com/wp-content/uploads/2020/08/gadon-meme-696x336.jpg',
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRpcDP93oIO0fiDU0q1CiNwRGDLpCofejd6Ng&usqp=CAU',
            'https://metromanila.politics.com.ph/wp-content/uploads/2018/04/Untitled-2-11.jpg',
            'https://i0.wp.com/bannermedia.net/wp-content/uploads/2020/08/GADON.jpg?fit=620%2C413&ssl=1&w=640',
            'https://theancestory.com/wp-content/uploads/2022/01/Larry-gadon.png',
            'https://politics.com.ph/wp-content/uploads/2019/02/gadon.jpg',
            'https://i.ytimg.com/vi/dDtuBzF5Fx4/maxresdefault.jpg',
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfyTpsmeTO3TGy-fyS5baGpQdM6oFIJMnDdw&usqp=CAU',
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqIVD4OHGvkn7sRk4F7dnT8Su2rtTxzpT01IoR4H1j0X9SaSGUCH6Cw_AiuspszPNF31c&usqp=CAU',
            'https://1.bp.blogspot.com/-HYiXK0weNHk/X0gyVvc7lcI/AAAAAAACOwg/4l-ArPjn4jQD4CrlyUVy4IYv7W2GeApQgCLcBGAsYHQ/s1600/20200828_062308.jpg',
            'https://external-preview.redd.it/PEALf2QXCVW47UfbVJT75kBx8AXG4cMFyFhuJSUib_Q.png?format=pjpg&auto=webp&s=8231deff65532383614f5a08808b1717ff24ecef',
            'https://ph-live-01.slatic.net/p/fcbf2560a5cf6be8e2f72a912ca6df0d.jpg',
            'https://i.ytimg.com/vi/afW7XChruMg/maxresdefault.jpg',
            'https://www.remate.ph/wp-content/uploads/2020/08/GADON.jpg',
            'https://abogado.com.ph/wp-content/uploads/2018/08/gadon-4.jpg',
            'https://newsinfo.inquirer.net/files/2019/05/15gadon-620x454.jpg',
            'https://8list.ph/wp-content/uploads/2018/08/Gadon-800x420.png'
        ];

        return getRandomKey(gifs);
    }
}

module.exports = new Larry();