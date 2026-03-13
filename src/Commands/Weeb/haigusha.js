module.exports.execute = async (client, flag, arg, M) => {
    try {
        let result;
        try {
            // Try primary API
            result = await client.utils.fetch('https://reina-api.vercel.app/api/mwl/random');
        } catch (error) {
            console.log('Primary API failed, trying alternative...');
            // Fallback to alternative API
            result = await client.utils.fetch('https://api.jikan.moe/v4/random/characters');
        }

        if (!result || !result.data) {
            return M.reply('❌ *Failed to fetch anime character. Please try again later.*');
        }

        const data = result.data;
        let text = '';
        text += `📔 *Name: ${data.name || 'Unknown'}*\n\n`;
        text += `💮 *Japanese: ${data.original_name || data.name_kanji || 'N/A'}*\n\n`;
        text += `⛩ *Romaji: ${data.romaji_name || 'N/A'}*\n\n`;
        text += `👥 *Gender: ${data.gender || 'N/A'}*\n\n`;
        text += `⏰ *Age: ${data.age || 'N/A'}*\n\n`;
        text += `❤ *Popularity: ${data.popularity_rank || 'N/A'}*\n\n`;
        text += `✔ *Tags: ${data.tags ? data.tags.join(', ') : 'N/A'}*\n\n`;
        text += `📊 *Description:* ${data.description || 'No description available'}`;

        if (data.image || data.images?.jpg?.image_url) {
            const imageUrl = data.image || data.images?.jpg?.image_url;
            return client.sendMessage(
                M.from,
                {
                    image: {
                        url: imageUrl
                    },
                    caption: text
                },
                { quoted: M }
            );
        } else {
            return M.reply(text);
        }
    } catch (error) {
        console.error('Haigusha command error:', error);
        return M.reply('❌ *An error occurred while fetching the anime character. The API might be down.*');
    }
};

module.exports.command = {
    name: 'haigusha',
    aliases: ['hg'],
    category: 'weeb',
    usage: '',
    exp: 5,
    description: 'Summons a random anime character to marry'
};
