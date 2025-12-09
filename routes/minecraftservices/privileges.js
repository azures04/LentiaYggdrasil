const express = require("express")
const utils = require("../../modules/utils")
const userService = require("../../services/userService")
const authService = require("../../services/authService")
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

    const preferencesResult = await userService.getPreferences({ uuid: verificationResult.user.uuid })
    if (preferencesResult.code != 200) {
        return utils.handleAccountsAPIError(res, preferencesResult.code, req.originalUrl, preferencesResult.error, preferencesResult.message)
    }

    const privilegesResult = await userService.getPrivileges({ uuid: verificationResult.user.uuid })
    if (privilegesResult.code != 200) {
        return utils.handleAccountsAPIError(res, privilegesResult.code, req.originalUrl, privilegesResult.error, privilegesResult.message)
    }

    const banScopes = await userService.getPlayerBanStatus(verificationResult.user.uuid)

    return res.status(200).json({
        privileges: privilegesResult.data,
        ...preferencesResult.data,
        banStatus: {
            bannedScopes: banScopes.isBanned !== true ? {} : { MULTIPLAYER: banScopes.activeBan }
        }
    })
})

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

    const serviceResult = await userService.updatePlayerSettings({ uuid: verificationResult.user.uuid, body: req.body })
    if (serviceResult.code != 200) {
        return utils.handleAccountsAPIError(res, serviceResult.code, req.originalUrl, serviceResult.error, serviceResult.message)
    }

    const preferencesResult = await userService.getPreferences({ uuid: verificationResult.user.uuid })
    if (preferencesResult.code != 200) {
        return utils.handleAccountsAPIError(res, preferencesResult.code, req.originalUrl, preferencesResult.error, preferencesResult.message)
    }

    const privilegesResult = await userService.getPrivileges({ uuid: verificationResult.user.uuid })
    if (privilegesResult.code != 200) {
        return utils.handleAccountsAPIError(res, privilegesResult.code, req.originalUrl, privilegesResult.error, privilegesResult.message)
    }

    const banScopes = await userService.getPlayerBanStatus(verificationResult.user.uuid)

    return res.status(200).json({
        privileges: privilegesResult.data,
        ...preferencesResult.data,
        banStatus: {
            bannedScopes: banScopes.isBanned !== true ? {} : { MULTIPLAYER: banScopes.activeBan }
        }
    })
})

module.exports = router