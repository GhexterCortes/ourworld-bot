"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const reciple_1 = require("reciple");
const djs_pagination_1 = require("@ghextercortes/djs-pagination");
const _errorEmbed_1 = require("./_errorEmbed");
class Help {
    constructor() {
        this.versions = ['1.0.10'];
        this.commands = [];
        this.allCommands = [];
    }
    onStart(client) {
        this.commands.push(new reciple_1.MessageCommandBuilder()
            .setName('help')
            .setDescription('Get command help')
            .addOption(option => option
            .setName('filter')
            .setDescription('Filter commands')
            .setRequired(false))
            .setAllowExecuteByBots(false)
            .setAllowExecuteInDM(false)
            .setValidateOptions(true)
            .setExecute((command) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const filter = ((_a = command.command.args) === null || _a === void 0 ? void 0 : _a.join(' ')) || '';
            return this.getMessageHelp(command.message, filter);
        })), new reciple_1.InteractionCommandBuilder()
            .setName('help')
            .setDescription('Get command help')
            .addStringOption(option => option
            .setName('filter')
            .setDescription('Filter commands')
            .setRequired(false))
            .setExecute((command) => __awaiter(this, void 0, void 0, function* () {
            const filter = command.interaction.options.getString('filter') || '';
            return this.getInteractionHelp(command.interaction, filter);
        })));
        return true;
    }
    onLoad(client) {
        const commands = [...Object.values(client.commands.INTERACTION_COMMANDS), ...Object.values(client.commands.MESSAGE_COMMANDS)];
        for (const command of commands) {
            this.allCommands.push({
                name: command.name,
                description: command.description || '',
                usage: this.getUsage(command),
                type: command.type,
                builder: command
            });
        }
    }
    getUsage(command, messageCommandPrefix = '!') {
        if (command.type == 'MESSAGE_COMMAND') {
            let options = '';
            for (const option of command.options) {
                options += option.required ? `<${option.name}> ` : `[${option.name}] `;
            }
            return `${messageCommandPrefix}${command.name} ${options.trim()}`;
        }
        else if (command.type == 'INTERACTION_COMMAND') {
            let options = '';
            for (const option of command.options) {
                const opt = option.toJSON();
                options += opt.required ? `<${opt.name}> ` : `[${opt.name}] `;
            }
            return `/${command.name} ${options.trim()}`;
        }
        else {
            return '';
        }
    }
    getCommandHelp(command) {
        var _a;
        const builder = command.type === 'MESSAGE_COMMAND' ? command : command.toJSON();
        let optionFields = [];
        for (const option of (_a = builder.options) !== null && _a !== void 0 ? _a : []) {
            optionFields.push({
                name: option.name,
                value: '**' + (option.required ? 'Required' : 'Optional') + '** — ' + option.description + '\n```\n' + option.name + '\n```',
                inline: true
            });
        }
        return new discord_js_1.MessageEmbed()
            .setAuthor({ name: `${builder.name}` })
            .setDescription(`${command.description}`)
            .addFields(optionFields)
            .setColor('BLUE');
    }
    getMessageHelp(command, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            const commands = this.allCommands.filter(c => c.type === "MESSAGE_COMMAND" && (filter && c.name.indexOf(filter) > -1 || !filter));
            const exactCommand = this.allCommands.find(c => c.type === "MESSAGE_COMMAND" && c.name.toLowerCase() === filter.trim().toLowerCase());
            if (exactCommand)
                return command.reply({ content: ' ', embeds: [this.getCommandHelp(exactCommand.builder)] });
            if (!commands.length)
                return command.reply({ content: ' ', embeds: [(0, _errorEmbed_1.errorEmbed)('No commands found')] });
            const pagination = this.generatePagination(commands);
            return pagination.paginate(command);
        });
    }
    getInteractionHelp(command, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            let content = '';
            const commands = this.allCommands.filter(c => c.type === "INTERACTION_COMMAND" && (filter && c.name.indexOf(filter) > -1 || !filter));
            const exactCommand = this.allCommands.find(c => c.type === "INTERACTION_COMMAND" && c.name.toLowerCase() === filter.trim().toLowerCase());
            if (exactCommand)
                return command.reply({ content: ' ', embeds: [this.getCommandHelp(exactCommand.builder)] });
            if (!commands.length)
                return command.reply({ content: ' ', embeds: [(0, _errorEmbed_1.errorEmbed)('No commands found')] });
            const pagination = this.generatePagination(commands);
            return pagination.paginate(command);
        });
    }
    generatePagination(commands) {
        const contentLimit = 5;
        let pages = [];
        for (let i = 0; i < commands.length; i += contentLimit) {
            const page = new discord_js_1.MessageEmbed().setColor('BLUE').setAuthor({ name: 'Commands' });
            for (let j = i; j < i + contentLimit; j++) {
                if (j >= commands.length)
                    break;
                page.addFields([{
                        name: `${commands[j].name}`,
                        value: `${commands[j].description}\n\`\`\`\n${commands[j].usage}\n\`\`\``,
                        inline: false
                    }]);
            }
            pages.push(page);
        }
        return new djs_pagination_1.Pagination()
            .addPages(pages)
            .setAuthorIndependent(true)
            .setTimer(20000)
            .setOnDisableAction(djs_pagination_1.OnDisableAction.DISABLE_BUTTONS)
            .setButtons(buttons => buttons
            .addButton(djs_pagination_1.ButtonType.PREVIOUS_PAGE, new discord_js_1.MessageButton().setLabel('Prev').setStyle('PRIMARY').setCustomId('previous'))
            .addButton(djs_pagination_1.ButtonType.NEXT_PAGE, new discord_js_1.MessageButton().setLabel('Next').setStyle('SUCCESS').setCustomId('next')));
    }
}
module.exports = new Help();
