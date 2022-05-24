import { Message, MessageEmbed } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder, RecipleScript, version } from 'reciple';

class AnimatedPP implements RecipleScript {
    public versions: string[] = [version];
    public commands: (MessageCommandBuilder|InteractionCommandBuilder)[] = [
        new MessageCommandBuilder()
            .setName('animatepp')
            .setDescription('Animated PP')
            .setExecute(async command => {
                await AnimatedPP.animatePP(command.message);
            }),
        new InteractionCommandBuilder()
            .setName('animatepp')
            .setDescription('Animated PP')
            .setExecute(async command => {
                await command.interaction.deferReply();
                
                const reply = await command.interaction.fetchReply();
                await AnimatedPP.animatePP(reply as Message, true);
            })
    ];

    public static async animatePP(message: Message, edit: boolean = false) {
        const embed = new MessageEmbed()
            .setAuthor({ name: `Animated PP` })
            .setColor('BLUE')

        const reply = edit ? message : await message.reply({ embeds: [embed] }).catch(() => {});
        if (!reply) return;

        let length = 0;
        let action = 'INCREASE';

        for (let i = 0; i < 30; i++) {
            embed.setDescription(`8${'='.repeat(length)}D`);

            const edit = await reply.edit({ embeds: [embed] }).catch(() => {});
            if (!edit) break;

            switch (action) {
                case 'INCREASE':
                    length++;
                    break;
                case 'DECREASE':
                    length--;
                    break;
            }

            if (length >= 10 || length < 0) action = action === 'INCREASE' ? 'DECREASE' : 'INCREASE';
        }
    }

    public onStart() { return true; }
}

export default new AnimatedPP();
