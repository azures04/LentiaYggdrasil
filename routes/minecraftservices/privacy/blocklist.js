const express = require("express")
const utils = require("../../../modules/utils")
const userService = require("../../../services/userService")
const authService = require("../../../services/authService")
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

    const blockedUsers = await userService.getBlockedProfiles({ blockerUuid: verificationResult.user.uuid })
    if (blockedUsers.code != 200) {
        return utils.handleAccountsAPIError(res, blockedUsers.code, req.originalUrl, blockedUsers.error, blockedUsers.message)
    }

    res.status(200).json({ blockedProfiles: blockedUsers.blockedProfiles })
})

router.put("/:uuid", async (req, res) => {
    if (!req.headers.authorization) {
        return utils.handleAccountsAPIError(res, 401, req.originalUrl, "", "")
    }
    const bearer = req.headers.authorization.replace("Bearer", "").trim()
    const verificationResult = await authService.verifyAccessToken({ accessToken: bearer })
    if (verificationResult.code != 200) {
        return utils.handleAccountsAPIError(res, verificationResult.code, req.originalUrl, verificationResult.error, verificationResult.message)
    }

    const blockResult = await userService.blockUser({ blockerUuid: verificationResult.user.uuid, targetUuid: utils.addDashesToUUID(req.params.uuid) })
    if (blockResult.code != 200) {
        return utils.handleAccountsAPIError(res, blockResult.code, req.originalUrl, blockResult.error, blockResult.message)
    }
    
    const blockedUsers = await userService.getBlockedProfiles({ blockerUuid: verificationResult.user.uuid })
    if (blockedUsers.code != 200) {
        return utils.handleAccountsAPIError(res, blockedUsers.code, req.originalUrl, blockedUsers.error, blockedUsers.message)
    }

    res.status(200).json({ blockedProfiles: blockedUsers.blockedProfiles })
})

router.delete("/:uuid", async (req, res) => {
    if (!req.headers.authorization) {
        return utils.handleAccountsAPIError(res, 401, req.originalUrl, "", "")
    }
    const bearer = req.headers.authorization.replace("Bearer", "").trim()
    const verificationResult = await authService.verifyAccessToken({ accessToken: bearer })
    if (verificationResult.code != 200) {
        return utils.handleAccountsAPIError(res, verificationResult.code, req.originalUrl, verificationResult.error, verificationResult.message)
    }

    const unblockResult = await userService.unblockUser({ blockerUuid: verificationResult.user.uuid, targetUuid: utils.addDashesToUUID(req.params.uuid) })
    if (unblockResult.code != 200) {
        return utils.handleAccountsAPIError(res, unblockResult.code, req.originalUrl, unblockResult.error, unblockResult.message)
    }
    
    const blockedUsers = await userService.getBlockedProfiles({ blockerUuid: verificationResult.user.uuid })
    if (blockedUsers.code != 200) {
        return utils.handleAccountsAPIError(res, blockedUsers.code, req.originalUrl, blockedUsers.error, blockedUsers.message)
    }

    res.status(200).json({ blockedProfiles: blockedUsers.blockedProfiles })
})

module.exports = router