const path = require("node:path")
const utils = require("../modules/utils")
const express = require("express")
const router = express.Router()
const Logger = require("../modules/logger")
const userService = require("../services/authService")
const logger = new Logger(path.join(__dirname, ".."))

router.post("/", async (req, res) => {
    const { username, password, email, registrationCountry, preferredLanguage } = req.body
    
    if (!req.body || !username || !password || !email) {
        return utils.handleError(res, 415, { message: "Username and password are required.", error: "" }, req.originalUrl)
    }

    const clientIp = req.headers["x-forwarded-for"] || req.connection.remoteAddress

    const serviceResult = await userService.registerUser({
        username, 
        password, 
        email, 
        registrationCountry, 
        preferredLanguage,
        clientIp
    })
    if (serviceResult.code === 200) {
        return res.status(200).json({ code: 200, message: "User registered" })
    }

    return utils.handleError(res, serviceResult.code, serviceResult, req.originalUrl)
})

module.exports = router