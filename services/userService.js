const jwt = require("jsonwebtoken")
const utils = require("../modules/utils")
const bcrypt = require("bcryptjs")
const crypto = require("node:crypto")
const database = require("../modules/database")
const certsManager = require("../modules/certsManager")
const keys = certsManager.getKeys()
const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

async function registerUser({ username, password, email, registrationCountry, preferredLanguage, clientIp }) {
    const userCheck = await database.getUser(username)
    if (userCheck.code === 200) {
        return { code: 409, message: "Username taken." }
    }
    if (userCheck.code === 500) {
        return userCheck
    }

    const userRegistration = await database.register(email || "", username, password)
    if (userRegistration.code !== 200) {
        return userRegistration
    }

    const { uuid } = userRegistration
    const resolvedCountry = registrationCountry || await utils.getRegistrationCountryFromIp(clientIp)
    const countryProp = await database.addPropertyToPlayer("registrationCountry", resolvedCountry || "UNKNOWN", uuid)
    if (countryProp.code !== 200) {
        return countryProp
    }

    
    const languageProp = await database.addPropertyToPlayer("userPreferredLanguage", preferredLanguage || "fr-FR", uuid)
    if (languageProp.code !== 200) {
        return languageProp
    }

    return { code: 200, message: "User created successfully", uuid }
}

async function authenticate({ identifier, password, clientToken, requireUser }) {
    const userResult = await database.getUser(identifier, true)
    if (userResult.code != 200) {
        return userResult
    }
    const passwordValidationProcess = await bcrypt.compare(password, userResult.user.password)
    if (!passwordValidationProcess) {
        return { code: 403, error: "ForbiddenOperationException", message: "Invalid credentials. Invalid username or password." }
    }
    delete userResult.user.password
    const accessToken = jwt.sign({ username: userResult.user.username }, keys.jwt.private, { subject: userResult.user.uuid, issuer: "LentiaYggdrasil", expiresIn: "1d", algorithm: "RS256" })
    const clientSessionProcess = await database.insertClientSession(accessToken, uuidRegex.test(clientToken) == true ? clientToken : crypto.randomUUID(), userResult.user.uuid )
    if (clientSessionProcess.code != 204) {
        return clientSessionProcess
    }
    const userObject = {
        clientToken: clientSessionProcess.clientToken,
        accessToken: clientSessionProcess.accessToken,
        availableProfiles: [
            {
                name: userResult.user.username,
                id: userResult.user.uuid,
            }
        ],
        selectedProfile: {
            name: userResult.user.username,
            id: userResult.user.uuid,
        }
    }
    if (requireUser) {
        const propertiesRequest = await database.getPlayerProperties(userResult.user.uuid)
        if (propertiesRequest.code != 200) {
            return propertiesRequest
        }
        userObject.user = {
            username: userResult.user.username,
            properties: propertiesRequest.properties
        }
    }
    return {
        code: 200,
        response: userObject
    }
}

async function refreshToken({ previousAccessToken, clientToken, requireUser }) {
    const identifier = jwt.decode(previousAccessToken).sub
    const userResult = await database.getUser(identifier, true)
    if (userResult.code != 200) {
        return userResult
    }
    await database.invalidateClientSession(previousAccessToken, clientToken)
    delete userResult.user.password
    const accessToken = jwt.sign({ username: userResult.user.username }, keys.jwt.private, { subject: userResult.user.uuid, issuer: "LentiaYggdrasil", expiresIn: "1d", algorithm: "RS256" })
    const clientSessionProcess = await database.insertClientSession(accessToken, uuidRegex.test(clientToken) == true ? clientToken : crypto.randomUUID(), userResult.user.uuid )
    if (clientSessionProcess.code != 204) {
        return clientSessionProcess
    }
    const userObject = {
        clientToken: clientSessionProcess.clientToken,
        accessToken: clientSessionProcess.accessToken,
        selectedProfile: {
            name: userResult.user.username,
            id: userResult.user.uuid,
        }
    }
    if (requireUser) {
        const propertiesRequest = await database.getPlayerProperties(userResult.user.uuid)
        if (propertiesRequest.code != 200) {
            return propertiesRequest
        }
        userObject.user = {
            username: userResult.user.username,
            properties: propertiesRequest.properties
        }
    }
    return {
        code: 200,
        response: userObject
    }
}

async function validate({ accessToken, clientToken }) {
    const clientSession = await database.validateClientSession(accessToken, clientToken)
    if (clientSession.code != 200) {
        return clientSession
    }
    return { code: 204 }
}

async function invalidate({ accessToken, clientToken }) {
    const clientSession = await database.invalidateClientSession(accessToken, clientToken)
    if (clientSession.code != 200) {
        return clientSession
    }
    return { code: 204 }
}

async function signout({ uuid }) {
    const revokationOperation = await database.revokeAccessTokens(uuid)
    return revokationOperation
}

async function registerLegacySession({ uuid, sessionId }) {
    const clientSession = await database.insertLegacyClientSessions(sessionId, uuid)
    if (clientSession.code != 200) {
        return clientSession
    }
    return { code: 200 }
}

async function validateLegacySession({ name, sessionId }) {
    const userInformation = await database.getUser(name)
    if (userInformation.code != 200) {
        return userInformation
    }
    const clientSession = await database.validateLegacyClientSession(sessionId, userInformation.user.uuid)
    if (clientSession.code != 200) {
        return clientSession
    }
    return { code: 200 }
}

async function getUser({ identifier }) {
    return await database.getUser(identifier, false)
}

module.exports = {
    getUser,
    signout,
    validate,
    invalidate,
    registerUser,
    authenticate,
    refreshToken,
    registerLegacySession,
    validateLegacySession,
}