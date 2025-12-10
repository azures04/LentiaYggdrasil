const database = require("../modules/database")
const utils = require("../modules/utils")

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
    const userResult = await database.getUser(uuid, false)

    if (userResult.code !== 200) {
        return { code: 204, message: "User not found" }
    }

    const dbUser = userResult.user
    const username = dbUser.username
    const cleanUuid = dbUser.uuid.replace(/-/g, "")

    const skinPromise = database.getActiveSkin(dbUser.uuid)
    const capePromise = database.getActiveCape(dbUser.uuid)
    const actionsPromise = database.getProfileActionsList(dbUser.uuid)

    const [skinResult, capeResult, actionsResult] = await Promise.all([
        skinPromise, 
        capePromise, 
        actionsPromise
    ])

    if (skinResult.code === 500) return skinResult
    if (capeResult.code === 500) return capeResult
    if (actionsResult.code === 500) return actionsResult

    const activeSkin = skinResult.data
    const activeCape = capeResult.data
    const profileActions = actionsResult.data || []

    const isSkinBanned = profileActions.includes("USING_BANNED_SKIN")
    const hasValidSkin = activeSkin && !isSkinBanned
    const hasValidCape = !!activeCape

    const skinNode = hasValidSkin ? {
        url: activeSkin.url,
        metadata: activeSkin.variant === "SLIM" ? { model: "slim" } : undefined
    } : undefined

    const capeNode = hasValidCape ? {
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

    const signature = unsigned ? null : utils.signProfileData(base64Value)

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

async function joinServer({ accessToken, selectedProfile, clientToken, serverId, ip }) {
    if (!selectedProfile || !accessToken || !selectedProfile || !serverId) {
        return { code: 400, message: "Missing required fields" }
    }

    const sessionCheck = await database.validateClientSession(accessToken, clientToken)
    if (sessionCheck.code !== 200) {
        return { code: 403, message: "Invalid access token" }
    }

    const saveResult = database.saveServerSession(selectedProfile, accessToken, serverId, ip)
    if (saveResult.code !== 200) {
        return { code: 500, message: "Failed to save server session" }
    }

    return { code: 204 }
}

async function hasJoinedServer({ username, serverId, ip }) {
    const userResult = await database.getUser(username, false)
    if (userResult.code !== 200) {
        return { code: 204, message: "User not found" }
    }

    const { uuid } = userResult.user
    const joinCheck = database.getServerSession(uuid, serverId)

    if (joinCheck.code !== 200 || !joinCheck.valid) {
        return { code: 204, message: "Join verification failed" }
    }

    if (ip && ip.trim() != "" && joinCheck.ip != ip) {
        return { code: 204, message: "Invalid IP address" }
    }

    const profileResult = await module.exports.getProfile({ 
        uuid: uuid, 
        unsigned: false 
    })

    return profileResult
}

module.exports = {
    getProfile,
    joinServer,
    hasJoinedServer,
    getBlockedServers,
    registerLegacySession,
    validateLegacySession,
}