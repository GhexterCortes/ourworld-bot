import { Message, MessageEmbed } from 'discord.js';
import { getRandomKey } from 'fallout-utility';
import { InteractionCommandBuilder, MessageCommandBuilder, RecipleClient, RecipleScript, version } from 'reciple';

export default new (class implements RecipleScript {
    public versions: string[] = ['1.3.x'];
    public commands: (MessageCommandBuilder|InteractionCommandBuilder)[] = [];

    public onStart(client: RecipleClient) {
        this.commands = [
            new MessageCommandBuilder()
                .setName('ping')
                .setDescription('Pong!')
                .setExecute(async command => {
                    const percentage = Math.round(Math.random() * 100);
                    const message = command.message;
                    const author = message.author;

                    if (percentage >= 90) {
                        let text = '$ sudo pong';

                        const embed = new MessageEmbed()
                            .setTitle('Hecker')
                            .setDescription(`\`\`\`bash\n${text}\n\`\`\``)
                            .setColor('GREEN');

                        const heck = await message.reply({ embeds: [embed] });
                        
                        await this.sleep(1000);
                        text += '\nHecking '+ author.username + '...';
                        embed.setDescription(`\`\`\`bash\n${text}\n\`\`\``)
                        await heck.edit({ embeds: [embed] });

                        await this.sleep(500);
                        text += '\nChecking email '+ author.username + '...';
                        embed.setDescription(`\`\`\`bash\n${text}\n\`\`\``)
                        await heck.edit({ embeds: [embed] });

                        await this.sleep(100);
                        text += '\nChecking email '+ author.username + '...';
                        embed.setDescription(`\`\`\`bash\n${text}\n\`\`\``)
                        await heck.edit({ embeds: [embed] });

                        await this.sleep(100);
                        text += '\nEmail '+ this.getEmail(author.username);
                        embed.setDescription(`\`\`\`bash\n${text}\n\`\`\``)
                        await heck.edit({ embeds: [embed] });

                        await this.sleep(100);
                        text += '\nUsername '+ author.username;
                        embed.setDescription(`\`\`\`bash\n${text}\n\`\`\``)
                        await heck.edit({ embeds: [embed] });

                        await this.sleep(100);
                        text += '\nPassword ***********';
                        embed.setDescription(`\`\`\`bash\n${text}\n\`\`\``)
                        await heck.edit({ embeds: [embed] });

                        await this.sleep(500);
                        text += `\nPassword ${this.getPassword(author.username)}`;
                        embed.setDescription(`\`\`\`bash\n${text}\n\`\`\``)
                        await heck.edit({ embeds: [embed] });

                        await this.sleep(1000);
                        text += '\nDone!';
                        embed.setDescription(`\`\`\`bash\n${text}\n\`\`\``)
                        await heck.edit({ embeds: [embed] });
                    } else {
                        return message.reply('Pong!');
                    }
                }),
                new InteractionCommandBuilder()
                    .setName('ping')
                    .setDescription('Shows bot latency')
                    .setExecute(async command => {
                        const interaction = command.interaction;
                        const date = new Date();

                        await interaction.deferReply();

                        const reply = await interaction.fetchReply() as Message;

                        const latency = reply.createdTimestamp - date.getTime();
                        const apiLatency = command.client.ws.ping;

                        const embed = new MessageEmbed()
                            .setTitle('Pong!')
                            .setDescription(`\`\`\`bash\nLatency: ${latency}ms\nAPI Latency: ${apiLatency}ms\n\`\`\``)
                            .setColor('GREEN');
                        
                        await interaction.editReply({ embeds: [embed] });
                    })
            ];

        return true;
    }

    public getEmail(text: string): string {
        const emails: string[] = [
            `${text}@yahoo.com`,
            `${text}iscool@gmail.com`,
            `pretty${text}@outlook.com`,
            `susperson@among.us`,
            `2inchpp@gmail.com`,
            `GFTYtfrtyh@krazy.net`,
            `${text}@among.us`
        ];
        
        return getRandomKey(emails);
    }

    public getPassword(text: string): string {
        const passwords: string[] = [
            '1234567890',
            'qwertyuiop',
            'asdfghjkl',
            'smallpp123',
            `${text}123`,
            `${text}noob`,
            `${text}notfound`,
            `8==D`,
            `iamnoob`,
        ];

        return getRandomKey(passwords);
    }

    public sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
})();
