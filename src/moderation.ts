import { InteractionCommandBuilder, MessageCommandBuilder, RecipleClient, RecipleScript } from 'reciple';
import { errorEmbed } from './_errorEmbed';
import ms from 'ms';

export class Moderation implements RecipleScript {
    public versions: string[] = ['1.6.x'];
    public commands: (MessageCommandBuilder | InteractionCommandBuilder)[] = [];

    public onStart(client: RecipleClient) {
        this.commands = [...this.getMessageCommands(), ...this.getInteractionCommands()];

        return true;
    }

    public onLoad(client: RecipleClient) {
        client.on('interactionCreate', async interaction => {
            if (!interaction.isAutocomplete()) return;
            if (interaction.commandName !== 'unban') return;
            if (!interaction.guild) return;

            const banned = interaction.guild.bans;
            const text = interaction.options.getFocused() || '';

            if (!banned.cache.size) await banned.fetch().catch(() => undefined);

            const users = banned.cache.filter(u => !u || u.user.tag.toLowerCase().includes(text.toString().toLowerCase()) || u.user.id.includes(text.toString()));
            let results = users.map(u => {
                return {
                    name: u.user.tag,
                    value: u.user.id
                };
            });

            interaction.respond(results.slice(0, 25)).catch(() => {});
        });
    }

    public getMessageCommands(): MessageCommandBuilder[] {
        return [
            new MessageCommandBuilder()
                .setName('mute')
                .setDescription('Mutes a user for a specified amount of time')
                .addOption(user => user
                    .setName('user')
                    .setDescription('The user to mute')
                    .setRequired(true)
                )
                .addOption(duration => duration
                    .setName('duration')
                    .setDescription('The amount of time to mute the user for')
                    .setRequired(false)
                    .setValidator(val => {
                        try {
                            const e = ms(val);
                            return !!e;
                        } catch {
                            return false;
                        }
                    })
                )
                .addOption(reason => reason
                    .setName('reason')
                    .setDescription('The reason for the mute')
                    .setRequired(false)    
                )
                .setValidateOptions(true)
                .setExecute(async command => {
                    const userId = command.command.args?.shift();
                    const duration = command.command.args?.shift() || '1h';
                    const reason = command.command.args?.shift() || 'No reason provided';

                    if (!userId) return command.message.reply({ embeds: [errorEmbed('You must specify a user to mute')] });

                    const member = command.message.guild?.members.cache.find(u => u.user.tag.toLowerCase() === userId.toLowerCase() || u.user.id === userId.replace(/[<@!>]/g, ''));
                    if (!member) return command.message.reply({ embeds: [errorEmbed('Could not find user')] });
                    if (member.isCommunicationDisabled()) return command.message.reply({ embeds: [errorEmbed('User is already timed out')] });
                    if (!member.moderatable) return command.message.reply({ embeds: [errorEmbed('Cannot time out user')]})

                    const d = ms(duration);
                    if (!d || d >= ms('1y')) { return command.message.reply({ embeds: [errorEmbed('Invalid duration')] }); }

                    await member.timeout(d, reason);

                    command.client.logger.debug(`${command.message.author.tag} timed out ${member.user.tag} for ${ms(d, { long: true })} | ${reason}`, 'Moderation');
                    return command.message.reply({
                        embeds: [
                            errorEmbed(`**${member.user.tag}** timed out for \`${ms(d, { long: true })}\` | **${reason}**`, true, false)
                        ]
                    });
                }),
            new MessageCommandBuilder()
                .setName('unmute')
                .setDescription('Unmutes a member')
                .addOption(user => user
                    .setName('user')
                    .setDescription('The member to unmute')
                    .setRequired(true) 
                )
                .setExecute(async command => {
                    const userId = command.command.args?.shift();
                    if (!userId) return command.message.reply({ embeds: [errorEmbed('You must specify a user to unmute')] });

                    const member = command.message.guild?.members.cache.find(u => u.user.tag.toLowerCase() === userId.toLowerCase() || u.user.id === userId.replace(/[<@!>]/g, ''));
                    if (!member) return command.message.reply({ embeds: [errorEmbed('Could not find user')] });
                    if (!member.moderatable) return command.message.reply({ embeds: [errorEmbed('Cannot moderate user')]})

                    await member.timeout(null, 'Unmuted');

                    command.client.logger.debug(`${command.message.author.tag} unmuted ${member.user.tag}`, 'Moderation');
                    return command.message.reply({
                        embeds: [
                            errorEmbed(`**${member.user.tag}** was unmuted`, true, false)
                        ]
                    });
                }),
            new MessageCommandBuilder()
                .setName('unban')
                .setDescription('Unbans a user')
                .addOption(user => user
                    .setName('user')
                    .setDescription('The user to unban')
                    .setRequired(true)    
                )
                .setExecute(async command => {
                    const message = command.message;
                    const userId = command.command.args?.join(' ') || '';

                    if (!userId) return message.reply({ embeds: [errorEmbed('Could not find user')] });
                    if (!message.guild) return message.reply({ embeds: [errorEmbed('Could find message guild')] });
                    if (!message.guild?.bans.cache.size) await message.guild?.bans.fetch().catch(() => undefined);
                    
                    const member = message.guild?.bans.cache.find(u => u.user.tag.toLowerCase() === userId.toLowerCase() || u.user.id === userId.replace(/[<@!>]/g, ''));
                    if (!member) return message.reply({ embeds: [errorEmbed('Could not find user')] });

                    await message.guild?.members.unban(member.user.id);

                    return message.reply({ embeds: [errorEmbed(`<@${message.author.id}> unbanned **${member.user.tag}**`, true, false)] });
                })
        ];
    }
    public getInteractionCommands(): InteractionCommandBuilder[] {
        return [
            new InteractionCommandBuilder()
                .setName('mute')
                .setDescription('Mutes a user for a specified amount of time')
                .addUserOption(user => user
                    .setName('user')
                    .setDescription('The user to mute')
                    .setRequired(true)
                )
                .addStringOption(duration => duration
                    .setName('duration')
                    .setDescription('The amount of time to mute the user for')
                    .setRequired(false)
                )
                .addStringOption(reason => reason
                    .setName('reason')
                    .setDescription('The reason for the mute')
                    .setRequired(false)
                )
                .setExecute(async command => {
                    const user = command.interaction.options.getUser('user', true);
                    const duration = command.interaction.options.getString('duration') || '1h';
                    const reason = command.interaction.options.getString('reason') || 'No reason provided';

                    const member = command.interaction.guild?.members.cache.get(user.id);
                    if (!member) return command.interaction.reply({ embeds: [errorEmbed('Could not find user')] });

                    if (member.isCommunicationDisabled()) return command.interaction.reply({ embeds: [errorEmbed('User is already timed out')] });
                    if (!member.moderatable) return command.interaction.reply({ embeds: [errorEmbed('Cannot time out user')]})

                    const d = ms(duration);
                    if (!d || d >= ms('1y')) { return command.interaction.reply({ embeds: [errorEmbed('Invalid duration')] }); }

                    await member.timeout(d, reason);

                    command.client.logger.debug(`${command.interaction.user.tag} timed out ${member.user.tag} for ${ms(d, { long: true })} | ${reason}`, 'Moderation');
                    return command.interaction.reply({
                        embeds: [
                            errorEmbed(`**${member.user.tag}** timed out for \`${ms(d, { long: true })}\` | **${reason}**`, true, false)
                        ]
                    });
                }),
            new InteractionCommandBuilder()
                .setName('unmute')
                .setDescription('Unmutes a member')
                .addUserOption(user => user
                    .setName('user')
                    .setDescription('The member to unmute')
                    .setRequired(true)
                )
                .setExecute(async command => {
                    const user = command.interaction.options.getUser('user', true);
                    const member = command.interaction.guild?.members.cache.get(user.id);
                    
                    if (!member) return command.interaction.reply({ embeds: [errorEmbed('Could not find user')] });
                    if (!member.moderatable) return command.interaction.reply({ embeds: [errorEmbed('Cannot moderate user')]})

                    await member.timeout(null, 'Unmuted');

                    command.client.logger.debug(`${command.interaction.user.tag} unmuted ${member.user.tag}`, 'Moderation');
                    return command.interaction.reply({
                        embeds: [
                            errorEmbed(`**${member.user.tag}** was unmuted`, true, false)
                        ]
                    });
                }),
            new InteractionCommandBuilder()
                .setName('unban')
                .setDescription('Unbans a user')
                .addStringOption(user => user
                    .setName('user')
                    .setDescription('The user to unban')
                    .setAutocomplete(true)
                    .setRequired(true)
                )
                .setExecute(async command => {
                    const interaction = command.interaction;
                    const userQuery = interaction.options.getString('user', true);

                    if (!interaction.guild) return interaction.reply({ embeds: [errorEmbed('You cannot unban users from a DM')] });

                    const user = command.client.users.cache.find(m => m.id == userQuery || m.tag == userQuery) || await command.client.users.fetch(userQuery).catch(() => undefined) || undefined;
                    if (!user) return interaction.reply({ embeds: [errorEmbed('Could not find user')] });

                    const unban = await interaction.guild.members.unban(user, `Unbanned by ${interaction.user.tag}`).catch(() => undefined);
                    if (!unban) return interaction.reply({ embeds: [errorEmbed('Could not unban user')] });

                    command.client.logger.debug(`${interaction.user.tag} unbanned ${user.tag}`, 'Moderation');

                    return interaction.reply({ embeds: [errorEmbed(`<@${interaction.user.id}> unbanned **${user.tag}**`, true, false)] });
                })
        ];
    }
}

export default new Moderation();
