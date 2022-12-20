const { Permissions } = require("discord.js");
const { SlashCommandBuilder } = require('@discordjs/builders');
const { monitor:firebaseMonitor, addressChanges } = require("../DAL/databaseApi");
const { logActivity } = require("../DAL/logApi");

const serverLevels = {};

firebaseMonitor("levels", (changes) => addressChanges(changes, serverLevels));

function convertLevelToText(level) {
    if (level === "gif") return "GIF Only";
    if (level === "none") return "Unrestricted";
    return "Fully Restricted";
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('config')
		.setDescription('Display the current server spam config.'),
	async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;
            const member = await interaction.guild.members.fetch(userId);

            if (!member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
                await interaction.reply({ 
                    content: "You need the MANAGE_CHANNELS permission to run this command",
                    ephemeral: true 
                });
                return;
            }
            
            let serverLevel = serverLevels[guildId];

            if (!serverLevel) {
                serverLevel = {
                    id: guildId,
                    level: "gif" // default the server to GIF Only
                };
            }

            let response = `__Server Permissions__
**Global**: ${convertLevelToText(serverLevel.level)}

__Channel Overrides__
`;

            let hasOverride = false;

            for (let key of Object.keys(serverLevel)) {
                if (key === "id") continue;
                if (key === "level") continue;
                if (key === "createdOn") continue;
                if (key === "_id") continue;

                hasOverride = true;
                response += `<#${key}>: ${convertLevelToText(serverLevel[key])}
`;
            }

            if (!hasOverride) response += "No overrides";

            await logActivity(interaction.client, interaction.guild.id, `Config viewed`, `<@${interaction.user.id}> used:\n ${interaction.toString()}`);

            await interaction.reply({ 
                content: response
            });
        } catch (err) {
            console.log(`Error in /config: ${err}`);
        }
	},
};