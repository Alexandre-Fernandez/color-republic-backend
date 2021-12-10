const DAL = require("./DAL")
const {isEmailValid, isPasswordValid} = require("./validation")
const {hash, compare} = require("bcrypt")
const token = require("../../../lib/token")
const {security} = require("../../../config")

// errors
const pwd400 = "Password invalid"
const eml400a = "Email invalid"
const eml400b = "Email is already being used"


module.exports.postUser = async (req, res) => {
	try {
		if(!isEmailValid(req.body.email)) return res.status(400).send({message: eml400a})
		if(!isPasswordValid(req.body.password)) return res.status(400).send({message: pwd400})
		const sameEmails = await DAL.get("users", {
			columns: "id",
			conditions: {column: "email", value: req.body.email}
		})
		if(sameEmails.length > 0) return res.status(400).send({message: eml400b})
		const hashedPassword = await hash(req.body.password, security.saltRounds)
		const {insertId} = await DAL.create("users", [
			{ column: "email", value: req.body.email},
			{ column: "password", value: hashedPassword}
		])
		return res.status(200).send({
			accessTokenInfo: token.createTokenInfo(
				token.accessToken,
				token.accessToken.createPayload(insertId, "user", req.body.email)
			), 
			refreshTokenInfo: token.createTokenInfo(
				token.refreshToken,
				token.refreshToken.createPayload(insertId, "user", req.body.email, 0)
			)
		})
	} catch(err) {
		return res.sendStatus(500)
	}
}


module.exports.putUserPassword = async (req, res) => {
	try {
		if(!isPasswordValid(req.body.newPassword)) return res.status(400).send({message: pwd400})
		const [{password: currentPassword}] = await DAL.query("SELECT password FROM users WHERE id=?", [req.user.id])
		if(!currentPassword) return res.sendStatus(500)
		const isPasswordCorrect = await compare(req.body.password, currentPassword)
		if(!isPasswordCorrect) return res.status(400).send({message: pwd400})
		const hashedNewPassword = await hash(req.body.newPassword, security.saltRounds)
		await DAL.query("UPDATE users SET password=? WHERE id=?", [hashedNewPassword, req.user.id])
		return res.sendStatus(200)
	} catch(err) {
		return res.sendStatus(500)
	}
}


module.exports.putUserEmail = async (req, res) => {
	 try {
		if(!isEmailValid(req.body.newEmail)) return res.status(400).send({message: eml400a})
		const [{password: currentPassword}] = await DAL.query("SELECT password FROM users WHERE id=?", [req.user.id])
		if(!currentPassword) return res.sendStatus(500)
		const isPasswordCorrect = await compare(req.body.password, currentPassword)
		if(!isPasswordCorrect) return res.status(400).send({message: pwd400})
		await DAL.query("UPDATE users SET email=? WHERE id=?", [req.body.newEmail, req.user.id])
		return res.sendStatus(200)
	} catch(err) {
		return res.sendStatus(500)
	}
}





module.exports.getUserAddresses = (req, res) => {
	DAL.getUserAdresses(req.user.id)
	.then(userAdresses => res.status(200).send(userAdresses))
	.catch(() => res.sendStatus(500))
}


module.exports.postUserAddress = (req, res) => {
	//fix make sure mandatory fields are present (fullname, etc)
	DAL.createUserAddress(
		req.user.id,
		req.body.fullName,
		req.body.address,
		req.body.additionalInformation || "",
		req.body.city,
		req.body.zip,
		req.body.state,
		req.body.country,
		req.body.phone || ""
	)
	.then(() => res.sendStatus(200))
	.catch(() => res.sendStatus(500))
}


module.exports.deleteUserAddress = (req, res) => {
	DAL.deleteAddress(req.user.id) //fix this need to take user id and address id
	.then(() => res.sendStatus(200))
	.catch(() => res.sendStatus(500))
}



module.exports.getUserOrders = (req, res) => {
	DAL.getUserOrders(req.user.id)
	.then(orders => res.status(200).send(orders))
	.catch(() => res.sendStatus(500))
}

module.exports.postUserOrders = (req, res) => {
	console.log(req.body.cart)
	DAL.createUserOrder(req.user.id, req.body.cart)
	.then(() => res.sendStatus(200))
	.catch(() => res.sendStatus(500))
}