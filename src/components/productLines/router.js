const express = require('express')
const router = express.Router()
const controller = require("./controller")
const formData = require("express-form-data");
const authenticateToken = require("../../middleware/authenticateToken")

router.post("", 
	authenticateToken(true),
	formData.parse(),
	controller.postProductLine
)
router.delete("/:id", authenticateToken(true), controller.deleteProductLine)

module.exports = router