const scripts = {
    say: require('./say'),
    //embed: require('embed'),
}

module.exports = {
    commands() {
        const commands = [];

        for(let script in scripts) {
            commands.push(scripts[script]);
        }

        return commands ? commands : [];
    }
}