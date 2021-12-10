const fsPromises = require("fs/promises")

//TODO: make file utils into a file.js lib 


module.exports.isEmpty = obj => {
	if(!obj) return true
	let isEmpty = true
	for(const key in obj) {
		isEmpty = false
		break
	}
	return isEmpty
}


module.exports.isTruthy = obj => {
	if(!obj) return false
	if(typeof obj === "object") obj = Object.values(obj)
	for(value of obj) {
		if(!value) return false
	}
	return true
}


module.exports.getNameAndExtension = (nameExtension) => {
	let lastDotIndex = nameExtension.lastIndexOf(".")
	if(lastDotIndex === -1) return {
		name: nameExtension, 
		extension: ".unknown"
	}
	return [
		nameExtension.substring(0, lastDotIndex), 
		nameExtension.substring(lastDotIndex)
	]
}


module.exports.getAvailableFileName = (dirPath, name, extension, counter = "") => {
	return fsPromises.access(dirPath + `/${name + counter.toString() + extension}`)
	.then(() => {
		if(!counter) 	counter = 1
		else 			counter += 1
		return this.getAvailableFileName(dirPath, name, extension, counter)
	})
	.catch(() => {
		return Promise.resolve(name + counter.toString())
	})
}


module.exports.emptyDir = async (dirPath) => {
	try {
		const fileNames = await fsPromises.readdir(dirPath)
		await Promise.all(fileNames.map(fileName => fsPromises.unlink(
			dirPath + "/" + fileName
		)))
		return true
	} catch (err) {
		return Promise.reject(err)
	}

}


module.exports.getRemainingString = (path, fromSubString, includeSubString = false) => {
	if(includeSubString) return path.substring(path.lastIndexOf(fromSubString))
	return path.substring(path.lastIndexOf(fromSubString) + fromSubString.length)
}