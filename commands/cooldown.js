const { Permissions } = require("discord.js");
const { SlashCommandBuilder } = require('@discordjs/builders');
const { registerCooldown } = require("../DAL/databaseApi");
const { logActivity } = require("../DAL/logApi");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cooldown')
		.setDescription('Set how long you want your cooldown to be. This is server-wide.')
        .addIntegerOption(option =>
            option.setName("minutes")
                .setDescription("The number of minutes the cooldown lasts for a user (leave blank for 5 minutes).")
                .setRequired(false)),
	async execute(interaction) {
        try {
            const userId = interaction.user.id;
            let minutes = interaction.options.getInteger("minutes");
            const guildId = interaction.guild.id;

            if (!minutes || minutes < 1) minutes = null;

            const member = await interaction.guild.members.fetch(userId);

            if (!member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
                await interaction.reply({ 
                    content: "You need the MANAGE_CHANNELS permission to run this command",
                    ephemeral: true 
                });
                return;
            }

            if (minutes > 60) {
                await interaction.reply({ 
                    content: "Cooldown cannot be greater than 1 hour",
                    ephemeral: true 
                });
                return;
            }

            await registerCooldown(guildId, minutes);

            await logActivity(interaction.client, interaction.guild.id, `Cooldown set`, `<@${interaction.user.id}> used:\n ${interaction.toString()}`);

            if (!minutes) minutes = 5;

            await interaction.reply({ 
                content: `Cooldown set to ${minutes} minute${minutes > 1 ? "s" : ""}`,
                ephemeral: true 
            });
        } catch (err) {
            console.log(`Error in /strictness: ${err}`);
        }
	},
};