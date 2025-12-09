const express = require("express")
const router = express.Router()
const sessionsService = require("../../services/sessionsService")

router.get("", async (req, res) => {
    const serviceResult = await sessionsService.getBlockedServers()
    if (serviceResult.code != 200) {
        res.status(serviceResult.code).send("")
    }
    const finalList = []
    for (const server of serviceResult.blockedServers) {
        finalList.push(server.sha1)
    }
    res.status(200).send(finalList.join("\r\n"))
})

module.exports = router