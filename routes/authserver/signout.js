const express = require("express")
const router = express.Router()
const userService = require("../../services/userService")
const utils = require("../../modules/utils")
const logger = require("../../modules/logger")

router.post("", async (req, res) => {
    const { username, password, clientToken, requestUser } = req.body
    if (!req.body || !username || !password ) {
        return utils.handleYggdrasilError(res, 422, "Unsupported Media Type", "Missing element(s) in request body", "The server is refusing to service the request because the entity of the request is in a format not supported by the requested resource for the requested method")
    }
    
    const serviceResult = await userService.authenticate({ identifier: username, clientToken: clientToken || "", password, requireUser: requestUser || false })
    if (serviceResult.code != 200) {
        return utils.handleYggdrasilError(res, 500, serviceResult.message, "", serviceResult.error)
    }

    const accessTokensRevokationProcess = await userService.signout({ uuid: serviceResult.response.selectedProfile.id })
    if (accessTokensRevokationProcess.code === 200) {
        return res.sendStatus(204)
    }

    return utils.handleYggdrasilError(res, 500, accessTokensRevokationProcess.message, "", accessTokensRevokationProcess.error)

})

module.exports = router