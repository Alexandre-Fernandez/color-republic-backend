const database = require("../../database")
const token = require("../../../lib/token")
const {compare} = require("bcrypt")

// errors
const rTk403 = "Refresh token invalid"
const rTk404 = "Refresh token not found"
const lgn401 = "Email or password invalid"


module.exports.putTokens = async (req, res) => {
	if(!req.body.grant_type) return res.status(404).send({message: rTk404})
	const refreshToken = await token.verifyToken(
		token.refreshToken, 
		req.body.grant_type
	)
	try {
		if(!refreshToken.isValid) {
			if(refreshToken.payload) await token.revokeToken(refreshToken.payload.id)
			return res.status(403).send({error: rTk403})
		}
		await token.revokeToken(refreshToken.payload.id)
		return res.status(200).send({
			accessTokenInfo: token.createTokenInfo(
				token.accessToken,
				token.accessToken.createPayload(
					refreshToken.payload.id, 
					refreshToken.payload.role,
					refreshToken.payload.email
				)
			),
			refreshTokenInfo: token.createTokenInfo(
				token.refreshToken,
				token.refreshToken.createPayload(
					refreshToken.payload.id, 
					refreshToken.payload.role, 
					refreshToken.payload.email,
					refreshToken.payload.tokenVersion + 1
				),
				refreshToken.payload.exp
			),
		})
	} catch(err) {
		return res.sendStatus(500)
	}
}


module.exports.getTokens = async (req, res) => {
	let credentials = decodeURI(req.headers?.authorization.split(" ")[1])
	if(!credentials) return res.sendStatus(404) //todo add error message 
	const [requestEmail, requestPassword] = credentials.split(" ")

	try {
		const [{id, email, password, role, token_version} = {}] = await database.get(
			"users", {
				columns: ["id", "email", "password", "role", "token_version"],
				conditions: {column: "email", value: requestEmail}
			}
		)
		if(!email) return res.status(401).send({message: lgn401})
		const isPasswordValid = await compare(requestPassword, password)
		if(!isPasswordValid) return res.status(401).send({message: lgn401})
		return res.status(200).send({
			accessTokenInfo: token.createTokenInfo(
				token.accessToken,
				token.accessToken.createPayload(id, role, email)
			), 
			refreshTokenInfo: token.createTokenInfo(
				token.refreshToken,
				token.refreshToken.createPayload(id, role, email, token_version)
			)
		})
	} catch(err) {
		console.log(err)
		return res.sendStatus(500)
	}
}