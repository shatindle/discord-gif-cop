const { Permissions } = require("discord.js");
const { SlashCommandBuilder } = require('@discordjs/builders');
const { registerLevelMonitor } = require("../DAL/databaseApi");
const { logActivity } = require("../DAL/logApi");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('strictness')
		.setDescription('Set how strict you want the bot to be.')
        .addStringOption(option =>
            option.setName("level")
                .setDescription("The level of strictness (default is GIF only).")
                .addChoices(
                    { name: "Unrestricted", value: "none" },
                    { name: "GIF Only", value: "gif" },
                    { name: "All", value: "all" })
                .setRequired(true))
        .addChannelOption(option => 
            option.setName("channel")
                .setDescription("The channel this should apply to (leave blank to apply to all channels).")),
	async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const channel = interaction.options.getChannel("channel");
            const level = interaction.options.getString("level");
            const guildId = interaction.guild.id;

            const member = await interaction.guild.members.fetch(userId);

            if (!member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
                await interaction.reply({ 
                    content: "You need the MANAGE_CHANNELS permission to run this command",
                    ephemeral: true 
                });
                return;
            }

            await registerLevelMonitor(guildId, channel ? channel.id : null, level);

            await logActivity(interaction.client, interaction.guild.id, `Strictness applied`, `<@${interaction.user.id}> used:\n ${interaction.toString()}`);

            await interaction.reply({ 
                content: "Strictness level updated",
                ephemeral: true 
            });
        } catch (err) {
            console.log(`Error in /strictness: ${err}`);
        }
	},
};