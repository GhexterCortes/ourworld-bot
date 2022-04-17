import { CommandInteraction, EmbedFieldData, Message, MessageEmbed } from 'discord.js';
import { CommandMessage, InteractionCommandBuilder, MessageCommandBuilder, RecipleClient, RecipleInteractionCommandExecute, RecipleMessageCommandExecute, RecipleScript } from 'reciple';
import { OnDisableAction, Pagination } from '@ghextercortes/djs-pagination';
import { errorEmbed } from './_errorEmbed';


class Help implements RecipleScript {
    public versions: string[] = ['1.0.10'];
    public commands: (MessageCommandBuilder | InteractionCommandBuilder)[] = [];
    public allCommands: { name: string; description: string; usage: string; type: string; builder: MessageCommandBuilder|InteractionCommandBuilder }[] = [];

    public onStart(client: RecipleClient) {
        this.commands.push(
            new MessageCommandBuilder()
                .setName('help')
                .setDescription('Get command help')
                .addOption(option => option
                    .setName('filter')
                    .setDescription('Filter commands')
                    .setRequired(true)
                    .setValidator(val => !!val)
                )
                .setAllowExecuteByBots(false)
                .setAllowExecuteInDM(false)
                .setValidateOptions(true)
                .setExecute(async command => {

                }),
            new InteractionCommandBuilder()
                .setName('help')
                .setDescription('Get command help')
                .addStringOption(option => option
                    .setName('filter')
                    .setDescription('Filter commands')
                    .setRequired(true)    
                )
                .setExecute(async command => {

                })
        );

        return true;
    }

    public onLoad(client: RecipleClient) {
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

    public getUsage(command: MessageCommandBuilder|InteractionCommandBuilder, messageCommandPrefix: string = '!'): string {
        if ((command as MessageCommandBuilder).type == 'MESSAGE_COMMAND') {
            let options = '';

            for (const option of (command as MessageCommandBuilder).options) {
                options += option.required ? `<${option.name}> ` : `[${option.name}] `;
            }

            return `${messageCommandPrefix}${command.name} ${options.trim()}`;
        } else if ((command as InteractionCommandBuilder).type == 'INTERACTION_COMMAND') {
            let options = '';

            for (const option of (command as InteractionCommandBuilder).options) {
                const opt = option.toJSON();

                options += opt.required ? `<${opt.name}> ` : `[${opt.name}] `;
            }

            return `/${command.name} ${options.trim()}`;
        } else {
            return '';
        }
    }

    public getCommandHelp(command: MessageCommandBuilder|InteractionCommandBuilder) {
        const builder = (command as MessageCommandBuilder).type === 'MESSAGE_COMMAND' ? (command as MessageCommandBuilder) : (command as InteractionCommandBuilder).toJSON();

        let optionFields: EmbedFieldData[] = [];

        for (const option of builder.options ?? []) {
            optionFields.push({
                name: option.name,
                value: '**'+ (option.required ? 'Required' : 'Optional') +'** — '+ option.description +'\n```\n'+ option.name +'\n```',
                inline: true
            });
        }

        return new MessageEmbed()
            .setAuthor({ name: `Help Command` })
            .setDescription(`**${builder.name}** — ${command.description}`)
            .addFields(optionFields)
            .setColor('BLUE');
    }

    public async getMessageHelp(command: Message, filter: string) {
        const commands = this.allCommands.filter(c => c.type === "MESSAGE_COMMAND" && (filter && c.name.indexOf(filter) > -1));
        const exactCommand = this.allCommands.find(c => c.type === "MESSAGE_COMMAND" && c.name.toLowerCase() === filter.trim().toLowerCase());

        if (exactCommand) return command.reply({ content: ' ', embeds: [this.getCommandHelp(exactCommand.builder)] });

        if (!commands.length) return command.reply({ content: ' ', embeds: [errorEmbed('No commands found')] });
        
        const pagination = this.generatePagination(commands);
        return pagination.paginate(command);
    }

    public async getInteractionHelp(command: CommandInteraction, filter: string) {
        let content = '';

        const commands = this.allCommands.filter(c => c.type === "INTERACTION_COMMAND" && (filter && c.name.indexOf(filter) > -1));
        const exactCommand = this.allCommands.find(c => c.type === "INTERACTION_COMMAND" && c.name.toLowerCase() === filter.trim().toLowerCase());

        if (exactCommand) return command.reply({ content: ' ', embeds: [this.getCommandHelp(exactCommand.builder)] });
        if (!commands.length) return command.reply({ content: ' ', embeds: [errorEmbed('No commands found')] });

        const pagination = this.generatePagination(commands);
        return pagination.paginate(command);
    }

    public generatePagination(commands: { name: string; description: string; usage: string; type: string; builder: MessageCommandBuilder|InteractionCommandBuilder }[]) {
        const contentLimit = 5;

        let pages: MessageEmbed[] = [];

        for (let i = 0; i < commands.length; i += contentLimit) {
            const page = new MessageEmbed();

            for (let j = i; j < i + contentLimit; j++) {
                if (j >= commands.length) break;

                page.addFields([{
                    name: `**${commands[j].name}** — ${commands[j].description}`,
                    value: `\`\`\`\n${commands[j].usage}\n\`\`\``,
                    inline: false
                }]);
            }

            pages.push(page);
        }

        return new Pagination()
            .addPages(pages)
            .setAuthorIndependent(true)
            .setTimer(20000)
            .setOnDisableAction(OnDisableAction.DISABLE_BUTTONS);
    }
}

module.exports = new Help();