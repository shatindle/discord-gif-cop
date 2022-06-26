const DiscordApi = require('discord.js');
const { extractUrlsFromContent, checkIfIsRestricted } = require("../DAL/contentInspectionApi");
const { recordError, recordWarning, isCooldownInEffect } = require("../DAL/databaseApi");
const { logWarning } = require("../DAL/logApi");

const reason = "GIF cooldown is in effect";
const cooldownTime = 1000 * 60 * 5;

/**
 * @description Looks for nitro/steam scams and removes them
 * @param {DiscordApi.Client} discord The discord client
 */
 function monitor(discord) {
    discord.on('messageCreate', async (message) => {
        // ignore posts from bots
        if (message.author.bot) return;
    
        // ignore posts from mods
        if (message.member.permissions.has(DiscordApi.Permissions.FLAGS.MANAGE_MESSAGES)) return;

        var guildId = message.guild.id;
        var userId = message.member.id;
    
        try {
            // possible spam.  Does it have a URL?
            var urlsFound = extractUrlsFromContent(message.content);
        
            for (var i = 0; i < urlsFound.length; i++) {
                // see if the message content contains a gif
                if (await checkIfIsRestricted(urlsFound[i]) || await checkIfIsRestricted(urlsFound[i] + ".gif")) {
                    await restrictedContentEncountered(message, userId, guildId);
                }
            }

            if (message.attachments && message.attachments.size > 0) {
                // evaluate the attachments
                for (let file of message.attachments) {
                    if (file && file.length > 1 && file[1].contentType === "image/gif") {
                        await restrictedContentEncountered(message, userId, guildId);
                    }
                }
            }
        } catch (err) {
            // something went wrong when assessing the message content
            try {
                await recordError(guildId, userId, err, reason);
            } catch (err2) {
                await recordError("", "", err2, reason);
            }
        }
    });
 }

 async function restrictedContentEncountered(message, userId, guildId) {
     // check if the user has a recent cooldown in this server
     let currentTime = Date.now().valueOf();
     let cooldownTimeRemaining = isCooldownInEffect(userId, guildId, cooldownTime);

     if (cooldownTimeRemaining) {
         // cool down is in effect
         if (message.deletable) {
             let username = message.member.user.username + "#" + message.member.user.discriminator;
             let channelId = message.channel.id;
             let client = message.client;

             await message.delete();

             let minutes = Math.trunc((cooldownTimeRemaining - currentTime) / 60000);

             let timeLeft = minutes > 1 ? "" + minutes + " minutes" : "about a minute";

             var response = await message.channel.send(
                 "GIF cooldown is in effect for <@" + userId + ">.  Please wait " + timeLeft + " before sending another GIF.");

             setTimeout(async function() {
                 if (response.deletable)
                     await response.delete();
             }, 5000);

             await recordWarning(
                 guildId,
                 userId,
                 username,
                 reason);

            await logWarning(
                client,
                guildId,
                userId,
                username,
                channelId,
                "GIF");
         }
     }
 }

module.exports = monitor;
