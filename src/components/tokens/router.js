const express = require('express')
const router = express.Router()
const controller = require("./controller")

router.get("/", controller.getTokens)
router.put("/", controller.putTokens)

module.exports = router