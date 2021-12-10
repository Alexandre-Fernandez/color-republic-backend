const database = require("../src/database")
const {security} = require("../config")
const jwt = require("jsonwebtoken")


module.exports.accessToken = Object.freeze({
	...security.accessToken,
	createPayload: (id, role, email) => ({id, email, role})
})


module.exports.refreshToken = Object.freeze({
	...security.refreshToken,
	createPayload: (id, role, email, tokenVersion) => ({id, email, role, tokenVersion})
})


module.exports.createToken = (type, payload, expirationInMs = null) => {
	if(!expirationInMs) expirationInMs = type.lifetime
	return jwt.sign(payload, type.secret, {expiresIn: `${expirationInMs}ms`})
}


module.exports.createTokenInfo = (type, payload, exp = null) => {
	let expiresIn = type.lifetime
	if(exp) expiresIn = parseInt(exp) * 1000 - Date.now()
	if(type === this.refreshToken) return {
		token: this.createToken(type, payload, expiresIn),
		expiration: Date.now() + expiresIn,
		email: payload.email,
		role: payload.role
	}
	return {
		token: this.createToken(type, payload, expiresIn),
		expiration: Date.now() + expiresIn 
	}
}


module.exports.verifyToken = async (type, token) => {
	try {
		const payload = jwt.verify(token, type.secret, {ignoreExpiration: true})
		if(Date.now() > payload.exp * 1000) {
			return {payload, isValid: false}
		}
		if(payload.tokenVersion != null && payload.id) {
			const [{token_version} = {}] = await database.query(
				"SELECT token_version FROM users WHERE id=?", [payload.id]
			)
			if(payload.tokenVersion !== token_version) return {payload, isValid: false}
		}
		return {payload, isValid: true}
	} catch(err) {
		return {payload: null, isValid: false}
	}
}


module.exports.revokeToken = userId => {
	return database.query(
		"UPDATE users SET token_version=token_version+1 WHERE id=?", [userId]
	)
}