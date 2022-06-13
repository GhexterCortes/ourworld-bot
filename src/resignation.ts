import { ButtonInteraction, CommandInteraction, GuildMember, Message, MessageActionRow, MessageButton, MessageEmbed, Modal, TextChannel, TextInputComponent } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder, RecipleClient, RecipleScript } from 'reciple';
import { errorEmbed } from './_errorEmbed';

export class Resignation implements RecipleScript {
    public versions: string[] = ['1.3.x'];
    public commands: (MessageCommandBuilder|InteractionCommandBuilder)[] = [];
    public staffRoles: string[] = ['830468729493389364', '830468532861009930', '980688026000842815'];
    public staffChannel?: TextChannel;
    public staffChannelId: string = '847018774887661578';

    public onStart(client: RecipleClient) {
        this.commands = [
            new MessageCommandBuilder()
                .setName('resign')
                .setDescription('Resign as staff')
                .setExecute(command => {
                    if (!command.message.member) return;
                    this.displayResignationWarning(command.message, command.message.member);
                }),
            new InteractionCommandBuilder()
                .setName('resign')
                .setDescription('Resign as staff')
                .setExecute(command => {
                    if (!command.interaction.member) return;
                    this.displayResignationWarning(command.interaction, command.interaction.member as GuildMember);
                })
        ];

        return true;
    }

    public async onLoad(client: RecipleClient) {
        const channel = client.channels.cache.get(this.staffChannelId) ?? await client.channels.fetch(this.staffChannelId).catch(() => undefined);
        if (channel && channel.type == 'GUILD_TEXT') this.staffChannel = channel;

        client.on('interactionCreate', async interaction => {
            if (interaction.isButton() && interaction.customId == 'resign') {
                this.resignModal(interaction).catch(() => {});
            } else if (interaction.isModalSubmit() && interaction.customId == 'resign-modal') {
                const reason = interaction.fields.getTextInputValue('resign-reason') || 'No reason given';
                const member = interaction.member! as GuildMember;
                const staffRoles = member.roles.cache.filter(r => this.staffRoles.includes(r.id));

                let success = true;

                await interaction.deferReply({ ephemeral: true }).catch(() => {});
                await member.roles.remove(staffRoles).catch(() => { success = false; });

                if (success) {
                    interaction.editReply({ embeds: [errorEmbed(`Staff roles removed`)] }).catch(() => {});

                    const embed = new MessageEmbed()
                        .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
                        .setTitle(`${member.user.tag} has resigned`)
                        .setDescription(`${member.user.tag} has resigned from the staff list.\n\n**Reason:** ${reason}`)
                        .addField('Roles removed', staffRoles.map(r => `<@&${r.id}>`).join(' '))
                        .setColor('YELLOW')
                        .setTimestamp();

                    if (this.staffChannel) this.staffChannel.send({ embeds: [embed] }).catch(() => {});
                    interaction.channel?.send({ embeds: [embed] }).catch(() => {});
                } else {
                    interaction.editReply({ embeds: [errorEmbed(`Failed to remove staff roles`)] }).catch(() => {});
                }
            }
        });
    }

    public displayResignationWarning(cmd: CommandInteraction|Message, member: GuildMember) {
        const roles = member.roles.cache.map(r => r.id);
        const isStaff = this.staffRoles.some(r => roles.includes(r));
        const staffRoles = member.roles.cache.filter(r => this.staffRoles.includes(r.id));

        if (!isStaff) {
            cmd.reply({ embeds: [errorEmbed('You\'re not a staff')], ephemeral: true });
            return;
        }

        const embed = new MessageEmbed()
            .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
            .setTitle('Are you sure you want to resign?')
            .setDescription('This will remove you from the staff list and **you will no longer be able to come back** unless you apply and get approved.')
            .addFields([
                {
                    name: 'Roles to remove',
                    value: staffRoles.map(r => `<@&${r.id}>`).join(' '),
                }
            ])
            .setColor('RED');

        cmd.reply({
            embeds: [embed],
            ephemeral: true,
            components: [
                new MessageActionRow()
                    .addComponents([
                        new MessageButton()
                            .setCustomId('resign')
                            .setLabel('Resign')
                            .setStyle('DANGER')
                    ])
            ]
        });
    }

    public async resignModal(interaction: ButtonInteraction) {
        const modal = new Modal()
            .setCustomId('resign-modal')
            .setTitle('Tell us why you want to resign')
            .setComponents(
                new MessageActionRow<TextInputComponent>()
                    .addComponents([
                        new TextInputComponent()
                            .setCustomId('resign-reason')
                            .setLabel('Reason (optional)')
                            .setPlaceholder('Tell us why you want to resign')
                            .setMaxLength(2000)
                            .setRequired(false)
                            .setStyle('PARAGRAPH'),
                    ])
            );

        return interaction.showModal(modal);
    }
}

export default new Resignation();
