module.exports = {
    /**
     * 
     * @param {Object[]} options - The options for the punishment
     * @param {Object[]} options.member - The member to punish
     * @param {string} options.reason - The reason for the punishment
     * @param {number} options.time - The time to punish the member for
     * @returns 
     */
    async timeout(options = { member: null, reason: 'Timed out', time: 10000 }) {
        if(!options.member) return false;

        const timeout = await options.member?.timeout(options.time, options.reason).catch(err => false);
        if(!timeout) return false;

        return timeout;
    },

    /**
     * 
     * @param {Object[]} options - The options for the punishment
     * @param {Object[]} options.member - The member to punish
     * @param {string} options.reason - The reason for the punishment
     * @returns 
     */
    async kick(options = { member: null, reason: 'Kicked from server' }) {
        if(!options.member) return false;

        const kick = await options.member?.kick(options.reason).catch(err => false);
        if(!kick) return false;

        return kick;
    },

    /**
     * 
     * @param {Object} options - The options for the punishment
     * @param {Object[]} options.member - The member to punish
     * @param {string} options.reason - The reason for the punishment
     * @returns 
     */
     async ban(options = { member: null, reason: 'Banned from the server' }) {
        if(!options.member) return false;

        const ban = await options.member?.ban({ reason: options.reason }).catch(err => false);
        if(!ban) return false;

        return ban;
    }
}