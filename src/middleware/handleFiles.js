const fsPromises = require("fs/promises")
const {files: config} = require("../../config")
const { getNameAndExtension, getAvailableFileName, isEmpty } = require("../utils")




const handleFiles = (
	allowedExtensions, {
	maxUploadSize = config.maxUploadSize, 
	tempLifetime = config.tempLifetime
} = {}) => {
	return function(req, res, next) {
		if(isEmpty(req.files)) {req.files = null; return next()}
		for(const key in req.files) {
			if(req.files[key].constructor !== Array) req.files[key] = [req.files[key]]
			req.files[key].forEach(file => {
				if(file.size > maxUploadSize) return res.status(403).send(
					`File size limit exceeded (${maxUploadSize * 0.000001}mb)`
				)
				const [name, extension] = getNameAndExtension(file.name)
				file.fullName = file.name
				file.name = name
				file.extension = extension
				if(!allowedExtensions.includes(extension)) return res.status(403).send(
					`File extension not supported (${allowedExtensions.join(", ")})`
				)
				file.moveTo = createMoveTo(file)
				file.tempTimeout = setTimeout(() => {
					fsPromises.unlink(file.path).catch(err => console.log(err))
				}, tempLifetime)
				file.delete = createDelete(file.path, file.tempTimeout)
			})
		}
		next()
	}
}


function createMoveTo(file) {
	return async (dirPath) => {
		try {
			const name = await getAvailableFileName(dirPath, file.name, file.extension)
			const fullName = name + file.extension
			const newPath = dirPath + `/${fullName}`
			await fsPromises.rename(file.path, newPath)
			clearTimeout(file.tempTimeout)
			return {
				fullName,
				delete: createDelete(newPath)
			}
		} catch(err) {
			return Promise.reject(err)
		}
	}
}


function createDelete(path, tempTimeout = null) {
	return () => fsPromises.unlink(path)
	.then(() => clearTimeout(tempTimeout))
	.catch(err => console.log(err))
}


module.exports = handleFiles