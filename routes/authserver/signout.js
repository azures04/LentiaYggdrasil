const express = require("express")
const router = express.Router()
const authService = require("../../services/authService")
const utils = require("../../modules/utils")
const logger = require("../../modules/logger")

router.post("", async (req, res) => {
    const { username, password, clientToken, requestUser } = req.body
    if (!req.body || !username || !password ) {
        return utils.handleAuthError(res, 422, "Unsupported Media Type", "Missing element(s) in request body", "The server is refusing to service the request because the entity of the request is in a format not supported by the requested resource for the requested method")
    }
    
    const serviceResult = await authService.authenticate({ identifier: username, clientToken: clientToken || "", password, requireUser: requestUser || false })
    if (serviceResult.code != 200) {
        return utils.handleAuthError(res, 500, serviceResult.message, "", serviceResult.error)
    }

    const accessTokensRevokationProcess = await authService.signout({ uuid: serviceResult.response.selectedProfile.id })
    if (accessTokensRevokationProcess.code === 200) {
        return res.sendStatus(204)
    }

    return utils.handleAuthError(res, 500, accessTokensRevokationProcess.message, "", accessTokensRevokationProcess.error)

})

module.exports = router