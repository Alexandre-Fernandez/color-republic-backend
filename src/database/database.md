// QUERY PARAMETER FORMATTING

/*

pairs:

	{ column: "column1", value: 1}

	or

	[
		{ column: "column1", value: 1},
		{ column: "column2", value: 2}
	]

*/
/*

conditions:

	{column: "column1", value: 1}

	or

	[
		"NOT",
		{column: "column1", value: 1},
		"AND NOT",
		{column: "column2", operator: ">", value: 2},
		"OR",
		{column: "column3", operator: "LIKE", value: 3},
		{column: "column4", operator: "<=", value: 4},
	]

*/
/*

columns:

	"column1"

	or

	["column1", "column2"]

*/
/*

joins:

	{table: "table2", column: "table1Column"}

	or

	[
		{table: "table2", column: "table1Column"},
		{table: "table3", column: "table1Column", foreignColumn: "table3Column"},
	]

*/
/*

sorts:

	{column: "column1"}

	or

	[
		{column: "column1"},
		{column: "column2", order: "ASC"}, 
		{column: "column3", order: "DESC"}
	]

*/