const DAL = require("./DAL")


module.exports.postProductLine = (req, res) => {
	DAL.createProductLine(
		req.body.category, 
		req.body.type, 
		req.body.name, 
		req.body.description, 
		JSON.parse(req.body.tags)
	)
	.then(() => res.sendStatus(200))
	.catch(() => res.sendStatus(500))
}


module.exports.deleteProductLine = (req, res) => {
	DAL.deleteProductLine(req.params.id)
	.then(() => res.sendStatus(200))
	.catch(() => res.sendStatus(500))
}
