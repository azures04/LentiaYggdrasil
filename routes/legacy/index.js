const path = require("node:path")
const express = require("express")
const router = express.Router()
const config = require("../../config.json")
const Logger = require("../../modules/logger")
const userService = require("../../services/userService")
const logger = new Logger(path.join(__dirname, "..", ".."))

router.all("/", async (req, res) => {
    const user = req.query.user || req.body.user
    const password = req.query.password || req.body.password
    const version = req.query.version || req.body.version
    if (!user || !password || !version) {
        return res.status(400).send("Bad response")
    }

    if (parseInt(version) < 12) {
        return res.send("Old version")
    }

    const serviceResult = await userService.authenticateUser({ 
        identifier: user, 
        clientToken: "",
        password: password, 
        requireUser: false 
    })
    if (serviceResult.code !== 200) {
        return res.status(400).send("Bad login")
    }

    const username = serviceResult.response.selectedProfile.name
    const sessionId = serviceResult.response.clientToken
    const uid = serviceResult.response.selectedProfile.id

    const legacySession = await userService.registerLegacySession({ uid, sessionId })
    if (legacySession.code != 200) {
        return res.status(500).send("Internal Server Error")
    }

    const responseString = `${config.legacy.versionTimestamp}:deprecated:${username}:${sessionId}:${uid}`
    return res.send(responseString)
})

router.all("/session", async (req, res) => {
    const name = req.query.name || req.body.name
    const sessionId = req.query.session || req.body.session
    if (!name || !sessionId) {
        return res.send("Bad response")
    }
    const serviceResult = await userService.validateLegacySession({ name, sessionId })
    return res.status(serviceResult.code)
})

module.exports = router