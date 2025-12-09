const express = require("express")
const router = express.Router()
const sessionsService = require("../../../../services/sessionsService")

router.get("", async (req, res) => {
    const { username, serverId, ip } = req.query
    const result = await sessionsService.hasJoinedServer({ username, serverId, ip })
    if (result.code === 200) {
        return res.status(200).json(result.data)
    }

    return res.status(204).end()
})


module.exports = router