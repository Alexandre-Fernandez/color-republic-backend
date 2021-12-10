const express = require('express')
const router = express.Router()
const controller = require("./controller")
const authenticateToken = require("../../middleware/authenticateToken")

router.post("/", controller.postUser)

router.get("/addresses", authenticateToken(), controller.getUserAddresses)
router.post("/addresses", authenticateToken(), controller.postUserAddress)
router.delete("/addresses", authenticateToken(), controller.deleteUserAddress)

router.put("/password", authenticateToken(), controller.putUserPassword)
router.put("/email", authenticateToken(), controller.putUserEmail)

router.get("/orders", authenticateToken(), controller.getUserOrders)
router.post("/orders", authenticateToken(), controller.postUserOrders)


module.exports = router