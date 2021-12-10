const database = require("../../database")


module.exports.createProductLine = async (category, type, name, description, tags) => {
	const pool = await database.pool
	const connection = await pool.getConnection()
	try {
		await connection.beginTransaction()
		const {insertId: productLineId} = await connection.query(
			"INSERT INTO product_lines (category,type,name,description) VALUES (?,?,?,?)", 
			[category, type, name, description]
		)
		const tagIds = await Promise.all(tags.map(tag => database.createUnique(
			"tags", {column: "name", value: tag}, {connection}
		)))
		await Promise.all(tagIds.map(tagId => connection.query(
			`INSERT INTO product_lines_tags (product_line_id, tag_id) VALUES (${productLineId}, ${tagId})`
		)))
		await connection.commit()
		connection.release()
		return productLineId
	} catch(err) {
		await connection.rollback()
		connection.release()
		return Promise.reject(err)
	}
}


module.exports.deleteProductLine = async id => {
	const pool = await database.pool
	const connection = await pool.getConnection()
	try {
		await connection.beginTransaction()
		await connection.query("DELETE FROM product_lines WHERE id=?", [id])
		const productLineTagIds = await connection.query(
			"SELECT tag_id FROM product_lines_tags WHERE product_line_id=?", [id]
		)
		await connection.query("DELETE FROM product_lines_tags WHERE product_line_id=?", [id])
		await Promise.all(productLineTagIds.map(({tag_id}) => database.deleteUnusedOutside(
			"tags", tag_id, ["products_tags", "product_lines_tags"], "tag_id", {connection}
		)))
		const productIds = await connection.query("SELECT id FROM products WHERE product_line_id=?", [id])
		await Promise.all(productIds.map(async ({id}) => {
			await connection.query(`DELETE FROM products WHERE id=${id}`)
			return connection.query(
				`INSERT INTO deleted_products (product_id) VALUES (${id}) 
				ON DUPLICATE KEY UPDATE deletion_date=NOW()`
			)
		}))
		await connection.commit()
		connection.release()
		return true
	} catch (err) {
		await connection.rollback()
		connection.release()
		return Promise.reject(err)
	}
}
