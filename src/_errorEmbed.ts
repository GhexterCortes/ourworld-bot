import { MessageEmbed } from 'discord.js';

export function errorEmbed(message: string, positive: boolean = false, useAuthorField: boolean = true) {
    const embed = new MessageEmbed();

    embed.setColor(positive ? 'GREEN' : 'RED');

    if (message.indexOf('\n') > -1) {
        embed.setDescription(message);
    } else {
        if (useAuthorField) {
            embed.setAuthor({ name: message });
        } else {
            embed.setDescription(message);
        }
    }

    return embed;
}