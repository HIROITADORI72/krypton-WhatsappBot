const YT = require('../../Library/YT')
const yts = require('yt-search')

module.exports.execute = async (client, flag, arg, M) => {
    try {
        const link = async (term) => {
            try {
                const { videos } = await yts(term.trim())
                if (!videos || !videos.length) return null
                return videos[0].url
            } catch (error) {
                console.error('YouTube search error:', error)
                return null
            }
        }

        if (!arg) return M.reply('🟥 *Please provide a YouTube link or search term*')

        const validPathDomains = /^https?:\/\/(youtu\.be\/|(www\.)?youtube\.com\/(embed|v|shorts|watch)\/)/
        const term = validPathDomains.test(arg) ? arg.trim() : await link(arg)

        if (!term) return M.reply('🟨 *Could not find a valid YouTube video. Please try again.*')
        if (!YT.validateURL(term.trim())) return M.reply('🟨 *Invalid YouTube URL*')

        const { videoDetails } = await YT.getInfo(term)

        if (Number(videoDetails.lengthSeconds) > 1800) {
            return M.reply('⏱️ *Cannot download audio longer than 30 minutes*')
        }

        M.reply('🟩 *Downloading audio, please wait...*')

        let text = `⚡ *Title: ${videoDetails.title}*\n\n🚀 *Views: ${videoDetails.viewCount}*\n\n🎞 *Type: Audio*\n\n⏱ *Duration: ${videoDetails.lengthSeconds}s*\n\n📌 *Channel: ${videoDetails.author.name}*\n\n📅 *Uploaded: ${videoDetails.uploadDate}*\n\n🌍 *Url: ${videoDetails.video_url}*`

        try {
            await client.sendMessage(
                M.from,
                {
                    image: {
                        url: `https://i.ytimg.com/vi/${videoDetails.videoId}/maxresdefault.jpg`
                    },
                    caption: text
                },
                { quoted: M }
            )
        } catch (imgErr) {
            console.error('Error sending image:', imgErr)
        }

        try {
            const audioBuffer = await YT.getBuffer(term, 'audio')
            await client.sendMessage(
                M.from,
                {
                    document: audioBuffer,
                    mimetype: 'audio/mpeg',
                    fileName: videoDetails.title + '.mp3'
                },
                { quoted: M }
            )
        } catch (downloadErr) {
            client.log(`YouTube Audio Download Error: ${downloadErr.message}`, 'red')
            M.reply(`❌ *Error downloading audio: ${downloadErr.message}*`)
        }
    } catch (error) {
        client.log(`YTAudio command error: ${error.message}`, 'red')
        M.reply(`❌ *An error occurred: ${error.message}*`)
    }
}

module.exports.command = {
    name: 'ytaudio',
    aliases: ['yta'],
    category: 'media',
    usage: '[term | link]',
    exp: 5,
    description: 'Downloads given YT Video and sends it as Audio'
}
