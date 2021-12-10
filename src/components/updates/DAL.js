const database = require("../../database")
const {getFullProducts} = require("../products/DAL")


module.exports.getUpdates = async (after) => {
	const pool = await database.pool
	const connection = await pool.getConnection()
	try {
		const deleted = await connection.query(
			"SELECT product_id FROM deleted_products WHERE deletion_date>?", [after]
		)
		deleted.forEach((result, i) => deleted[i] = result.product_id)
		const productIds = await connection.query(
			"SELECT id FROM products WHERE last_update>?", [after]
		)
		productIds.forEach((result, i) => productIds[i] = result.id)
		const updated = productIds.length > 0 
		? await getFullProducts(productIds, connection) 
		: []
		connection.release()
		return {updated, deleted}
	} catch (err) {
		connection.release()
		return Promise.reject(err)
	}
}