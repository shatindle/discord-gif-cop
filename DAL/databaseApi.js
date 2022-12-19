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

const logs = {};
const LOGS_COLLECTION = "logchannels";

/**
 * @description Clone a cloneable channel
 * @param {String} id The channel ID
 * @param {String} guildId The server ID
 * @param {String} owner The current owner user ID
 */
 async function registerLogs(guildId, channelId) {
    var ref = await db.collection(LOGS_COLLECTION).doc(guildId);
    var docs = await ref.get();

    if (channelId) {
        await ref.set({
            id: guildId,
            channelId,
            createdOn: Firestore.Timestamp.now()
        });
    } else {
        if (docs.exists) {
            await ref.delete();
        }
    }

    logs[guildId] = {
        id: guildId,
        channelId
    };
}

const levels = {};
const LEVEL_COLLECTION = "levels";

async function registerLevelMonitor(guildId, channelId, level) {
    var ref = await db.collection(LEVEL_COLLECTION).doc(guildId);
    var docs = await ref.get();

    if (docs.exists) {
        if (channelId) {
            await ref.update({
                [channelId]: level
            });
        } else {
            await ref.update({
                level
            });
        }
    } else {
        if (channelId) {
            await ref.set({
                id: guildId,
                [channelId]: level,
                createdOn: Firestore.Timestamp.now()
            });
        } else {
            await ref.set({
                id: guildId,
                level,
                createdOn: Firestore.Timestamp.now()
            });
        }
    }
}

async function loadAllLogChannels() {
    var ref = await db.collection(LOGS_COLLECTION);
    var docs = await ref.get();

    if (docs.size > 0) {
        docs.forEach(e => {
            var data = e.data();

            logs[data.id] = data;
        });
    }
}

function getLogChannel(guildId) {
    if (logs[guildId])
        return logs[guildId].channelId;

    return null;
}

const callbacks = {};
const observers = {};

function addressChanges(changes, list) {
    try {
        changes.added.forEach(item => list[item._id] = item);
        changes.modified.forEach(item => list[item._id] = item);
        changes.removed.forEach(item => delete list[item._id]);
    } catch (err) {
        console.log(`Failed to address changes: ${err.toString()}`);
    }
}

function monitor(type, callback) {
    if (!callbacks[type]) callbacks[type] = [];

    callbacks[type].push(callback);

    setupObservers();
}


function setupObservers() {
    for (let observer of Object.keys(callbacks)) {
        if (!observers[observer] && callbacks[observer] && callbacks[observer].length > 0)
            observers[observer] = configureObserver(observer, callbacks[observer]);
    }
}

function configureObserver(type, callbackGroup) {
    return db.collection(type).onSnapshot(async querySnapshot => {
        let changes = {
            added: [],
            modified: [],
            removed: []
        };
    
        querySnapshot.docChanges().forEach(change => {
            changes[change.type].push({...change.doc.data(), _id:change.doc.id});
        });
    
        for (let i = 0; i < callbackGroup.length; i++) {
            try {
                await callbackGroup[i].call(null, changes);
            } catch (err) {
                console.log(`Error in callback ${i} of ${type}: ${err.toString()}`);
            }
        }
    });
}

module.exports = {
    isCooldownInEffect,
    expireCooldowns,
    recordWarning,
    recordFail,
    recordError,

    registerLogs,
    loadAllLogChannels,
    getLogChannel,
    registerLevelMonitor,

    monitor,
    addressChanges
};