const database = require("../modules/database")

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

async function getProfile({ uuid, unsigned = false }) {
    const userResult = database.getUser(uuid)
    if (userResult.code !== 200) {
        return { code: 204, message: "User not found" }
    }
    
    const { username, uuid: cleanUuid } = userResult.data

    const skinResult = database.getActiveSkin(cleanUuid)
    if (skinResult.code === 500) {
        return skinResult
    }

    const capeResult = database.getActiveCape(cleanUuid)
    if (capeResult.code === 500) {
        return capeResult
    }

    const actionsResult = database.getProfileActionsList(cleanUuid)
    if (actionsResult.code === 500) {
        return actionsResult
    }

    const activeSkin = skinResult.data
    const activeCape = capeResult.data
    const profileActions = actionsResult.data || []

    const shouldIncludeCape = !!activeCape

    const skinNode = {
        url: activeSkin.url,
        metadata: activeSkin.variant === "SLIM" ? { model: "slim" } : undefined
    }

    const capeNode = shouldIncludeCape ? {
        url: activeCape.url
    } : undefined

    const texturesObject = {
        ...(skinNode && { SKIN: skinNode }),
        ...(capeNode && { CAPE: capeNode })
    }

    const texturePayload = {
        timestamp: Date.now(),
        profileId: cleanUuid,
        profileName: username,
        signatureRequired: !unsigned,
        textures: texturesObject
    }

    const payloadJson = JSON.stringify(texturePayload)
    const base64Value = Buffer.from(payloadJson).toString("base64")

    const signature = unsigned ? null : signProfileData(base64Value)

    const propertyNode = {
        name: "textures",
        value: base64Value,
        ...(signature && { signature: signature })
    }

    return {
        code: 200,
        data: {
            id: cleanUuid,
            name: username,
            properties: [propertyNode],
            profileActions: profileActions
        }
    }
}

module.exports = {
    getProfile,
    getBlockedServers,
    registerLegacySession,
    validateLegacySession,
}