const { Client, Collection, Intents } = require('discord.js');
const fs = require('fs');
const { expireCooldowns, loadAllLogChannels } = require("./DAL/databaseApi");

const client = new Client({ 
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ], 
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'] 
});

const { token } = require('./settings.json');

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

require("./Monitors/gifMonitor")(client);
require("./Monitors/serverCount")(client);

let expireTimer;

client.once('ready', async () => {
    expireTimer = setInterval(expireCooldowns, 1000 * 60);
    await loadAllLogChannels();
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

// login to discord - we should auto reconnect automatically
client.login(token);