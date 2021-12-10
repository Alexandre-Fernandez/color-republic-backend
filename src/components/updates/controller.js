const DAL = require("./DAL")


module.exports.getUpdates = (req, res) => {
	DAL.getUpdates(req.query.after)
	.then(updates => res.status(200).send(updates))
	.catch(() => res.sendStatus(500))
}
