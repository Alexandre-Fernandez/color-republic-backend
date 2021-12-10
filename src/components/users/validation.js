module.exports.isEmailValid = email => {
	if(!email) return false
	email = email.toLowerCase()
	let allowedChars = new Set("abcdefghijklmnopqrstuvwxyz")
	email = email.split("@")
	if(email.length !== 2) return false
	email = [email[0], ...email[1].split(".")]
	if(email.length !== 3 || !email[0] || !email[1] || !email[2]) return false
	const [ localPart, domain, extension ] = email
	if(localPart.length > 64 || domain.length > 63) return false
	if(!allowedChars.has(localPart[0]) || !allowedChars.has(domain[0])) return false
	if(domain[domain.length - 1] === "-") return false
	if(domain.length > 3 && domain[2] === "-" && domain[3] === "-") return false
	if(localPart[localPart.length - 1] === ".") return false
	for(let i = 0; i < extension.length; i++) { 
		if(!allowedChars.has(extension[i])) return false
	}
	allowedChars = new Set([...allowedChars, ..."0123456789-"])
	for(let i = 0; i < domain.length; i++) { 
		if(!allowedChars.has(domain[i])) return false
	}
	allowedChars = new Set([...allowedChars, ..."_."])
	for(let i = 0; i < localPart.length; i++) { 
		if(!allowedChars.has(localPart[i])) return false
		if(localPart[i] === "." && localPart[i + 1] && localPart[i + 1] === ".") return false
	}
	return true
}


// Password must be 8 to 128 characters and contain atleast 3 of the following : a lowercase character, an uppercase character, a number, a symbol (@%+"/'!#$^?:.(){}[]~`-_.)
module.exports.isPasswordValid = password => {
	if(!password) return false
	if(password.length < 8 || password.length > 128) return false
	let counter = 0
	if(password.toLowerCase() !== password) counter += 1
	if(password.toUpperCase() !== password) counter += 1
	const numbers = new Set("0123456789")
	const symbols = new Set("@%+\"\/'!#$^?:.(){}[]~`-_.")
	for(let i = 0; i < password.length && counter < 3; i++) {
		if(numbers.has(password[i])) counter += 1
		if(symbols.has(password[i])) counter += 1
	}
	return counter >= 3
}