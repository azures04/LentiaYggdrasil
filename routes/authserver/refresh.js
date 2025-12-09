const express = require("express")
const router = express.Router()
const authService = require("../../services/authService")
const utils = require("../../modules/utils")
const logger = require("../../modules/logger")

router.post("", async (req, res) => {
    const { accessToken, clientToken, requestUser } = req.body
    if (!req.body || !accessToken || !clientToken ) {
        return utils.handleAuthError(res, 415, "Unsupported Media Type", "Missing element(s) in request body", "The server is refusing to service the request because the entity of the request is in a format not supported by the requested resource for the requested method")
    }
    
    const tokenValidationOperation = await authService.validate({ accessToken, clientToken })
    if (tokenValidationOperation.code !== 204) {
        return utils.handleAuthError(res, 403, "ForbiddenOperationException", tokenValidationOperation.message, "Invalid token.")
    }

    const tokenInvalidationOperation = await authService.invalidate({ accessToken, clientToken })
    if (tokenInvalidationOperation.code != 204) {
        return utils.handleAuthError(res, 403, "ForbiddenOperationException", tokenInvalidationOperation.message, "Invalid token.")
    }

    const refreshTokenOperation = await authService.refreshToken({ clientToken, previousAccessToken: accessToken, requireUser: requestUser })
    if (refreshTokenOperation.code == 200) {
        return res.status(200).json(refreshTokenOperation.response)
    }

    return utils.handleAuthError(res, 500, refreshTokenOperation.message, "", refreshTokenOperation.error)
})

module.exports = router