const express = require("express")
const router = express.Router()
const userService = require("../../services/userService")
const utils = require("../../modules/utils")
const logger = require("../../modules/logger")

router.post("", async (req, res) => {
    const { accessToken, clientToken, requestUser } = req.body
    if (!req.body || !accessToken || !clientToken ) {
        return utils.handleYggdrasilError(res, 422, "Unsupported Media Type", "Missing element(s) in request body", "The server is refusing to service the request because the entity of the request is in a format not supported by the requested resource for the requested method")
    }
    
    const serviceResult = await userService.validate({ accessToken, clientToken })
    if (serviceResult.code !== 204) {
        return serviceResult
    }

    const tokenInvalidationOperation = await userService.invalidate({ accessToken, clientToken })
    if (tokenInvalidationOperation.code != 204) {
        return tokenInvalidationOperation
    }

    const refreshTokenOperation = await userService.refreshToken({ clientToken, previousAccessToken: accessToken, requireUser: requestUser })
    if (refreshTokenOperation.code == 200) {
        return res.status(200).json(refreshTokenOperation.response)
    }

    return utils.handleYggdrasilError(res, 500, refreshTokenOperation.message, "", refreshTokenOperation.error)
})

module.exports = router