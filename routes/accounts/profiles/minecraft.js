const express = require("express")
const utils = require("../../../modules/utils")
const userService = require("../../../services/userService")
const router = express.Router()

router.post("/", async (req, res) => {
    if (!req.body || !Array.isArray(req.body) || req.body.length > 10) {
        return utils.handleYggdrasilError(res, 400, "Bad Request", "Malformed request", "Invalid body")
    }
    const players = []
    for (const username of req.body) {
        const userInformation = await userService.getUser({ identifier: username })
        if (userInformation.code == 200) {
            players.push({
                id: userInformation.user.uuid.replace(/-/g, ""),
                name: userInformation.user.name,
            })
        } else {
            return utils.handleYggdrasilError(req, 400, "BadRequestException", "", "")
        }
    }
})

module.exports = router