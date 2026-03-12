const YT = require('../../Library/YT')
const yts = require('yt-search')

module.exports.execute = async (client, flag, arg, M) => {
    const link = async (term) => {
        const { videos } = await yts(term.trim())
        if (!videos || !videos.length) return null
        return videos[0].url
    }
    if (!arg) return M.reply('🟥 *Please use this command with a valid youtube.com link*')
    const validPathDomains = /^https?:\/\/(youtu\.be\/|(www\.)?youtube\.com\/(embed|v|shorts)\/)/
    const term = validPathDomains.test(arg) ? arg.trim() : await link(arg)
    if (!term) return M.reply('🟨 *Please use this command with a valid youtube contant term*')
    if (!YT.validateURL(term.trim())) return M.reply('🟨 *Please use this command with a valid youtube.com link*')
    const { videoDetails } = await YT.getInfo(term)
    M.reply('🟩 *Downloading has started please have some pesence*')
    let text = `⚡ *Title: ${videoDetails.title}*\n\n🚀 *Views: ${videoDetails.viewCount}*\n\n🎞 *Type: Audio*\n\n⏱ *Duration: ${videoDetails.lengthSeconds}*\n\n📌 *Channel: ${videoDetails.author.name}*\n\n📅 *Uploaded: ${videoDetails.uploadDate}*\n\n🌍 *Url: ${videoDetails.video_url}*\n\n🎬 *Description:* ${videoDetails.description}`
    client.sendMessage(
        M.from,
        {
            image: {
                url: `https://i.ytimg.com/vi/${videoDetails.videoId}/maxresdefault.jpg`
            },
            caption: text
        },
        {
            quoted: M
        }
    )
    if (Number(videoDetails.lengthSeconds) > 1800) return M.reply('Cannot download audio longer than 30 minutes')
    try {
        const audioBuffer = await YT.getBuffer(term, 'audio')
        await client.sendMessage(
            M.from,
            {
                document: audioBuffer,
                mimetype: 'audio/mpeg',
                fileName: videoDetails.title + '.mp3'
            },
            {
                quoted: M
            }
        )
    } catch (err) {
        client.log(`YouTube Audio Download Error: ${err.message}`, 'red')
        M.reply(`❌ *Error downloading audio: ${err.message}*`)
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
