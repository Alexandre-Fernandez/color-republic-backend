const express = require('express')
const router = express.Router()
const controller = require("./controller")
const {paths, files} = require("../../../config")
const handleFiles = require("../../middleware/handleFiles")
const formData = require("express-form-data");
const authenticateToken = require("../../middleware/authenticateToken")

const tempDir = process.env.NODE_PATH + paths.temp

router.post("", 
	authenticateToken(true), 
	formData.parse({uploadDir: tempDir}), 
	handleFiles(files.allowedExtensions.image), 
	controller.postProduct
)
router.put("/:id", 
	authenticateToken(true),
	formData.parse({uploadDir: tempDir}), 
	handleFiles(files.allowedExtensions.image), 
	controller.putProduct
) 
router.delete("/:id", authenticateToken(true), controller.deleteProduct)
router.get("", controller.getFullProducts)
router.get("/:id", controller.getFullProduct)

module.exports = router