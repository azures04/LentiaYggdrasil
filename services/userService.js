const fs = require("node:fs/promises")
const path = require("node:path")
const utils = require("../modules/utils")
const crypto = require("node:crypto")
const database = require("../modules/database")
const certsManager = require("../modules/certsManager")
const serverKeys = certsManager.getKeys()
const TEXTURES_DIR = path.join(__dirname, "..", "data", "textures")
const maintenanceService = require("./maintenanceService")
const ssrfcheck = require("ssrfcheck")

async function getUser({ identifier }) {
    const result = await database.getUser(identifier, false)
    if (result.code != 200) {
        return result
    }
    const beautifiedUserObject = utils.normalizeBooleanFields(result.user)
    result.user = beautifiedUserObject
    return result
}

async function getUsernameAt({ identifier, date }) {
    const timestamp = utils.toTimestamp(date)
    return await database.getNameUUIDs(identifier, timestamp)
}

async function getPlayerUsernamesHistory({ identifier }) {
    return await database.getPlayerNameHistory(identifier)
}

async function getPrivileges({ uuid }) {
    const result = await database.getPlayerPrivileges(uuid)
    if (result.code != 200) {
        return result
    }
    for (const key in result.data) {
        if (!Object.hasOwn(result.data, key)) continue
        const value = result.data[key]
        result.data[key] = { enabled: !!value }
    }
    return result
}

async function getPreferences({ uuid }) {
    const result = await database.getPlayerPreferences(uuid)
    const preferences = {}
    if (result.code != 200) {
        return result
    }
    for (const key in result.data) {
        if (!Object.hasOwn(result.data, key)) continue
        const value = result.data[key]
        preferences[`${key}Preferences`] = {}
        preferences[`${key}Preferences`][`${key}On`] = !!value
    }
    result.data = preferences
    return result
}

async function getPlayerBanStatus(uuid) {
    const allBans = await database.getPlayerBans(uuid)
    if (allBans.code == 204 || allBans.bans && allBans.bans.length === 0) {
        return { isBanned: false, activeBan: null }
    }

    const now = Date.now()
    const potentialPermaBan = allBans.bans[0]
    if (potentialPermaBan.expires === null) {
        return {
            isBanned: true,
            activeBan: potentialPermaBan
        }
    }

    const lastBan = allBans.bans[allBans.bans.length - 1]
    if (lastBan.expires > now) {
        return {
            isBanned: true,
            activeBan: lastBan,
            timeLeft: lastBan.expires - now
        }
    }

    return { isBanned: false, activeBan: null }
}

function getPlayerSettingsSchema() {
    const { privileges, preferences } = database.getPlayerSettingsSchema()

    const privilegesSchema = privileges.reduce((acc, colName) => {
        acc[colName] = null
        return acc
    }, {})

    const preferencesSchema = preferences.reduce((acc, colName) => {
        acc[`${colName}Preferences`] = {}
        acc[`${colName}Preferences`][`${colName}On`] = null
        return acc
    }, {})

    return { 
        ...preferencesSchema, 
        privileges: privilegesSchema 
    }
}

async function updatePlayerSettings({ uuid, body }) {
    const rawSchema = await database.getPlayerSettingsSchema()
    
    const validPrivCols = Array.isArray(rawSchema.privileges) 
        ? rawSchema.privileges 
        : Object.keys(rawSchema.privileges)

    const validPrefCols = Array.isArray(rawSchema.preferences) 
        ? rawSchema.preferences 
        : Object.keys(rawSchema.preferences)

    const updates = {
        privileges: {},
        preferences: {}
    }
    
    validPrefCols.forEach(colName => {
        const wrapperKey = `${colName}Preferences`
        const valueKey = `${colName}On`
        const value = body[wrapperKey]?.[valueKey]

        if (typeof value === "boolean") {
            updates.preferences[colName] = value ? 1 : 0
        }
    })

    if (body.privileges) {
        validPrivCols.forEach(colName => {
            const enabled = body.privileges[colName]?.enabled

            if (typeof enabled === "boolean") {
                updates.privileges[colName] = enabled ? 1 : 0
            }
        })
    }

    const results = []

    if (Object.keys(updates.preferences).length > 0) {
        const res = await database.updatePlayerPreferences(uuid, updates.preferences)
        results.push({ type: "preferences", ...res })
    }
    if (Object.keys(updates.privileges).length > 0) {
        const res = await database.updatePlayerPrivileges(uuid, updates.privileges)
        results.push({ type: "privileges", ...res })
    }

    if (results.length === 0) {
        return { 
            code: 400, 
            message: "No valid settings detected. Check your JSON structure.",
            received: body 
        }
    }

    return { 
        code: 200, 
        message: "Settings updated successfully.", 
        details: results 
    }
}

async function blockUser({ blockerUuid, targetUuid }) {
    if (blockerUuid === targetUuid) {
        return { 
            code: 400, 
            message: "You cannot block yourself." 
        }
    }

    const result = await database.blockPlayer(blockerUuid, targetUuid)
    if (result.code !== 200) {
        if (result.error && result.error.includes("FOREIGN KEY constraint failed")) {
            return { code: 404, message: "Target player not found." }
        }
        return { code: 500, message: "Internal Server Error", error: result.error }
    }

    return { 
        code: 200, 
        message: result.changed ? "User successfully blocked." : "User was already blocked." 
    }
}

async function unblockUser({ blockerUuid, targetUuid }) {
    const result = await database.unblockPlayer(blockerUuid, targetUuid)
    if (result.code !== 200) {
        return { code: 500, message: "Internal Server Error", error: result.error }
    }

    return {
        code: 200, 
        message: result.changed ? "User successfully unblocked." : "User was not blocked." 
    }
}

async function getBlockedProfiles({ blockerUuid }) {
    const result = await database.getBlockedUuids(blockerUuid)
    if (result.code !== 200) {
        return { code: 500, message: "Internal Server Error", error: result.error }
    }
    return { code: 200, blockedProfiles: result.data.filter((uuid) => {
        return uuid.replace(/-/g, "")
    })}
}

async function getPlayerNameChangeStatus({ uuid }) {
    const userQuery = await database.getUser(uuid)
    if (userQuery.code != 200) {
        return userQuery
    }

    const changeStatus = await database.getPlayerNameChangeStatus(uuid)
    return changeStatus
}

async function getSkins({ uuid }) {
    const result = await database.getPlayerSkins(uuid)

    if (result.code !== 200) {
        return result
    }

    const formattedSkins = result.skins.map(skin => ({
        id: skin.id.toString(),
        state: skin.isSelected ? "ACTIVE" : "INACTIVE",
        url: skin.url,
        textureKey: skin.textureKey,
        variant: skin.variant
    }))

    return { code: 200, data: formattedSkins }
}

async function getCapes({ uuid }) {
    const result = await database.getPlayerCapes(uuid)

    if (result.code !== 200) {
        return result
    }

    const formattedCapes = result.capes.map(cape => ({
        id: cape.id.toString(),
        state: cape.isSelected ? "ACTIVE" : "INACTIVE",
        url: cape.url,
        alias: cape.alias || "Custom Cape"
    }))

    return { code: 200, data: formattedCapes }
}

async function changeUsername({ uuid, newUsername }) {
    const availability = await database.checkUsernameAvailability(newUsername)
    
    if (!availability.allowed) {
        return { code: 400, message: availability.message }
    }

    const userQuery = await database.getUser(newUsername)
    if (userQuery.code == 500) {
        return userQuery
    } else if (userQuery.code == 200) {
        return { code: 400, message: "Username taken" }
    }

    return await database.changeUsername(uuid, newUsername)
}

async function setSkin({ uuid, textureUuid, variant }) {
    const validVariants = ["CLASSIC", "SLIM"]
    const safeVariant = (variant && validVariants.includes(variant.toUpperCase())) 
        ? variant.toUpperCase() 
        : "CLASSIC"

    return await database.setSkin(uuid, textureUuid, safeVariant)
}

async function resetSkin({ uuid }) {
    return await database.resetSkin(uuid)
}

async function deleteSkin({ uuid, textureUuid }) {
    if (!textureUuid) {
        return { code: 400, message: "Missing textureUuid." }
    }
    return await database.deletePlayerSkin(uuid, textureUuid)
}

async function showCape({ uuid, textureUuid }) {
    if (!textureUuid) {
        return { code: 400, message: "Missing textureUuid." }
    }
    return await database.showCape(uuid, textureUuid)
}

async function hideCape({ uuid }) {
    return await database.hideCape(uuid)
}

async function addCape({ uuid, textureUuid }) {
    if (!textureUuid) {
        return { code: 400, message: "Missing textureUuid." }
    }
    return await database.addCapeToWardrobe(uuid, textureUuid)
}

async function processAndSetSkin(uuid, imageBuffer, variant) {
    try {
        const hash = crypto.createHash("sha256").update(imageBuffer).digest("hex")
        
        const filePath = path.join(TEXTURES_DIR, `${hash}.png`)
        const publicUrl = `/texture/${hash}.png`

        try {
            await fs.access(filePath)
        } catch (e) {
            await fs.writeFile(filePath, imageBuffer)
        }

        const registerResult = await database.registerTexture(hash, "SKIN", publicUrl)
        
        if (registerResult.code !== 200 && registerResult.code !== 201) {
            return registerResult
        }

        return await module.exports.setSkin(uuid, registerResult.textureUuid, variant)

    } catch (error) {
        return { code: 500, message: "Error processing skin file", error: error.toString() }
    }
}

async function uploadSkinFromUrl(uuid, url, variant) {
    try {
        if (!ssrfcheck.isSSRFSafeURL(url)) {
            return { code: 403, message: "Forbidden URL (Localhost/Private IP)" }
        }

        let currentUrl = url
        let response
        const MAX_REDIRECTS = 3

        for (let i = 0; i <= MAX_REDIRECTS; i++) {
            response = await fetch(currentUrl, { redirect: "manual" })
            if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get("location")
                if (!location) {
                    return { code: 400, message: "Invalid redirect (no location)." }
                }

                const nextUrl = new URL(location, currentUrl).toString()
                if (!utils.isSafeUrl(nextUrl)) {
                    return { code: 403, message: "Forbidden Redirect URL (Target is unsafe)" }
                }

                console.log(`[Security] Following safe redirect to: ${nextUrl}`)
                currentUrl = nextUrl
                continue
            }
            break
        }

        if (response.status >= 300 && response.status < 400) {
            return { code: 400, message: "Too many redirects." }
        }

        if (!response.ok) {
            return { code: 400, message: "Could not fetch skin." }
        }

        const contentLength = response.headers.get("content-length")
        if (contentLength && parseInt(contentLength) > 2 * 1024 * 1024) {
            return { code: 400, message: "File too large." }
        }

        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        if (buffer.length > 2 * 1024 * 1024) {
            return { code: 400, message: "File too large." }
        }

        const pngInfo = utils.getPngDimensions(buffer)
        if (!pngInfo) {
            return { code: 400, message: "Invalid file format. Only valid PNGs are allowed." }
        }
        if (pngInfo.width !== 64 || (pngInfo.height !== 64 && pngInfo.height !== 32)) {
            return { 
                code: 400, 
                message: `Invalid skin dimensions: ${pngInfo.width}x${pngInfo.height}. Required: 64x64 or 64x32.` 
            }
        }

        return await processAndSetSkin(uuid, buffer, variant)
    } catch (error) {
        return { code: 500, message: "Error processing skin.", error: error.toString() }
    }
}

async function uploadSkinFromFile(uuid, fileObject, variant) {
    if (!fileObject || !fileObject.buffer) {
        return { code: 400, message: "No file provided." }
    }
    
    const pngInfo = utils.getPngDimensions(fileObject.buffer)
    if (!pngInfo) {
        return { code: 400, message: "Invalid file format. Only valid PNGs are allowed." }
    }
    
    return await processAndSetSkin(uuid, fileObject.buffer, variant)
}

async function fetchOrGenerateCertificate(uuid) {
    const now = new Date()
    maintenanceService.cleanupCertificates().catch(err => {
        console.error("[Non-Critical] Certificate cleanup failed: ", err)
    })

    const cached = await database.getPlayerCertificate(uuid)

    if (cached.code === 200) {
        const expiresAtDate = new Date(cached.data.expiresAt)
        if (expiresAtDate > new Date(now.getTime() + 60000)) {
            return {
                code: 200,
                data: {
                    keyPair: {
                        privateKey: cached.data.privateKey,
                        publicKey: cached.data.publicKey
                    },
                    publicKeySignature: cached.data.publicKeySignatureV2,
                    publicKeySignatureV2: cached.data.publicKeySignatureV2,
                    expiresAt: cached.data.expiresAt,
                    refreshedAfter: cached.data.refreshedAfter
                }
            }
        }
    }
    
    const { privateKey, publicKey } = await crypto.generateKeyPair("rsa", {
        modulusLength: 4096,
        publicKeyEncoding: { type: "pkcs1", format: "pem" },
        privateKeyEncoding: { type: "pkcs1", format: "pem" }
    })

    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
    const refreshedAfter = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

    const serverPrivateKey = serverKeys.playerCertificateKeys.private

    const signer = crypto.createSign("SHA256")
    signer.update(uuid)
    signer.update(publicKey)
    signer.update(expiresAt)
    
    const signatureV2 = signer.sign(serverPrivateKey, "base64")

    const saveResult = await database.savePlayerCertificate(uuid, privateKey, publicKey, signatureV2, expiresAt, refreshedAfter)
    
    if (saveResult.code !== 200) {
        return { code: 500, message: "Database error while saving certificate" }
    }

    return {
        code: 200,
        data: {
            keyPair: {
                privateKey: privateKey,
                publicKey: publicKey
            },
            publicKeySignature: signatureV2,
            publicKeySignatureV2: signatureV2,
            expiresAt: expiresAt,
            refreshedAfter: refreshedAfter
        }
    }
}

module.exports = {
    getUser,
    getSkins,
    setSkin,
    addCape,
    getCapes,
    showCape,
    hideCape,
    resetSkin,
    blockUser,
    deleteSkin,
    unblockUser,
    getUsernameAt,
    getPrivileges,
    changeUsername,
    getPreferences,
    uploadSkinFromUrl,
    uploadSkinFromFile,
    getBlockedProfiles,
    getPlayerBanStatus,
    updatePlayerSettings,
    getPlayerSettingsSchema,
    getPlayerNameChangeStatus,
    getPlayerUsernamesHistory,
    fetchOrGenerateCertificate,
}