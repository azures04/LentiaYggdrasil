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

    const tokenUuid = verificationResult.user.uuid
    const requestedProfile = utils.addDashesToUUID(req.body.selectedProfile)

    if (tokenUuid !== requestedProfile) {
        return utils.handleAccountsAPIError(res, 403, req.originalUrl, "Forbidden", "You cannot join with a profile that is not yours.")
    }

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress
    const result = await sessionsService.joinServer({ clientToken: verificationResult.session.clientToken, accessToken, selectedProfile: requestedProfile, serverId, ip })
    if (result.code === 204) {
        return res.status(204).end()
    }

    const statusCode = result.code === 200 ? 200 : (result.code || 403)
    return utils.handleAccountsAPIError(res, statusCode, req.originalUrl, "Forbidden", "Invalid session data")
})


module.exports = router