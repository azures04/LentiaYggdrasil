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

    const nameChangeStatusResult = await userService.getPlayerNameChangeStatus({ uuid: verificationResult.user.uuid })
    if (nameChangeStatusResult.code == 500) {
        return utils.handleAccountsAPIError(res, nameChangeStatusResult.code, req.originalUrl, nameChangeStatusResult.error, nameChangeStatusResult.message)
    }
    res.status(nameChangeStatusResult.code).json({
        ...nameChangeStatusResult.data
    })
})

module.exports = router