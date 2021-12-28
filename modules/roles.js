const Yml = require('yaml');
const Database = require('./_database');
const MakeConfig = require('../scripts/makeConfig');
const { Logger } = require('fallout-utility');
const UsrGuild = require('../scripts/userGuild');
const ms = require('ms');
const dayjs = require('dayjs');

const InteractionCommandBuilder = require('../scripts/interactionCommandBuilder');
const SafeInteract = require('../scripts/safeInteract');
const SafeMessage = require('../scripts/safeMessage');
let UserGuild = null;

const log = new Logger('RoleManagement');
let currentTime = new Date().getTime();
let scriptConfig = null;
let db = null;

class Role {
    constructor() {
        this.versions = ['1.4.1', '1.4.2', '1.4.3', '1.4.4'];
    }

    async start(Client) {
        UserGuild = new UsrGuild(Client);
        scriptConfig = this.getConfig('./config/roles.yml');
        db = await new Database(scriptConfig.databaseServerId, scriptConfig.databaseChannelId, scriptConfig.databaseName).start(Client);

        await db.fetchData(scriptConfig.databaseMessageId ? scriptConfig.databaseMessageId : null, true);
        
        try{
            await this.updateDatabase(true, Client);
        } catch (err) {
            await db.update({
                users: []
            });
        }

        this.commands = [
            new InteractionCommandBuilder()
                .setCommand(SlashCommandBuilder => SlashCommandBuilder
                    .setName('role-timer')
                    .setDescription('Add a timer for user role')
                    .addUserOption(user => user
                        .setName('user')
                        .setDescription('The user to add the timer for')
                        .setRequired(true)
                    )
                    .addRoleOption(role => role
                        .setName('role')
                        .setDescription('The role to add the timer for (The role will be added if doesn\'t exist)')
                        .setRequired(true)
                    )
                    .addStringOption(timer => timer
                        .setName('timer')
                        .setDescription('The timer to add (e.g. 1h, 1d, 1w, 1m, 1y)')
                        .setRequired(true)  
                    )
                )
                .setExecute(async (interaction, Client) => {
                    const user = interaction.options.getUser('user');
                    const role = interaction.options.getRole('role');
                    const timer = ms(interaction.options.getString('timer'));

                    if(!timer) return SafeInteract.reply(interaction, { content: 'Invalid timer', ephemeral: true });

                    const member = await UserGuild.getMember(interaction.guild.id, user.id);
                    if(!member) return SafeInteract.reply(interaction, { content: 'User not found', ephemeral: true });

                    const userRole = await member.roles.cache.find(r => r.id === role.id);
                    if(!userRole) {
                        const addedRole = await member.roles.add(role).catch(() => false);
                        if(!addedRole) return SafeInteract.reply(interaction, { content: 'Failed to add role', ephemeral: true });
                    }

                    let time = new Date().getTime() + timer;
                    
                    await this.updateDatabase();
                    
                    if(db.response.users.some(u => u.userId === user.id && u.roleId === role.id && u.guildId === interaction.guild.id)) {
                        db.response.users = db.response.users.filter(u => !(u.userId === user.id && u.roleId === role.id && u.guildId === interaction.guild.id));
                    }
                    await db.update({ users: [...db.response.users, {
                        userId: user.id,
                        roleId: role.id,
                        guildId: interaction.guild.id,
                        time: time
                    }] });

                    return SafeInteract.reply(interaction, { content: `Added timer for ${user.username}'s ${role.name} role (${ms(timer, { long: true })})`, ephemeral: true});
                })
        ]
        return !!db;
    }

    async updateDatabase(fetchInterval = false, Client = null) {
        await db.automaticFetch();
        if(!db.response?.users) {
            throw new Error(`Database is empty: ${JSON.stringify(db.response)}`);
        }

        if(fetchInterval && Client) {
            for (const user of db.response.users) {
                log.warn(`Updating ${user.userId}'s ${user.roleId} role`);

                if(user.time > new Date().getTime()) continue;
                const member = await UserGuild.getMember(user.guildId, user.userId);
                if(!member) continue;
                const role = await member.roles.cache.find(r => r.id === user.roleId);
                if(!role) continue;

                const action = await member.roles.remove(role).catch(err => { log.error(err); return false; });
                await db.update({ users: db.response.users.filter(u => !(u.userId === user.userId && u.roleId === user.roleId && u.guildId === user.guildId)) });
                
                if(!action) { log.error(`Action failed`); continue; }
                log.warn(`Removed role from user ${member.tag}`);

                if(scriptConfig.dmAfterRoleRemove.enabled) await SafeMessage.send(member, scriptConfig.dmAfterRoleRemove.message.replace('%role%', role.name).replace('%server%', member.guild.name));
            }

            setTimeout(async () => {
                await this.updateDatabase(true, Client);
            }, ms(scriptConfig.fetchInterval));
        }
        return true;
    }

    getConfig(location) {
        return Yml.parse(MakeConfig(location, {
            databaseName: 'roles',
            databaseServerId: '',
            databaseChannelId: '',
            databaseMessageId: '',
            fetchInterval: '1m',
            dmAfterRoleRemove: {
                enabled: true,
                message: 'You have been removed from the role **%role%** in server **%server%**'
            }
        }))
    }
}

module.exports = new Role();