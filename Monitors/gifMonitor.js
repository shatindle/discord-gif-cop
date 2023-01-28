const DiscordApi = require('discord.js');
const { extractUrlsFromContent, checkIfIsRestricted } = require("../DAL/contentInspectionApi");
const { recordError, recordWarning, isCooldownInEffect, monitor:firebaseMonitor, addressChanges } = require("../DAL/databaseApi");
const { logWarning } = require("../DAL/logApi");

const reason = "GIF cooldown is in effect";

const serverLevels = {};

firebaseMonitor("levels", (changes) => addressChanges(changes, serverLevels));

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
        let channelId = message.channel.id;

        // get server permissions (if they exist)
        let serverLevel = serverLevels[guildId];

        if (!serverLevel) {
            serverLevel = {
                id: guildId,
                level: "gif", // default the server to GIF Only
                minutes: 5
            };
        }

        // channel level if it exists, otherwise server level if it exists, otherwise GIF only
        let channelLevel = serverLevel[channelId] ? serverLevel[channelId] : serverLevel.level ? serverLevel.level : "gif";
        let minutes = serverLevel.minutes ? serverLevel.minutes : 5;

        minutes = minutes * 60 * 1000;
    
        // no need to do anything if the channel allows everything
        if (channelLevel === "none") return;

        try {
            // possible spam.  Does it have a URL?
            var urlsFound = extractUrlsFromContent(message.content);
        
            for (var i = 0; i < urlsFound.length; i++) {
                // see if the message content contains a gif
                if (await checkIfIsRestricted(urlsFound[i], channelLevel) || await checkIfIsRestricted(urlsFound[i] + ".gif", channelLevel)) {
                    await restrictedContentEncountered(message, userId, guildId, channelLevel, minutes);
                    return;
                }
            }

            if (message.attachments && message.attachments.size > 0) {
                // evaluate the attachments
                for (let file of message.attachments) {
                    if (file && file.length > 1 && (channelLevel === "all" || file[1].contentType === "image/gif")) {
                        await restrictedContentEncountered(message, userId, guildId, channelLevel, minutes);
                        return;
                    }
                }
            }

            if (channelLevel === "allandstickers") {
                // check if the message contains stickers
                if (message.stickers.size > 0) {
                    // message contains stickers and we're supposed to restrict it
                    await restrictedContentEncountered(message, userId, guildId, channelLevel, minutes);
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

 async function restrictedContentEncountered(message, userId, guildId, level, cooldownTime) {
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

             let blocktype = "image, video, or sticker";

             if (level === "gif") blocktype = "GIF";
             else if (level === "all") blocktype = "image or video";
             else if (level === "allandstickers") blocktype = "image, video, or sticker";

             var response = await message.channel.send(
                 "Cooldown is in effect for <@" + userId + ">.  Please wait " + timeLeft + ` before sending another ${blocktype}.`);

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
                level);
         }
     }
 }

module.exports = monitor;
