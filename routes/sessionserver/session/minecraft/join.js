const express = require("express")
const router = express.Router()
const utils = require("../../../../modules/utils")
const authService = require("../../../../services/authService")
const sessionsService = require("../../../../services/sessionsService")

router.post("", async (req, res) => {
    const { accessToken, selectedProfile, serverId } = req.body
    const verificationResult = await authService.verifyAccessToken({ accessToken })
    if (verificationResult.code != 200) {
        return utils.handleAccountsAPIError(res, verificationResult.code, req.originalUrl, verificationResult.error, verificationResult.message)
    }

    const ip = req.headers["x-forwarded-for'"] || req.socket.remoteAddress
    const result = await sessionsService.joinServer({ clientToken: verificationResult.session.clientToken, accessToken, selectedProfile: utils.addDashesToUUID(selectedProfile), serverId, ip })
    if (result.code === 204) {
        return res.status(204).end()
    }

    const statusCode = result.code === 200 ? 200 : (result.code || 403)
    return utils.handleAccountsAPIError(res, statusCode, req.originalUrl, "Forbidden", "Invalid session data")
})


module.exports = router