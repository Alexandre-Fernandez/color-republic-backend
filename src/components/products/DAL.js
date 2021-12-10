const database = require("../../database")


Object.assign(module.exports, {get: database.get})


module.exports.getFullProducts = async (ids = [], connection = null) => {
	if(ids && ids.constructor !== Array) ids = [ids]
	let connectionCreated = false
	if(!connection) {
		const pool = await database.pool
		connection = await pool.getConnection()
		connectionCreated = true
	}
	try {
		const sqlWhere = ids.length > 0 ? `WHERE products.id=?${" OR products.id=?".repeat(ids.length - 1)}` : ""
		let fullProducts = await connection.query(
			`SELECT products.id,product_line_id AS productLineId,product_lines.category,product_lines.type,product_lines.name,name_extension AS nameExtension,product_lines.description,current_price AS currentPrice,original_price AS originalPrice,thumbnail,images,products.last_update AS lastUpdate
			FROM products
			INNER JOIN product_lines ON product_line_id=product_lines.id
			${sqlWhere}`, ids
		) 
		fullProducts = await Promise.all(fullProducts.map(async product => {
			product.images = JSON.parse(product.images)
			const colors = await connection.query(
				`SELECT r,g,b FROM products_colors INNER JOIN colors ON color_id=colors.id WHERE product_id=${product.id}`
			)
			product.colors = colors
			const sizes = await connection.query(
				`SELECT name FROM products_sizes INNER JOIN sizes ON size_id=sizes.id WHERE product_id=${product.id}`
			)
			product.sizes = sizes.map(size => size.name)
			const tags = await connection.query(
				`SELECT tags.name FROM products_tags
				RIGHT JOIN products ON products_tags.product_id=products.id
				INNER JOIN product_lines_tags ON products.product_line_id= product_lines_tags.product_line_id
				INNER JOIN tags ON products_tags.tag_id=tags.id OR product_lines_tags.tag_id=tags.id
				WHERE products.id = ${product.id}
				GROUP BY products.id, tags.name`
			)
			product.tags = tags.map(tag => tag.name)
			return product
		}))
		if(connectionCreated) connection.release()
		return fullProducts
	} catch (err) {
		console.error(err)
		if(connectionCreated) connection.release()
		return Promise.reject(err)
	}
}


module.exports.createProduct = async (
	productLineId, nameExtension, currentPrice, originalPrice, thumbnail, images, colors, sizes, tags
) => {
	const pool = await database.pool
	const connection = await pool.getConnection()
	try {
		await connection.beginTransaction()
		images = JSON.stringify(images)
		const {insertId: productId} = await connection.query(
			"INSERT INTO products (product_line_id,name_extension,current_price,original_price,thumbnail,images) VALUES (?,?,?,?,?,?)", 
			[productLineId, nameExtension, currentPrice, originalPrice, thumbnail, images]
		)
		const colorIds = await Promise.all(colors.map(color => database.createUnique(
			"colors", [
				{column: "r", value: color.r}, 
				{column: "g", value: color.g}, 
				{column: "b", value: color.b}
			], {connection}
		)))
		await Promise.all(colorIds.map(colorId => connection.query(
			`INSERT INTO products_colors (product_id, color_id) VALUES (${productId}, ${colorId})`
		)))
		const sizeIds = await Promise.all(sizes.map(size => database.createUnique(
			"sizes", {column: "name", value: size}, {connection}
		)))
		await Promise.all(sizeIds.map(sizeId => connection.query(
			`INSERT INTO products_sizes (product_id, size_id) VALUES (${productId}, ${sizeId})`
		)))
		const tagIds = await Promise.all(tags.map(tag => database.createUnique(
			"tags", {column: "name", value: tag}, {connection}
		)))
		await Promise.all(tagIds.map(tagId => connection.query(
			`INSERT INTO products_tags (product_id, tag_id) VALUES (${productId}, ${tagId})`
		)))
		await connection.commit()
		connection.release()
		return productId
	}
	catch (err) {
		await connection.rollback()
		connection.release()
		return Promise.reject(err)
	}
}


module.exports.deleteProduct = async id => {
	const pool = await database.pool
	const connection = await pool.getConnection()
	try {
		await connection.beginTransaction()
		await connection.query("DELETE FROM products WHERE id=?", [id])
		const productColorIds = await connection.query(
			"SELECT color_id FROM products_colors WHERE product_id=?", [id]
		)
		await connection.query("DELETE FROM products_colors WHERE product_id=?", [id])
		await Promise.all(productColorIds.map(({color_id}) => database.deleteUnusedOutside(
			"colors", color_id, "products_colors", "color_id", {connection}
		)))
		const productSizeIds = await connection.query(
			"SELECT size_id FROM products_sizes WHERE product_id=?", [id]
		)
		await connection.query("DELETE FROM products_sizes WHERE product_id=?", [id])
		await Promise.all(productSizeIds.map(({size_id}) => database.deleteUnusedOutside(
			"sizes", size_id, "products_sizes", "size_id", {connection}
		)))
		const productTagIds = await connection.query(
			"SELECT tag_id FROM products_tags WHERE product_id=?", [id]
		)
		await connection.query("DELETE FROM products_tags WHERE product_id=?", [id])
		await Promise.all(productTagIds.map(({tag_id}) => database.deleteUnusedOutside(
			"tags", tag_id, ["products_tags", "product_lines_tags"], "tag_id", {connection}
		)))
		await connection.query(
			`INSERT INTO deleted_products (product_id) VALUES (${id}) 
			ON DUPLICATE KEY UPDATE deletion_date=NOW()`
		)
		await connection.commit()
		connection.release()
		return true
	} catch (err) {
		await connection.rollback()
		connection.release()
		return Promise.reject(err)
	}
}


// TODO 
module.exports.updateProduct = async (
	id, {currentPrice, originalPrice, imgSrcs, colors, sizes, tags} = {}
) => {

}
