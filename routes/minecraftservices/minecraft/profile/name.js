const express = require("express")
const utils = require("../../../../modules/utils")
const database = require("../../../../modules/database")
const userService = require("../../../../services/userService")
const authService = require("../../../../services/authService")
const router = express.Router()

router.get("/:name/available", async (req, res) => {
    if (!req.headers.authorization) {
        return utils.handleAccountsAPIError(res, 401, req.originalUrl, "", "")
    }
    const bearer = req.headers.authorization.replace("Bearer", "").trim()
    const verificationResult = await authService.verifyAccessToken({ accessToken: bearer })
    if (verificationResult.code != 200) {
        return utils.handleAccountsAPIError(res, verificationResult.code, req.originalUrl, verificationResult.error, verificationResult.message)
    }
    const usernameRulesCheck = database.checkUsernameAvailability(req.params.name)
    if (!usernameRulesCheck.allowed) {
        res.status(usernameRulesCheck.code).json({
            status: "NOT_ALLOWED"
        })
    }
    
    const userCheck = await userService.getUser({ identifier: req.params.name })
    if (userCheck.code == 500) {
        return utils.handleAccountsAPIError(res, userCheck.code, req.originalUrl, userCheck.error, userCheck.message)
    }
    res.status(usernameRulesCheck.code).json({
        status: userCheck.code == 200 ? "DUPLICATE" : "AVAILABLE"
    })
})

router.put("/:name", async (req, res) => {
    if (!req.headers.authorization) {
        return utils.handleAccountsAPIError(res, 401, req.originalUrl, "", "")
    }
    const bearer = req.headers.authorization.replace("Bearer", "").trim()
    const verificationResult = await authService.verifyAccessToken({ accessToken: bearer })
    if (verificationResult.code != 200) {
        return utils.handleAccountsAPIError(res, verificationResult.code, req.originalUrl, verificationResult.error, verificationResult.message)
    }

    const usernameChangeResult = await userService.changeUsername({ newUsername: req.params.name, uuid: verificationResult.user.uuid })
    if (usernameChangeResult.code == 400) {
        let status = "", code = 400
        if (usernameChangeResult.message.startsWith("Invalid format")) {
            status = "NOT_ALLOWED"
            code = 400
        }
        if (usernameChangeResult.message.startsWith("This username")) {
            status = "NOT_ALLOWED"
            code = 403
        }
        if (usernameChangeResult.message.startsWith("Username taken")) {
            status = "DUPLICATE"
            code = 403
        }
        return res.status(code).json({
            path: "/minecraft/profile/name/<name>",
            errorType: "FORBIDDEN",
            error: "FORBIDDEN",
            details: {
                status
            },
            errorMessage: "",
            developerMessage: ""
        })
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
        name: req.params.name,
        skins: skinsResult.data,
        capes: capesResult.data
    })
})

module.exports = router