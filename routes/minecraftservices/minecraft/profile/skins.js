const path = require("node:path")
const express = require("express")
const utils = require("../../../../modules/utils")
const userService = require("../../../../services/userService")
const authService = require("../../../../services/authService")
const multer = require("multer")
const router = express.Router()

const upload = multer({ 
    storage: multer.diskStorage({
        destination: path.join(__dirname, "data", "temps")
    }),
    limits: { fileSize: 2 * 1024 * 1024 }
})

router.post("/active", upload.single("file"), async (req, res) => {
    if (!req.headers.authorization) {
        return utils.handleAccountsAPIError(res, 401, req.originalUrl, "Unauthorized", "Bearer token required")
    }
    const bearer = req.headers.authorization.replace("Bearer", "").trim()
    const verificationResult = await authService.verifyAccessToken({ accessToken: bearer })
    if (verificationResult.code != 200) {
        return utils.handleAccountsAPIError(res, verificationResult.code, req.originalUrl, verificationResult.error, verificationResult.message)
    }

    const uuid = verificationResult.user.uuid
    const contentType = req.headers["content-type"] || ""
    let result
    
    if (req.file) {
        const variant = req.body.variant || "CLASSIC"
        result = await userService.uploadSkinFromFile(uuid, req.file, variant)
    } 
    else if (contentType.includes("application/json")) {
        const { variant, url } = req.body
        if (!url) {
            return utils.handleAccountsAPIError(res, 400, req.originalUrl, "Missing URL", "IllegalArgumentException")
        }
        result = await userService.uploadSkinFromUrl(uuid, url, variant || "CLASSIC")
    }  else {
        return utils.handleAccountsAPIError(res, 400, req.originalUrl, "Bad Request", "No file or URL provided")
    }

    if (result.code !== 200) {
        return utils.handleAccountsAPIError(res, result.code, req.originalUrl, result.error, result.message)
    }
    
    return res.status(200).json(result.data || {})
})

router.delete("/active", async (req, res) => {
    if (!req.headers.authorization) {
        return utils.handleAccountsAPIError(res, 401, req.originalUrl, "", "")
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