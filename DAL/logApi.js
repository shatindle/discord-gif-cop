const { MessageEmbed } = require("discord.js");
const { getLogChannel } = require("../DAL/databaseApi");

async function logActivity(client, guildId, action, activity, color = "#007bff") {
    try {
        const logChannel = getLogChannel(guildId);

        if (!logChannel)
            return;
            
        let channel = client.channels.cache.get(logChannel);

        if (!channel || !channel.send)
            channel = client.channels.fetch(logChannel);

        const message = new MessageEmbed()
            .setColor(color)
            .setTitle(action)
            .setDescription(activity)
            .setTimestamp();

        await channel.send({ embeds: [message] });
    } catch (err) {
        console.log(`Error logging activity: ${err}`);
    }
}

const WARNING_COLOR = "#ffc107";

const logWarning = async (client, guildId, userId, channelId, type) =>
    await logActivity(
        client,
        guildId, 
        `User warned for ${type} spam`,
        `**<@${userId}> sent ${type} spam in <#${channelId}>**`,
        WARNING_COLOR);

module.exports = {
    logActivity,
    logWarning
};