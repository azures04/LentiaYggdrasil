const jwt = require("jsonwebtoken")
const utils = require("../modules/utils")
const bcrypt = require("bcryptjs")
const crypto = require("node:crypto")
const database = require("../modules/database")
const certsManager = require("../modules/certsManager")
const keys = certsManager.getKeys()
const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

async function registerUser({ username, password, email, registrationCountry, preferredLanguage, clientIp }) {
    const usernameCheck = await database.getUser(username)
    if (usernameCheck.code === 200) {
        return { code: 409, message: "Username taken." }
    }
    if (usernameCheck.code === 500) {
        return usernameCheck
    }

    const emailCheck = await database.getUser(email)
    if (emailCheck.code === 200) {
        return { code: 409, message: "E-Mail taken." }
    }
    if (emailCheck.code === 500) {
        return emailCheck
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
    const $clientToken = uuidRegex.test(clientToken) == true ? clientToken : crypto.randomUUID()
    const accessToken = jwt.sign({
        uuid: userResult.user.uuid,
        username: userResult.user.username,
        clientToken: $clientToken,
    }, keys.authenticationKeys.private, { subject: userResult.user.uuid, issuer: "LentiaYggdrasil", expiresIn: "1d", algorithm: "RS256" })
    const clientSessionProcess = await database.insertClientSession(accessToken, $clientToken, userResult.user.uuid )
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
    const $clientToken = uuidRegex.test(clientToken) == true ? clientToken : crypto.randomUUID()
    const accessToken = jwt.sign({
        uuid: userResult.user.uuid,
        username: userResult.user.username,
        clientToken: $clientToken,
    }, keys.authenticationKeys.private, { subject: userResult.user.uuid, issuer: "LentiaYggdrasil", expiresIn: "1d", algorithm: "RS256" })
    const clientSessionProcess = await database.insertClientSession(accessToken, $clientToken, userResult.user.uuid )
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

async function verifyAccessToken({ accessToken }) {
    try {
        if (!accessToken) {
            return { code: 400, message: "Token is missing." }
        }

        const decoded = jwt.verify(accessToken, keys.authenticationKeys.public, {
            algorithms: ["RS256"],
            issuer: "LentiaYggdrasil"
        })

        const clientToken = decoded.clientToken
        if (!clientToken) {
            return { code: 403, message: "Token format invalid (missing clientToken)." }
        }

        const sessionCheck = await database.validateClientSession(accessToken, clientToken);
        if (sessionCheck.code !== 200 && sessionCheck.code !== 204) {
            return { code: 401, message: "Session has been revoked or invalidated." }
        }

        return { 
            code: 200,
            user: {
                uuid: decoded.sub,
                username: decoded.username
            },
            session: {
                clientToken
            }
        }

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return { code: 401, message: "Token has expired." }
        }
        return { code: 500, message: "Internal Verification Error", error: error.toString() }
    }
}

module.exports = {
    signout,
    validate,
    invalidate,
    registerUser,
    authenticate,
    refreshToken,
    verifyAccessToken,
}