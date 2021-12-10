const express = require("express")
const cors = require("cors")
const app = express()
const {paths} = require("./config")
const publicDir = process.env.NODE_PATH + paths.public
const tempDir = process.env.NODE_PATH + paths.temp

app.use(cors())
app.use(express.static(publicDir))
app.use(express.urlencoded({extended: false}))
app.use(express.json())
app.use("/productlines", require("./src/components/productLines/router"))
app.use("/products", require("./src/components/products/router"))
app.use("/updates", require("./src/components/updates/router"))
app.use("/users", require("./src/components/users/router"))
app.use("/tokens", require("./src/components/tokens/router"))

app.listen(process.env.PORT, () => {
	console.log(`listening on port ${process.env.PORT}`)
	const {emptyDir} = require("./src/utils")
	emptyDir(tempDir).catch(err => console.log(err))
})