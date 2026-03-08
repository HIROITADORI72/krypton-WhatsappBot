const ytdl = require('youtubedl-core')
const { validateURL, getInfo } = require('youtubedl-core')
const { createWriteStream, readFile } = require('fs-extra')
const { tmpdir } = require('os')
const crypto = require('crypto')

// Generating a random file name
const generateRandomFilename = (length) =>
    crypto
        .randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length)

/**
 * Download video or audio from YouTube and return as buffer
 * @async
 * @param {string} url - YouTube URL
 * @param {string} type - 'audio' or 'video'
 * @returns {Promise<Buffer>}
 */
const getBuffer = async (url, type) => {
    const filename = `${tmpdir()}/${generateRandomFilename(12)}.${type === 'audio' ? 'mp3' : 'mp4'}`
    const stream = createWriteStream(filename)
    
    return new Promise((resolve, reject) => {
        try {
            ytdl(
                url,
                { filter: type === 'audio' ? 'audioonly' : 'videoandaudio' },
                { quality: type === 'audio' ? 'highestaudio' : 'highest' }
            ).pipe(stream)
            
            stream.on('finish', async () => {
                try {
                    const buffer = await readFile(filename)
                    // Cleanup temp file
                    require('fs-extra').unlink(filename).catch(() => {})
                    resolve(buffer)
                } catch (error) {
                    reject(error)
                }
            })
            
            stream.on('error', (error) => {
                // Cleanup on error
                require('fs-extra').unlink(filename).catch(() => {})
                reject(error)
            })
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * Parse video ID from YouTube URL
 * @param {string} url - YouTube URL
 * @returns {string} Video ID
 */
const parseId = (url) => {
    try {
        const split = url.split('/')
        if (url.includes('youtu.be')) return split[split.length - 1]
        return url.split('=')[1]
    } catch (error) {
        console.error('Error parsing YouTube URL:', error)
        throw error
    }
}

module.exports = {
    validateURL,
    getInfo,
    getBuffer,
    parseId
}
