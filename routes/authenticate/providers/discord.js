const express = require("express")
const router = express.Router()
const config = require("../../../config.json")
const DiscordOauth2 = require("discord-oauth2")
const logger = require("../../../modules/logger")

const oauth2 = new DiscordOauth2({
    clientId: config.authProviders.discord.clientId,
    clientSecret: config.authProviders.discord.clientSecret,
    redirectUri: config.authProviders.discord.redirectUri,
})

router.get("", async (req, res) => {
    const { code } = req.query
    if (code) {
        console.log(code)
        try {
            const token = await oauth2.tokenRequest({ code, grantType: "authorization_code", scope: "identify" })
            console.log(token)
            const user = await oauth2.getUser(token.access_token)
            if (user) {
                console.log(user)
            }
        } catch (error) {
            res.status(500).json({ error: new String(error) })
            console.error(error)  
        }
    }
})

module.exports = router