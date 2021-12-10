const { database: config } = require("../../config")
const { createPool } = require("promise-mysql")


module.exports.pool = createPool({
	host: config.host,
	user: config.user,
	password: config.password,
	database: config.database
})
.then(pool => {
	pool.query("SELECT 1")
	.then(() => console.log(`connected to the "${config.database}" database as ${config.user}`))
	.catch(err => {throw `unable to connect to the "${config.database}" database as ${config.user} (${err.message})`})
	return pool
})


module.exports.query = async (sqlQuery, escapedValues = [], {connection} = {}) => {
	if(!connection) {
		const pool = await this.pool
		return pool.query(sqlQuery, escapedValues)
	}
	return connection.query(sqlQuery, escapedValues)
}


/* Exports below are mostly used to create automatic SQL queries */

module.exports.primaryKey = config.primaryKey || "id"

module.exports.create = (table, pairs, {connection} = {}) => {
	if(pairs.constructor !== Array) pairs = [pairs]
	return this.query(
		`INSERT INTO ?? (${"??,".repeat(pairs.length - 1)}??) VALUES (${"?,".repeat(pairs.length - 1)}?)`, 
		[table, ...getPairValues(pairs)], {connection}
	)
}


module.exports.createUnique = async (table, pairs, {conditions, connection} = {}) => {
	let connectionCreated = false
	if(!connection) {
		const pool = await this.pool
		connection = await pool.getConnection()
		connectionCreated = true
	}
	const where = conditions ? createWhere(conditions) : createWhere(pairs)
	const existingRow = await connection.query(
		`SELECT ${this.primaryKey} FROM ??` + where.escaped, [table, ...where.values]
	)
	if(existingRow.length === 0) {
		const {insertId} = await this.create(table, pairs, {connection})
		if(connectionCreated) connection.release()
		return insertId
	}
	if(connectionCreated) connection.release()
	return existingRow[0][this.primaryKey]
}


module.exports.get = (table, {columns, joins, conditions, sorts, connection} = {}) => {
	let query = "SELECT "
	if(typeof columns === "string") columns = [columns]
	if(!columns || columns.length === 0) { query += "* FROM ??"; columns = [] }
	else query += `${"??,".repeat(columns.length - 1)}?? FROM ??`
	const where = createWhere(conditions)
	const innerJoins = createInnerJoins(joins)
	const orderBy = createOrderBy(sorts)
	query += innerJoins.escaped + where.escaped + orderBy.escaped
	return this.query(
		query, 
		[...columns, table, ...innerJoins.values, ...where.values, ...orderBy.values], 
		{connection}
	)
}


module.exports.update = (table, pairs, {conditions, connection} = {}) => {
	if(!conditions) return Promise.reject('set conditions to "UPDATE_ALL" to update all rows')
	if(conditions === "UPDATE_ALL") conditions = null
	if(pairs.constructor !== Array) pairs = [pairs]
	const where = createWhere(conditions)
	return this.query(
		`UPDATE ?? SET ${"??=?,".repeat(pairs.length - 1)}??=?` + where.escaped, 
		[table, ...getPairValues(pairs, false), ...where.values], {connection}
	)
}


module.exports.delete = (table, {conditions, connection} = {}) => {
	if(!conditions) return Promise.reject('set conditions to "DELETE_ALL" to delete all rows')
	if(conditions === "DELETE_ALL") conditions = null
	const where = createWhere(conditions)
	return this.query(
		`DELETE FROM ??` + where.escaped, [table, ...where.values], {connection}
	)
}


module.exports.deleteUnusedOutside = async (table, id, foreignTables, foreignColumn, {connection} = {}) => {
	if(foreignTables.constructor !== Array) foreignTables = [foreignTables]
	let connectionCreated = false
	if(!connection) {
		const pool = await this.pool
		connection = await pool.getConnection()
		connectionCreated = true
	}
	const results = await Promise.all(foreignTables.map(foreignTable => connection.query(
		"SELECT * FROM ?? WHERE ??=? LIMIT 1", [foreignTable, foreignColumn, id]
	)))
	let unusedOutsideTable = true
	for(const arr of results) {
		if(arr.length > 0) {unusedOutsideTable = false; break}
	}
	if(unusedOutsideTable) await this.delete(
		table, {conditions: {column: this.primaryKey, value: id}, connection}
	)
	if(connectionCreated) connection.release()
}


module.exports.now = (isUtc = true) => {
	const d = new Date()
	if(isUtc) return `${d.getUTCFullYear()}-${atleastTwoDigits(1 + d.getUTCMonth())}-${atleastTwoDigits(d.getUTCDate())} ${atleastTwoDigits(d.getUTCHours())}:${atleastTwoDigits(d.getUTCMinutes())}:${atleastTwoDigits(d.getUTCSeconds())}`
	return `${d.getFullYear()}-${atleastTwoDigits(1 + d.getMonth())}-${atleastTwoDigits(d.getDate())} ${atleastTwoDigits(d.getHours())}:${atleastTwoDigits(d.getMinutes())}:${atleastTwoDigits(d.getSeconds())}`
}


function atleastTwoDigits(num){
	if(0 <= num && num <= 9) return `0${num.toString()}`
	if(-9 <= num && num < 0) return `-0${(num * -1).toString()}`
	return num.toString()
}


function getPairValues(pairs, getFormat = true) {
	let pairValues = new Array(pairs.length * 2)
	if(getFormat) {
		const half = pairValues.length * 0.5
		for(let i = 0; i < pairs.length; i++) {
			pairValues[i] = pairs[i].column
			pairValues[half + i] = pairs[i].value
		}
		return pairValues
	}
	for(let i = 0; i < pairs.length; i++) {
		pairValues[i * 2] = pairs[i].column
		pairValues[i * 2 + 1] = pairs[i].value
	}
	return pairValues
}


function createWhere(conditions) { 
	if(!conditions || conditions.length === 0) return {escaped: "", values: []}
	const getEscapedString = cdn => `?? ${cdn.operator ? cdn.operator : "="} ?`
	if(conditions.constructor === Array) {
		return conditions.reduce((acc, cur, i, arr) => {
			if(typeof cur === "string") return acc
			if(i === 0) return {
				escaped: acc.escaped + " " + getEscapedString(cur),
				values: [...acc.values, cur.column, cur.value]
			}
			let operator = typeof arr[i - 1] === "string" ? ` ${arr[i - 1]} ` : " AND "
			return {
				escaped: acc.escaped + operator + getEscapedString(cur),
				values: [...acc.values, cur.column, cur.value]
			}
		}, {escaped: " WHERE", values: []})
	}
	return {
		escaped: ` WHERE ${getEscapedString(conditions)}`,
		values: [conditions.column, conditions.value]
	}
}


function createInnerJoins(joins) {
	if(!joins || joins.length === 0) return {escaped: "", values: []}
	const getForeignColumn = join => (
		join.foreignColumn ? join.foreignColumn : `${join.table}.${module.exports.primaryKey}`
	)
	if(joins.constructor === Array) {
		return joins.reduce((acc, cur) => {
			return {
				escaped: acc.escaped + " INNER JOIN ?? ON ??=??",
				values: [...acc.values, cur.table, cur.column, getForeignColumn(cur)],
			}
		}, {escaped: "", values: []})
	}
	
	return {
		escaped: " INNER JOIN ?? ON ??=??", 
		values: [joins.table, joins.column, getForeignColumn(joins)]
	}
}


function createOrderBy(sorts) {
	if(!sorts || sorts.length === 0) return {escaped: "", values: []}
	const getEscapedString = sort => `?? ${sort.order === "DESC" ? sort.order : "ASC"}`
	if(sorts.constructor === Array) {
		return sorts.reduce((acc, cur, i) => {
			return {
				escaped: acc.escaped + `${(i > 0 ? "," : "") + getEscapedString(cur)}`,
				values: [...acc.values, cur.column]
			}
		}, {escaped: " ORDER BY ", values: []})
	}
	return {
		escaped: ` ORDER BY ${getEscapedString(sorts)}`, 
		values: [sorts.column]
	}
}