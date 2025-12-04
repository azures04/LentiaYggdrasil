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
    if (serviceResult.code === 200) {
        return res.status(200).json(serviceResult.response)
    }

    return utils.handleYggdrasilError(res, 500, serviceResult.message, "", serviceResult.error)
})

module.exports = router