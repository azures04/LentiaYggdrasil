const express = require("express")
const router = express.Router()
const certsManager = require("../../modules/certsManager")

router.get("", (req, res) => {
    const keys = certsManager.getKeys()
    const publicKeys = {}
    for (const key in keys) {
        publicKeys[key] = [
            {
                publicKey: certsManager.extractKeyFromPem(keys[key].public)
            }
        ]
    }
    res.status(200).json(publicKeys)
})

module.exports = router