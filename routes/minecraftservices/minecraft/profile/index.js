const express = require("express")
const utils = require("../../../../modules/utils")
const userService = require("../../../../services/userService")
const authService = require("../../../../services/authService")
const router = express.Router()

router.get("", async (req, res) => {
    if (!req.headers.authorization) {
        return utils.handleAccountsAPIError(res, 401, req.originalUrl, "", "")
    }
    const bearer = req.headers.authorization.replace("Bearer", "").trim()
    const verificationResult = await authService.verifyAccessToken({ accessToken: bearer })
    if (verificationResult.code != 200) {
        return utils.handleAccountsAPIError(res, verificationResult.code, req.originalUrl, verificationResult.error, verificationResult.message)
    }

    const skinsResult = await userService.getSkins({ uuid: verificationResult.user.uuid })
    if (skinsResult.code != 200) {
        return utils.handleAccountsAPIError(res, skinsResult.code, req.originalUrl, skinsResult.error, skinsResult.message)
    }

    const capesResult = await userService.getCapes({ uuid: verificationResult.user.uuid })
    if (capesResult.code != 200) {
        return utils.handleAccountsAPIError(res, capesResult.code, req.originalUrl, capesResult.error, capesResult.message)
    }

    return res.status(200).json({
        id: verificationResult.user.uuid.replace(/-/g, ""),
        name: verificationResult.user.username,
        skins: skinsResult.data,
        capes: capesResult.data
    })
})

module.exports = router