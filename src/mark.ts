import { InteractionCommandBuilder, MessageCommandBuilder, RecipleScript, version } from 'reciple';
import { MessageEmbed, MessageAttachment } from 'discord.js';
import Canvas from 'canvas';

export class Mark implements RecipleScript {
    public versions: string[] = ['1.3.x', '1.4.x'];
    public mark?: Canvas.Image;
    public commands: (MessageCommandBuilder | InteractionCommandBuilder)[] = [
        new MessageCommandBuilder()
            .setName('mark')
            .setDescription('si mark')
            .addOption(user => user
                .setName('user')
                .setDescription('tahimik lang')
                .setRequired(false)
            )
            .setExecute(async command => {
                const member = command.command.args?.length ? command.message.guild?.members.cache.find(m => m.user.id == (command.command?.args as string[])[0] || m.user.tag == (command.command?.args as string[])[0]) : undefined;
                const avatar = member?.displayAvatarURL({ format: 'png', size: 300 }) || command.message.mentions.members?.first()?.displayAvatarURL({ format: 'png', size: 300 }) || command.message.author.displayAvatarURL({ format: 'png', size: 300 });
                const murk = await this.getAvatar(avatar);
                
                command.message.reply(murk);
            }),
        new InteractionCommandBuilder()
            .setName('mark')
            .setDescription('si mark')
            .addUserOption(user => user
                .setName('user')
                .setDescription('tahimik lang')
                .setRequired(false)
            )
            .setExecute(async command => {
                await command.interaction.deferReply();

                const avatar =  command.interaction.options.getUser('user')?.displayAvatarURL({ format: 'png', size: 300 }) || command.interaction.user.displayAvatarURL({ format: 'png', size: 300 });
                const murk = await this.getAvatar(avatar);

                command.interaction.editReply(murk);
            })
    ];

    public async onStart() {
        this.mark = await Canvas.loadImage('https://i.imgur.com/0aD5vGi.png');
        
        return !!this.mark;
    }
    
    public async getAvatar(avatar: string) {
        const canvas = Canvas.createCanvas(300, 300);
        const ctx = canvas.getContext('2d');

        const avatarImg = await Canvas.loadImage(avatar);
        ctx.drawImage(avatarImg, 0, 0, canvas.width, canvas.height);
        ctx.drawImage(this.mark, 0, 0, canvas.width, canvas.height);

        const attachment = new MessageAttachment(canvas.toBuffer(), 'mark.png');

        return {
            content: ' ',
            embeds: [
                new MessageEmbed()
                    .setTitle('Si Mark')
                    .setColor('ORANGE')
                    .setImage('attachment://mark.png')
                    .setFooter({ text: `We do not endorse any political candidates; this is for meme purposes only` })
            ],
            files: [attachment]
        };
    }
}

export default new Mark();
