const jwt = require("jsonwebtoken")
const utils = require("../modules/utils")
const crypto = require("node:crypto")
const database = require("../modules/database")
const certsManager = require("../modules/certsManager")
const keys = certsManager.getKeys()

async function registerLegacySession({ uuid, sessionId }) {
    const clientSession = await database.insertLegacyClientSessions(sessionId, uuid)
    if (clientSession.code != 200) {
        return clientSession
    }
    return { code: 200 }
}

async function validateLegacySession({ name, sessionId }) {
    const userQuery = await database.getUser(name)
    if (userQuery.code != 200) {
        return userQuery
    }
    const clientSession = await database.validateLegacyClientSession(sessionId, userQuery.user.uuid)
    if (clientSession.code != 200) {
        return clientSession
    }
    return { code: 200 }
}

async function getBlockedServers() {
    return await database.getBlockedServers()
}

module.exports = {
    getBlockedServers,
    registerLegacySession,
    validateLegacySession
}