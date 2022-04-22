import { ButtonType, Pagination } from '@ghextercortes/djs-pagination';
import { GuildMember, MessageButton, MessageEmbed } from 'discord.js';
import { InteractionCommandBuilder } from 'reciple';
import { MusicPlayer } from '../../music-player';
import { errorEmbed } from '../../_errorEmbed';

export default function (musicClient: MusicPlayer) {
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

                const embeds = [];
                let embedDescription = `Playing: **${queue.nowPlaying().title || 'none'}**\n`;

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
                
                const pagination = new Pagination()
                    .setAuthorIndependent(true)
                    .setButtons(buttons => buttons
                        .addButton(ButtonType.FIRST_PAGE, new MessageButton().setCustomId('firstpage').setStyle('SECONDARY').setLabel('First'))
                        .addButton(ButtonType.PREVIOUS_PAGE, new MessageButton().setCustomId('previouspage').setStyle('PRIMARY').setLabel('Previous'))
                        .addButton(ButtonType.NEXT_PAGE, new MessageButton().setCustomId('nextpage').setStyle('SUCCESS').setLabel('Next'))
                        .addButton(ButtonType.LAST_PAGE, new MessageButton().setCustomId('lastpage').setStyle('SECONDARY').setLabel('Last'))
                    )
                    .addPages(embeds)
                    .setTimer(20000);

                return pagination.paginate(interaction);
            })
    ];
}