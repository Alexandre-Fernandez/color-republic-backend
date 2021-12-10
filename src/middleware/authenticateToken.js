const token = require("../../lib/token")

// errors
const aTk403 = "Access token not found"
const aTk404 = "Access token not found"


const authenticateToken = (isAdminRoute = false) => {
	return async function(req, res, next) {
		let accessToken = req.headers?.authorization.split(" ")[1]
		if(!accessToken) return res.status(404).send(aTk404)
		accessToken = await token.verifyToken(token.accessToken, accessToken)
		if(!accessToken.isValid) return res.status(403).send(aTk403)
		if(isAdminRoute && accessToken.payload.role !== "admin") res.status(403).send(aTk403)
		const {iat, exp, ...user} = accessToken.payload
		req.user = user
		next()
	}
}


module.exports = authenticateToken