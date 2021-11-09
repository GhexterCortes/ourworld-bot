module.exports = new create();
function create(){
    this.versions = ['1.1.2'];

    this.start = async (client, action, config, language) => {
        async function setPresence(presence){
            await client.user.setPresence({
                status: action.get(config.presence.status),
                activities: [{
                    name: action.get(config.presence.activityName),
                    type: action.get(config.presence.type).toUpperCase()
                }]
            });
        }

        setInterval(async () => {
            await setPresence();
        }, 1000 * 60);

        return true;
    }
}