const express = require("express")
const utils = require("../../../../../../modules/utils")
const userService = require("../../../../../../services/userService")
const router = express.Router()

router.post("/", async (req, res) => {
    if (!req.body || !Array.isArray(req.body) || req.body.length > 10) {
        return utils.handleAuthError(res, 400, "Bad Request", "Malformed request", "Invalid body")
    }
    const players = []
    for (const username of req.body) {
        const userQuery = await userService.getUser({ identifier: username })
        if (userQuery.code == 200) {
            players.push({
                id: userQuery.user.uuid.replace(/-/g, ""),
                name: userQuery.user.name,
            })
        }
    }
    return res.status(200).json(players)
})

module.exports = router