const express = require("express")
const router = express.Router()
const utils = require("../../../../modules/utils")
const sessionsService = require("../../../../services/sessionsService")

router.post("", async (req, res) => {
    const { accessToken, selectedProfile, serverId } = req.body
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    const result = await sessionsService.joinServer({ accessToken, selectedProfile, serverId, ip })
    if (result.code === 204) {
        return res.status(204).end()
    }

    const statusCode = result.code === 200 ? 200 : (result.code || 403)
    return utils.handleAccountsAPIError(res, statusCode, req.originalUrl, "Forbidden", "Invalid session data")
})


module.exports = router