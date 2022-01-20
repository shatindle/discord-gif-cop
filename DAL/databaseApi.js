const { firebaseProjectId } = require('../settings.json');
const Firestore = require('@google-cloud/firestore');
const path = require("path");

const db = new Firestore({
    projectId: firebaseProjectId,
    keyFilename: path.join(__dirname, '../firebase.json'),
});

/**
 * @description Logs the action and reasons for it
 * @param {String} type Ban, Kick, or Fail
 * @param {String} guildId The server ID
 * @param {String} userId The user ID
 * @param {String} username The username and discriminator
 * @param {String} reason Details about the action taken
 */
async function writeLog(type, guildId, userId, username, reason, error) {
    if (typeof type === "undefined")
        type = "unknown";

    if (typeof guildId === "undefined")
        guildId = null;

    if (typeof userId === "undefined")
        userId = null;

    if (typeof username === "undefined")
        username = null;

    if (typeof reason === "undefined")
        reason = null;

    if (typeof error === "undefined")
        error = null;

    var moment = Date.now().valueOf().toString();

    var ref = await db.collection(type).doc(moment);
    await ref.set({
        guildId,
        userId,
        username,
        reason,
        error,
        timestamp: Firestore.Timestamp.now()
    });
}

async function recordWarning(guildId, userId, username, reason) {
    await writeLog("warning", guildId, userId, username, reason);
}

async function recordFail(guildId, userId, username, reason) {
    await writeLog("ban", guildId, userId, username, reason);
}

async function recordError(guildId, userId, error, reason) {
    await writeLog("error", guildId, userId, null, reason, error);
}

var coolDowns = {};

/**
 * @description Evaluates repeat occurrences
 * @param {String} userId The user's discord ID
 * @param {String} message The message the user sent
 * @returns Whether the user should be removed from the server (repeat phishing message)
 */
function isCooldownInEffect(userId, guildId, cooldown) {
    const key = userId + ":" + guildId;

    if (typeof coolDowns[key] !== "number") {
        coolDowns[key] = Date.now().valueOf() + cooldown;

        return false;
    }

    return coolDowns[key];
}

function expireCooldowns() {
    const expired = [];

    for (const [key, value] of Object.entries(coolDowns)) {
        if (value < Date.now().valueOf()) {
            expired.push(key);
        }
    }

    expired.forEach(k => delete coolDowns[k]);
}

module.exports = {
    isCooldownInEffect,
    expireCooldowns,
    recordWarning,
    recordFail,
    recordError
};