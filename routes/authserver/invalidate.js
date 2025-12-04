const express = require("express")
const router = express.Router()
const userService = require("../../services/userService")
const utils = require("../../modules/utils")
const logger = require("../../modules/logger")

router.post("", async (req, res) => {
    const { accessToken, clientToken } = req.body
    if (!req.body || !accessToken || !clientToken ) {
        return utils.handleYggdrasilError(res, 422, "Unsupported Media Type", "Missing element(s) in request body", "The server is refusing to service the request because the entity of the request is in a format not supported by the requested resource for the requested method")
    }
    
    const serviceResult = await userService.invalidate({ accessToken, clientToken })
    if (serviceResult.code === 204) {
        return res.sendStatus(204)
    }

    return utils.handleYggdrasilError(res, 500, serviceResult.message, "", serviceResult.error)
})

module.exports = router