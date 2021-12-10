const database = require("../../database")


Object.assign(module.exports, {get: database.get})
Object.assign(module.exports, {create: database.create})
Object.assign(module.exports, {query: database.query})


module.exports.getUserAdresses = id => {
	return database.query(
		`SELECT id, full_name as fullName, address, additional_information as additionalInformation, city, zip, state, country, phone FROM users_addresses 
		INNER JOIN addresses ON address_id=addresses.id 
		WHERE user_id=?`,
		[id]
	)
}


module.exports.createUserAddress = async (
	id, fullName, address, additionalInformation, city, zip, state, country, phone
) => {
	const pool = await database.pool
	const connection = await pool.getConnection()
	try {
		await connection.beginTransaction()
		const {insertId: addressId} = await connection.query(
			"INSERT INTO addresses (full_name,address,additional_information,city,zip,state,country,phone) VALUES (?,?,?,?,?,?,?,?)", 
			[fullName, address, additionalInformation, city, zip, state, country, phone]
		)
		await connection.query(
			"INSERT INTO users_addresses (user_id,address_id) VALUES (?,?)", 
			[id, addressId]
		)
		await connection.commit()
		connection.release()
		return addressId
	} catch(err) {
		await connection.rollback()
		connection.release()
		return Promise.reject(err)
	}
}


module.exports.deleteAddress = async id => {
	const pool = await database.pool
	const connection = await pool.getConnection()
	try {
		await connection.beginTransaction()
		await connection.query(
			"DELETE FROM addresses WHERE id=?", [id]
		)
		await connection.query(
			"DELETE FROM users_addresses WHERE address_id=?", [id]
		)
		await connection.commit()
		connection.release()
	} catch(err) {
		await connection.rollback()
		connection.release()
		return Promise.reject(err)
	}
}



module.exports.createUserOrder = async (id, cart) => {
	const pool = await database.pool
	const connection = await pool.getConnection()
	try {
		await connection.beginTransaction()
		const {insertId: orderId} = await connection.query(
			"INSERT INTO orders (user_id) VALUES (?)", [id]
		)
		// cart = { productId: {sizeName: quantity}, ... }
		await Promise.all(Object.entries(cart).map(async ([productId, sizes]) => {
			await Promise.all(Object.entries(sizes).map(async ([sizeName, quantity]) => {
				const [{id: sizeId}] = await connection.query(
					"SELECT id FROM sizes WHERE name=?", [sizeName]
				)
				await connection.query(
					"INSERT INTO orders_products (order_id,product_id,size_id,quantity) VALUES (?,?,?,?)", 
					[orderId, productId, sizeId, quantity]
				)
			}))
		}))
		await connection.commit()
		connection.release()
	} catch(err) {
		await connection.rollback()
		connection.release()
		return Promise.reject(err)
	}
}


module.exports.getUserOrders = async id => {
	const pool = await database.pool
	const connection = await pool.getConnection()
	try {
		let orders = await connection.query(
			"SELECT id, date, status FROM orders WHERE user_id=?", [id]
		)		
		orders = await Promise.all(orders.map(async orderInfo => {
			const order = {
				info: orderInfo,
			}
			order.shipment = await connection.query(
				`SELECT product_id as productId, sizes.name as sizeName, quantity FROM orders_products
				INNER JOIN sizes on size_id=sizes.id
				WHERE order_id=${orderInfo.id}`
			)
			// order = { info: {id, date, status}, shipment: [{productId, sizeName, quantity}, ...] }
			return order 
		}))
		connection.release()
		return orders
	} catch(err) {
		connection.release()
		return Promise.reject(err)
	}
}