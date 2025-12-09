const express = require("express")
const utils = require("../../../../modules/utils")
const userService = require("../../../../services/userService")
const authService = require("../../../../services/authService")
const multer = require("multer")
const router = express.Router()

const upload = multer({ 
    storage: multer.memoryStorage(), 
    limits: {
        fileSize: 2 * 1024 * 1024
    }
})

router.post("/active", async (req, res) => {
    if (!req.headers.authorization) {
        return utils.handleAccountsAPIError(res, 401, req.originalUrl, "", "")
    }
    const bearer = req.headers.authorization.replace("Bearer", "").trim()
    const verificationResult = await authService.verifyAccessToken({ accessToken: bearer })
    if (verificationResult.code != 200) {
        return utils.handleAccountsAPIError(res, verificationResult.code, req.originalUrl, verificationResult.error, verificationResult.message)
    }

    const uuid = verificationResult.user.uuid
    const contentType = req.headers["content-type"] || ""

    if (contentType.includes('application/json')) {
        const { variant, url } = req.body
        if (!url) {
            return utils.handleAccountsAPIError(res, 400, req.originalUrl, "Missing URL", "IllegalArgumentException")
        }

        const result = await userService.uploadSkinFromUrl(uuid, url, variant)
        if (result.code !== 200) {
            return utils.handleAccountsAPIError(res, result.code, req.originalUrl, result.error, result.message)
        }
        
        return res.status(200).json({})
    } else if (contentType.includes('multipart/form-data')) {
        handleUpload(req, res, async (err) => {
            if (err) {
                return utils.handleAccountsAPIError(res, 400, req.originalUrl, "Upload Error", err.message)
            }

            const variant = req.body.variant
            const file = req.file
            const result = await userService.uploadSkinFromFile(uuid, file, variant)
            if (result.code !== 200) {
                return utils.handleAccountsAPIError(res, result.code, req.originalUrl, result.error, result.message)
            }

            return res.status(200).json({})
        })
    } else {
        return utils.handleAccountsAPIError(res, 400, req.originalUrl, "Invalid Content-Type", "Expected application/json or multipart/form-data")
    }
})

router.delete("/active", async (req, res) => {
    if (!req.headers.authorization) {
        return utils.handleAccountsAPIError(res, 401, req.originalUrl, "", "")
    }
    const { capeId } = req.body
    if (!req.body || !capeId) {
        return utils.handleAccountsAPIError(res, 400, req.originalUrl, "Missing body request", "")
    }
    const bearer = req.headers.authorization.replace("Bearer", "").trim()
    const verificationResult = await authService.verifyAccessToken({ accessToken: bearer })
    if (verificationResult.code != 200) {
        return utils.handleAccountsAPIError(res, verificationResult.code, req.originalUrl, verificationResult.error, verificationResult.message)
    }
    const skinResetResult = await userService.resetSkin({ uuid: verificationResult.user.uuid })
    if (skinResetResult.code != 200) {
        return utils.handleAccountsAPIError(res, 400, req.originalUrl, skinResetResult.error, skinResetResult.message)
    }
    return res.sendStatus(200)
})

module.exports = router