const DiscordApi = require('discord.js');
const { expireCooldowns } = require("./DAL/databaseApi");

const discord = new DiscordApi.Client({ 
    intents: [
        DiscordApi.Intents.FLAGS.GUILDS,
        DiscordApi.Intents.FLAGS.GUILD_MESSAGES
    ], 
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'] 
});

const { token } = require('./settings.json');

// login to discord - we should auto reconnect automatically
discord.login(token);

require("./Monitors/gifMonitor")(discord);
require("./Monitors/serverCount")(discord);

const expireTimer = setInterval(expireCooldowns, 1000 * 60);