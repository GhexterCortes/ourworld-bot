"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorEmbed = void 0;
const discord_js_1 = require("discord.js");
function errorEmbed(message, positive = false, useAuthorField = true) {
    const embed = new discord_js_1.MessageEmbed();
    embed.setColor(positive ? 'GREEN' : 'RED');
    if (message.indexOf('\n') > -1) {
        embed.setDescription(message);
    }
    else {
        if (useAuthorField) {
            embed.setAuthor({ name: message });
        }
        else {
            embed.setDescription(message);
        }
    }
    return embed;
}
exports.errorEmbed = errorEmbed;
