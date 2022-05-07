import { ButtonType, Pagination } from '@ghextercortes/djs-pagination';
import { PaginationButton } from '@ghextercortes/djs-pagination/dist/util/Buttons';
import { Queue } from 'discord-player';
import { GuildMember, MessageButton, MessageEmbed } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder } from 'reciple';
import { MusicPlayer } from '../../music-player';
import { errorEmbed } from '../../_errorEmbed';

export default function (musicClient: MusicPlayer) {
    const makeEmbeds = (queue: Queue, embedDescription: string) => {
        let embeds = [];
        
        let i = 0;
        let id = 0;
        let page = 1;
        for (const track of queue.tracks) {
            i++;

            embedDescription += `\n\`${id + 1}.\` **${track.title}** — <@${track?.requestedBy.id}>`;
            id++;

            if (i === 10 || i === queue.tracks.length) {
                i = 0;
                embeds.push(new MessageEmbed().setDescription(embedDescription).setColor('BLUE').setFooter({ text: `Page ${page}` }));
                embedDescription = `Playing: **${queue.nowPlaying().title || 'none'}**\n`;
                page++;
            }
        }

        return embeds;
    }

    const paginationButtons = new PaginationButton()
        .addButton(ButtonType.FIRST_PAGE, new MessageButton().setCustomId('firstpage').setStyle('SECONDARY').setLabel('First'))
        .addButton(ButtonType.PREVIOUS_PAGE, new MessageButton().setCustomId('previouspage').setStyle('PRIMARY').setLabel('Previous'))
        .addButton(ButtonType.NEXT_PAGE, new MessageButton().setCustomId('nextpage').setStyle('SUCCESS').setLabel('Next'))
        .addButton(ButtonType.LAST_PAGE, new MessageButton().setCustomId('lastpage').setStyle('SECONDARY').setLabel('Last'));

    return [
        new InteractionCommandBuilder()
            .setName('queue')
            .setDescription('Shows the current queue.')
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member as GuildMember;

                if (!member || !interaction.guild) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))] });
                
                const queue = musicClient.player?.getQueue(interaction.guild.id);
                if (!queue || queue.destroyed) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('noQueue'))] });
                if (queue.tracks.length === 0) return interaction.reply({ embeds: [errorEmbed(musicClient.getMessage('noTracks'), true)] });

                let embedDescription = `Playing: **${queue.nowPlaying().title || 'none'}**\n`;
                const embeds = makeEmbeds(queue, embedDescription);                
                
                const pagination = new Pagination()
                    .setAuthorIndependent(true)
                    .setButtons(paginationButtons)
                    .addPages(embeds)
                    .setTimer(20000);

                return pagination.paginate(interaction);
            }),
        new MessageCommandBuilder()
            .setName('queue')
            .setDescription('Shows the current queue.')
            .setExecute(async command => {
                const message = command.message;
                const member = message.member as GuildMember;

                if (!member || !message.inGuild()) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('notAMember'))]});

                const queue = musicClient.player?.getQueue(message.guildId);

                if (!queue || queue.destroyed) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('noQueue'))] });
                if (queue.tracks.length === 0) return message.reply({ embeds: [errorEmbed(musicClient.getMessage('noTracks'), true)] });

                let embedDescription = `Playing: **${queue.nowPlaying().title || 'none'}**\n`;
                const embeds = makeEmbeds(queue, embedDescription);                
                
                const pagination = new Pagination()
                    .setAuthorIndependent(true)
                    .setButtons(paginationButtons)
                    .addPages(embeds)
                    .setTimer(20000);

                return pagination.paginate(message);
            })
    ];
}