const express = require("express")
const router = express.Router()
const path = require("node:path")

router.use(express.static(path.join(__dirname, "..", "..", "data", "textures")))

module.exports = router