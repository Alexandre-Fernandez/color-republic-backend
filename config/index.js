const config = {
	...require("./general.json"),
	...require(`./${process.env.NODE_ENV}.json`)
}
module.exports = config