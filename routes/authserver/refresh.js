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
    
    const refreshTokenOperation = await authService.refreshToken({ 
        clientToken, 
        previousAccessToken: accessToken, 
        requireUser: requestUser 
    })

    if (refreshTokenOperation.code == 200) {
        return res.status(200).json(refreshTokenOperation.response)
    }

    return utils.handleAuthError(res, refreshTokenOperation.code === 403 ? 403 : 500,  refreshTokenOperation.message,  "", refreshTokenOperation.error)
})
module.exports = router