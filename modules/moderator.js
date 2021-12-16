const MakeConfig = require('../scripts/makeConfig');
const InteractionCommandBuilder = require('../scripts/interactionCommandBuilder');
const MessageCommandBuilder = require('../scripts/messageCommandBuilder');
const Yml = require('yaml');
const { MessageEmbed } = require('discord.js');
const SafeMessage = require('../scripts/safeMessage');
const SafeInteract = require('../scripts/safeInteract');
const { getRandomKey } = require('fallout-utility');


let config = [];

class Moderator {
    constructor() {
        this.versions = ['1.4.2'];
    }

    async start(Client) {

        config = this.getConfig('./config/moderator.yml');
        this.commands = this.getCommands(config);

        return true;
    }

    getConfig(location) {
        const defaultConfig = {
            kick: {
                enabled: true,
                defaultReason: 'You have been kicked from the server.',
            },
            ban: {
                enabled: true,
                defaultReason: 'You have been banned from the server.',
            },
            mute: {
                enabled: true,
                mutedRoleName: '',
                defaultReason: 'You have been muted from the server.',
            },
        }

        return Yml.parse(MakeConfig(location, defaultConfig));
    }

    makeReasonEmbed(user, positive = true, reason = 'No reason provided.') {
        const color = positive ? 'GREEN' : 'RED';

        return new MessageEmbed()
            .setColor(color)
            .setAuthor(`${positive ? '✅' : '❌'} ${user.username}#${user.discriminator} | ${reason}`)
            .setDescription(' ');
    }

    getCommands() {
        const commands = [];

        if (config.kick.enabled) {
            commands.push(new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('kick')
                    .setDescription('Kick a user from the server.')
                    .addUserOption(user => user
                        .setName('user')
                        .setDescription('The user to kick.')
                        .setRequired(true)    
                    )
                    .addStringOption(reason => reason
                        .setName('reason')
                        .setDescription('The reason for the kick.')
                        .setRequired(false)
                    )
                )
                .setExecute(async (interaction, Client) => this.kick(Client, 'Interaction', { interaction: interaction }))
            );

            commands.push(new MessageCommandBuilder()
                .setName('kick')
                .setDescription('Kick a user from the server.')
                .addArgument('user', true, 'The user to kick.')
                .addArgument('reason', false, 'The reason for the kick.')
                .setExecute(async (args, message, Client) => this.kick(Client, 'Message', { message: message, args: args }))
            );
        }

        if (config.ban.enabled) {
            commands.push(new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('ban')
                    .setDescription('Ban a user from the server.')
                    .addUserOption(user => user
                        .setName('user')
                        .setDescription('The user to ban.')
                        .setRequired(true)    
                    )
                    .addStringOption(string => string
                        .setName('reason')
                        .setDescription('The reason for the ban.')
                        .setRequired(false)    
                    )
                )
                .setExecute(async (interaction, Client) => this.ban(Client, 'Interaction', { interaction: interaction }))
            );

            commands.push(new MessageCommandBuilder()
                .setName('ban')
                .setDescription('Ban a user from the server.')
                .addArgument('user', true, 'The user to ban.')
                .addArgument('reason', false, 'The reason for the ban.')
                .setExecute(async (args, message, Client) => this.ban(Client, 'Message', { message: message, args: args }))
            );
        }

        if (config.mute.enabled) {
            commands.push(new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('mute')
                    .setDescription('Mute a user from the server.')
                    .addUserOption(user => user
                        .setName('user')
                        .setDescription('The user to mute.')
                        .setRequired(true)    
                    )
                    .addStringOption(string => string
                        .setName('reason')
                        .setDescription('The reason for the mute.')
                        .setRequired(false)    
                    )
                )
                .setExecute(async (interaction, Client) => this.mute(Client, 'Interaction', { interaction: interaction }))
            );

            commands.push(new MessageCommandBuilder()
                .setName('mute')
                .setDescription('Mute a user from the server.')
                .addArgument('user', true, 'The user to mute.')
                .addArgument('reason', false, 'The reason for the mute.')
                .setExecute(async (args, message, Client) => this.mute(Client, 'Message', { message: message, args: args }))
            );
        }

        return commands;
    }

    async kick(Client, type, data) {
        let user = null;
        let reason = null;
        let kick = null;

        switch (type) {
            case 'Interaction':
                const { interaction } = data;

                user = interaction.options.getUser('user');
                reason = interaction.options.getString('reason') ? interaction.options.getString('reason') : getRandomKey(config.kick.defaultReason);

                if (!user) return SafeInteract.reply(interaction, { content: ' ', embeds: [ this.makeReasonEmbed(user, false, 'User not found') ], ephemeral: true });

                // kick user
                kick = await interaction?.guild.members.cache.get(user.id).kick(reason).catch(async err => { 
                    console.error(err);
                    await SafeInteract.reply(interaction, { content: ' ', embeds: [ this.makeReasonEmbed(user, false, 'Unable to kick user') ], ephemeral: true});
                    return false;
                });
                if(kick) await SafeInteract.reply(interaction, { content: ' ', embeds: [ this.makeReasonEmbed(user, true, reason) ] });

                break;
            case 'Message':
                const { message, args } = data;

                // check if messafe has mentions
                if (!message.mentions.members.size) return SafeMessage.reply(message, 'You must mention a user to kick.');
                
                user = message.mentions.users.first();
                reason = getRandomKey(config.kick.defaultReason);
                switch (args.length) {
                    case 1: break;
                    case 2:
                        reason = args[1];
                        break;
                }

                // kick user
                kick = await message.guild.members.cache.get(user.id).kick(reason).catch(async err => {
                    console.error(err);
                    await SafeMessage.reply(message, { content: ' ', embeds: [ this.makeReasonEmbed(user, false, 'Unable to kick user') ] });
                    return false;
                });
                if(kick) await SafeMessage.reply(message, { content: ' ', embeds: [ this.makeReasonEmbed(user, true, reason) ] });

                break;
        }
    }

    async ban(Client, type, data) {
        let user = null;
        let reason = null;
        let ban = null;

        switch (type) {
            case 'Interaction':
                const { interaction } = data;

                user = interaction.options.getUser('user');
                reason = interaction.options.getString('reason') ? interaction.options.getString('reason') : getRandomKey(config.ban.defaultReason);

                if (!user) return SafeInteract.reply(interaction, { content: ' ', embeds: [ this.makeReasonEmbed(user, false, 'User not found') ], ephemeral: true });

                // ban user
                ban = await interaction?.guild.members.cache.get(user.id).ban({ reason: reason }).catch(async err => { 
                    console.error(err);
                    await SafeInteract.reply(interaction, { content: ' ', embeds: [ this.makeReasonEmbed(user, false, 'Unable to ban user') ], ephemeral: true });
                    return false;
                });
                if(ban) await SafeInteract.reply(interaction, { content: ' ', embeds: [ this.makeReasonEmbed(user, true, reason) ] });

                break;
            case 'Message':
                const { message, args } = data;

                // check if messafe has mentions
                if (!message.mentions.members.size) return SafeMessage.reply(message, 'You must mention a user to ban.');
                
                user = message.mentions.users.first();
                reason = getRandomKey(config.ban.defaultReason);
                switch (args.length) {
                    case 1: break;
                    case 2:
                        reason = args[1];
                        break;
                }

                // ban user
                ban = await message.guild.members.cache.get(user.id).ban(reason).catch(async err => {
                    console.error(err);
                    await SafeMessage.reply(message, { content: ' ', embeds: [ this.makeReasonEmbed(user, false, 'Unable to ban user') ] });
                    return false;
                });
                if(ban) await SafeMessage.reply(message, { content: ' ', embeds: [ this.makeReasonEmbed(user, true, reason) ] });

                break;
        }
    }

    async mute(Client, type, data) {
        let user = null;
        let reason = null;
        let mute = null;

        switch (type) {
            case 'Interaction':
                const { interaction } = data;
                
                user = interaction.options.getUser('user');
                reason = interaction.options.getString('reason') ? interaction.options.getString('reason') : getRandomKey(config.ban.defaultReason);

                console.log(user);
                if (!user) return SafeInteract.reply(interaction, { content: ' ', embeds: [ this.makeReasonEmbed(user, false, 'User not found') ], ephemeral: true });

                // mute user
                mute = await interaction?.guild.members.cache.get(user.id).roles.add(interaction.guild.roles.cache.find(role => role.name === config.mute.mutedRoleName)).catch(async err => {
                    console.error(err);
                    await SafeInteract.reply(interaction, { content: ' ', embeds: [ this.makeReasonEmbed(user, false, 'Unable to mute user') ], ephemeral: true });
                    return false;
                });
                if(mute) return SafeInteract.reply(interaction, { content: ' ', embeds: [ this.makeReasonEmbed(user, true, reason) ] });

                break;
            case 'Message':
                const { message, args } = data;

                // check if messafe has mentions
                if (!message.mentions.members.size) return SafeMessage.reply(message, 'You must mention a user to mute.');
                user = message.mentions.users.first();
                reason = getRandomKey(config.mute.defaultReason);
                switch (args.length) {
                    case 1: break;
                    case 2:
                        reason = args[1];
                        break;
                }

                // mute user
                mute = await message.guild.members.cache.get(user.id).roles.add(message.guild.roles.cache.find(role => role.name === config.mute.mutedRoleName)).catch(async err => {
                    console.error(err);
                    await SafeMessage.reply(message, { content: ' ', embeds: [ this.makeReasonEmbed(user, false, 'Unable to mute user') ] });
                    return false;
                });
                if(mute) await SafeMessage.reply(message, { content: ' ', embeds: [ this.makeReasonEmbed(user, true, reason) ] });

                break;
        }
    }
}

module.exports = new Moderator();