const express = require("express")
const router = express.Router()

router.get("/giftcode", (req, res) => {
    res.status(404).json({
        path: "/productvoucher/giftcode",
        errorType: "NOT_FOUND",
        error: "NOT_FOUND",
        errorMessage: "The server has not found anything matching the request URI",
        developerMessage: "The server has not found anything matching the request URI"
    })
})

module.exports = router