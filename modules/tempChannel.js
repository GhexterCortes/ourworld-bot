const { InteractionCommandBuilder, MessageCommandBuilder } = require('../scripts/builders');
const { SafeInteract, SafeMessage } = require('../scripts/safeActions');
const { MessageEmbed } = require('discord.js');
const MakeConfig = require('../scripts/makeConfig');
const Yml = require('yaml');
const ms = require('ms');

class TempVoiceChannel {
    constructor() {
        this.versions = ['1.6.0', '1.6.1'];
        this.config = this.getConfig('./config/tempChannel/config.yml');
        this.temporaryChannels = [];
    }

    async onStart(Client) {
        if(!this.config.tempChannelCategoryId) return false;

        this.commands = [
            new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('temp-vc')
                    .setDescription('Creates a temporary voice channel')
                    .addSubcommand(create => create
                        .setName('create')
                        .setDescription('Creates a temporary voice channel')
                        .addStringOption(name => name.setName('name').setRequired(true).setDescription('The name of the channel'))
                        .addIntegerOption(count => count.setName('max').setRequired(false).setDescription('The maximum amount of users in the channel'))    
                    )
                    .addSubcommand(list => list
                        .setName('list')
                        .setDescription('Lists all temporary voice channels')
                    )
                )
                .setExecute(async (interaction) => {
                    const command = interaction.options.getSubcommand();
                    if(command !== 'create') return SafeInteract.reply(interaction, {
                        content: ' ',
                        embeds: [
                            new MessageEmbed()
                                .setTitle('Temp Voice Channels')
                                .setColor(Client.AxisUtility.get().config.embedColor)
                                .setDescription('Use `temp-vc create` to create a temporary voice channel\n' + this.temporaryChannels.map(c => `<#${c}>`).join(' '))
                        ]
                    });

                    const name = interaction.options.getString('name');
                    const max = interaction.options.getInteger('max') || 0;

                    const embed = new MessageEmbed().setColor(Client.AxisUtility.get().config.embedColor);
                    if (!interaction.member.voice.channel) return SafeInteract.reply(interaction, { content: ' ', embeds: [embed.setAuthor({ name: 'You must be in a voice channel to use this command' }).setColor('RED')] });
                    if(this.config.tempChannelLimit != 0 && this.temporaryChannels.length >= this.config.tempChannelLimit) return SafeInteract.reply(interaction, { content: ' ', embeds: [embed.setAuthor({ name: 'You can\'t create temporary vc at the moment. Wait for another vc to be deleted' }).setColor('RED')] });

                    // get a category
                    const category = this.config.tempChannelCategoryId;
                    const categoryChannel = interaction.guild.channels.cache.find(c => c.id === category && c.type == 'GUILD_CATEGORY');

                    // create the channel in the category
                    const channel = await categoryChannel.createChannel(name, { type: 'GUILD_VOICE', parent: categoryChannel.id, userLimit: max, position: 0 }).catch(e => false);
                    if (!channel) return SafeInteract.reply(interaction, { content: ' ', embeds: [embed.setAuthor({ name: 'An error occured while creating the channel' }).setColor('RED')] });

                    // move the user to the channel
                    const member = interaction.member;
                    const moveMember = await member.voice.setChannel(channel).catch(e => false);
                    if(!moveMember) {
                        await channel.delete().catch(e => false);
                        return SafeInteract.reply(interaction, { content: ' ', embeds: [embed.setAuthor({ name: 'An error occured while moving you to the channel' }).setColor('RED')] });
                    }

                    // send a message
                    this.temporaryChannels.push(channel.id);
                    embed.setDescription(`Temporary voice channel created: <#${channel.id}>\n:information_source: Temporary vc will automatically delete itself when it's empty`).setColor('GREEN').setFooter({ text: `Created by ${member.user.tag}`, icon_url: member.user.displayAvatarURL() });
                    await SafeInteract.reply(interaction, { content: ' ', embeds: [embed] });
                })
        ];

        // delete the channel when the user leaves
        Client.on('voiceStateUpdate', async (oldState, newState) => {
            this.syncChannels(Client);
            if(!this.temporaryChannels.includes(oldState.channelId)) return;

            const channel = Client.channels.cache.get(oldState.channelId);
            if(!channel) return;

            if((!newState.member.voice.channel || newState.member.voice.channel.id !== oldState.channelId) && channel.members.size === 0) {
                await channel.delete().catch(e => false);
                this.temporaryChannels = this.temporaryChannels.filter(c => c !== oldState.channelId);
            }
        });

        return true;
    }

    syncChannels(Client) {
        this.temporaryChannels = this.temporaryChannels.filter(c => Client.channels.cache.get(c));
    }

    getConfig(location) {
        return Yml.parse(MakeConfig(location, {
            tempChannelCategoryId: '',
            tempChannelLimit: 5
        }));
    }
}

module.exports = new TempVoiceChannel();