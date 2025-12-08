const express = require("express")
const utils = require("../../../../modules/utils")
const config = require("../../../../config.json")
const userService = require("../../../../services/userService")
const router = express.Router()

router.get("/:uuid/names", async (req, res) => {
    if (!config.players.publicUUIDToNameHistory) {
        return utils.handleAccountsAPIError(res, 404, req.originalUrl, "NOT_FOUND", "Not found")
    }
    const serviceResult = await userService.getPlayerUsernamesHistory({ identifier: utils.addDashesToUUID(req.params.uuid) })
    if (serviceResult.code == 404) {
        return res.status(serviceResult.code).json([])
    }
    if (serviceResult.code == 500) {
        return utils.handleAccountsAPIError(req, req.originalUrl, serviceResult.error, serviceResult.message)
    }
    return res.status(200).json(serviceResult.history.map(entry => {
        const cleanEntry = {
            name: entry.username
        }
        if (entry.changedAt) {
            cleanEntry.changedToAt = new Date(entry.changedAt + 'Z').getTime();
        }
        return cleanEntry
    }).reverse())
})

module.exports = router