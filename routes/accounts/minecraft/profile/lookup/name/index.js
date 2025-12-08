const express = require("express")
const utils = require("../../../../../../modules/utils")
const config = require("../../../../../../config.json")
const userService = require("../../../../../../services/userService")
const router = express.Router()

router.get("/:name", async (req, res) => {
    let serviceResult
    const AtTimestamp = req.query.at
    if (config.players.publicUUIDToNameHistory && AtTimestamp) {
        if (utils.isValidTimestamp(AtTimestamp)) {
            serviceResult = await userService.getUsernameAt({ identifier: req.params.name, date: parseInt(AtTimestamp) })
        } else {
            return utils.handleAccountsAPIError(res, 400, null, "IllegalArgumentException", "Invalid timestamp.")
        }
    } else {
        serviceResult = await userService.getUser({ identifier: req.params.name })
    }
    if (serviceResult.code == 500) {
        return utils.handleAccountsAPIError(res, serviceResult.code, req.originalUrl, serviceResult.error, serviceResult.message)
    }
    if (serviceResult.code == 404) {
        return utils.handleAccountsAPIError(res, serviceResult.code, req.originalUrl, serviceResult.error, "Couldn't find any profile with that name")
    }
    const playerData = serviceResult.profileAt || serviceResult.user
    return res.status(200).json({
        id: playerData.uuid.replace(/-/g, ""),
        name: playerData.username
    })
})

module.exports = router