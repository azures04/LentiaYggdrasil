const express = require("express")
const utils = require("../../../modules/utils")
const userService = require("../../../services/userService")
const authService = require("../../../services/authService")
const router = express.Router()

router.post("", async (req, res) => {
    if (!req.headers.authorization) {
        return utils.handleAccountsAPIError(res, 401, req.originalUrl, "", "")
    }
    if (!req.body) {
        return utils.handleAccountsAPIError(res, 415, req.originalUrl, "", "Missing body.")
    }
    const bearer = req.headers.authorization.replace("Bearer", "").trim()
    const verificationResult = await authService.verifyAccessToken({ accessToken: bearer })
    if (verificationResult.code != 200) {
        return utils.handleAccountsAPIError(res, verificationResult.code, req.originalUrl, verificationResult.error, verificationResult.message)
    }

    const certResult = await userService.fetchOrGenerateCertificate(verificationResult.user.uuid)
    if (certResult.code !== 200) {
        return utils.handleAccountsAPIError(res, certResult.code || 500, req.originalUrl, "Internal Server Error", certResult.message)
    }

    return res.status(200).json(certResult.data)
})

module.exports = router