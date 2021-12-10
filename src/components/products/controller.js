const fsPromises = require("fs/promises")
const DAL = require("./DAL")
const {paths} = require("../../../config")
const {getRemainingString} = require("../../utils")
const productImgsPath = process.env.NODE_PATH + paths.products
const productImgsUri = getRemainingString(productImgsPath, paths.public).replace(/\\/g, "/")

//CLEAN: think about making validation file separately (atleast for postProduct)
//CLEAN: maybe we don't need to add fsPromises here, check if it's better to make a file handler separately
//CLEAN: postProduct: thumbnail is array in case of error so it can be deleted easily in catch... messy need to clean the implemenation

module.exports.postProduct = async (req, res) => {
	if(!req.files || !req.files.thumbnail || req.files.thumbnail.length === 0) return res.status(404).send(
		"Product thumbnail not found"
	)
	if(req.files.thumbnail.length > 1) req.files.thumbnail = [req.files.thumbnail[0]]
	if(!req.files.images) req.files.images = []
	try {
		req.files.thumbnail = await Promise.all(req.files.thumbnail.map(async img => {
			const storedImg = await img.moveTo(productImgsPath)
			return storedImg // properties: fullName, delete
		}))
		req.files.images = await Promise.all(req.files.images.map(async img => {
			const storedImg = await img.moveTo(productImgsPath)
			return storedImg
		}))
		await DAL.createProduct(
			req.body.productLineId,
			req.body.nameExtension,
			req.body.currentPrice,
			req.body.originalPrice || req.body.currentPrice,
			req.files.thumbnail.map(img => `${productImgsUri}/${img.fullName}`),
			req.files.images.map(img => `${productImgsUri}/${img.fullName}`),
			JSON.parse(req.body.colors),
			JSON.parse(req.body.sizes),
			JSON.parse(req.body.tags) || []
		)
		res.sendStatus(200)
	} catch (err) {
		await req.files.thumbnail[0].delete()
		for(const img of req.files.images) {
			await img.delete()
		}
		res.sendStatus(500)
	}
}


module.exports.getFullProducts = (req, res) => {
	DAL.getFullProducts()
	.then(products => res.status(200).send(products))
	.catch(() => res.sendStatus(500))
}


module.exports.getFullProduct = (req, res) => {
	DAL.getFullProducts(req.params.id)
	.then(products => res.status(200).send(products))
	.catch(() => res.sendStatus(500))
}


module.exports.deleteProduct = async (req, res) => {
	try {
		const [productFiles] = await DAL.get("products", {
			conditions: {column: "id", value: req.params.id},
			columns: ["thumbnail", "images"]
		})
		await DAL.deleteProduct(req.params.id)
		await fsPromises.unlink(
			(process.env.NODE_PATH + paths.public + productFiles.thumbnail).replace(/\//g,"\\")
		)
		productFiles.images = JSON.parse(productFiles.images)
		await Promise.all(productFiles.images.map(async img => {
			const path = (process.env.NODE_PATH + paths.public + img).replace(/\//g,"\\")
			await fsPromises.unlink(path)
		}))
		res.sendStatus(200)
	} catch(err) {
		res.sendStatus(500)
	}
}


// TODO 
module.exports.putProduct = (req, res) => {

}