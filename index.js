#!/usr/bin/env node

const fetch = require('node-fetch')
const mime = require('mime-types')
const program = require('commander')
const fs = require('fs')
const path = require('path')

const { version } = require('./package')

// parse args
program
	.version(version)
	.option('-s, --sub [type]', 'Add the specified type of cheese [programmerhumor]', 'programmerhumor')
	.parse(process.argv)
const { sub } = program
console.log('Attempting to scrape sub', sub)

// create dir
const scrape = path.join(__dirname, 'scrape')
const subDir = path.join(scrape, sub)

function safe_mkdir(loc) {
	if (!fs.existsSync(loc)) {
		fs.mkdirSync(loc)
	}
}

safe_mkdir(scrape)
safe_mkdir(subDir)


function toFilename(name) {
	return name.replace(/[^\w\s]/gi, '').replace(/ /g, '_').toLowerCase()
}
// get from sub
const url = `https://www.reddit.com/r/${sub}/.json`
fetch(url).then(resp => resp.json()).then(({ data }) => {
	const links = data.children.filter(item => item.kind === 't3').map(post => ({
		name: toFilename(post.data.title),
		url: post.data.url,
	}))
	return Promise.all(links.map(async (entry) => {
		const resp = await fetch(entry.url)
		const contentType = resp.headers.get('content-type')
		const ext = mime.extension(contentType)
		const isImage = Boolean(~contentType.indexOf('image/'))
		const filename = `${entry.name}.${ext}`
		if (!isImage) return undefined
		console.log(filename)
		const dest = fs.createWriteStream(path.join(subDir, filename))
		resp.body.pipe(dest)
	}))
})
