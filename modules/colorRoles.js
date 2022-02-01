const MakeConfig = require('../scripts/makeConfig');
const Yml = require('yaml');

class ColorRoles {
    constructor() {
        this.versions = ['1.6.0','1.6.1'];
        this.roles = this.getConfig();
    }

    async onStart(Client) {
        this.roles.roles = this.roles.roles.filter((data, i) => {
            const guild = Client.guilds.cache.get(data.guildId);
            if (!guild) return false;

            const role = guild.roles.cache.find(r => r.name === data.role || r.id === data.role);
            if (!role) return false;

            this.roles.roles[i].role = role;
            this.roles.roles[i].guild = guild;
            return true;
        });

        this.setColors(Client);
        return true;
    }

    async setColors(Client) {
        for (const role of this.roles.roles) {
            if(!role.guild || !role.role) return false;

            const colors = role.randomize ? role.colors.sort(() => Math.random() - 0.5) : role.colors;
            
            for (const color of (colors || [])) {
                Client.AxisUtility.get().logger.warn('changing color of ' + role.role.name + ' to ' + color);
                await role.role.setColor(color);
                await this.sleep(role.interval || this.roles.interval);
            }
        }

        return this.setColors(Client);
    }

    // sleep method
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getConfig() {
        return Yml.parse(MakeConfig('./config/colorRoles/config.yml', {
            interval: 5000,
            roles: [
                {
                    role: 'gae',
                    guildId: '830456204735807529',
                    randomize: false,
                    colors: [
                        '#e40303',
                        '#ff8c00',
                        '#ffed00',
                        '#008026',
                        '#004dff',
                        '#750787'
                    ]
                }
            ]
        }));
    }
}

module.exports = new ColorRoles();