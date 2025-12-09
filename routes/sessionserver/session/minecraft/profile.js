const express = require("express")
const router = express.Router()
const utils = require("../../../../modules/utils")
const sessionsService = require("../../../../services/sessionsService")

router.get("/:uuid", async (req, res) => {
    const { uuid } = req.params
    const { unsigned } = req.query

    const isUnsigned = unsigned === "true"

    const result = await sessionsService.getProfile({ 
        uuid: uuid, 
        unsigned: isUnsigned 
    })

    if (result.code === 200) {
        return res.status(200).json(result.data)
    }

    if (result.code === 204) {
        return res.status(204).end()
    }

    return utils.handleAccountsAPIError(req.originalUrl, 400, "", "Not a valid UUID")
})

module.exports = router