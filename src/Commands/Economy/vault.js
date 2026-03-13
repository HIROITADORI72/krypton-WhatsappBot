const { getKryptonite } = require("../../Library/Economy");

module.exports.execute = async (client, flag, arg, M) => {
    try {
        const userId = M.sender;
        const balance = await getKryptonite(userId);

        return M.reply(
            `*Your Kryptonite Vault*\n\n*You have:* ${balance} Kryptonite`,
            {
                contextInfo: {
                    externalAdReply: {
                        title: "Krypton Economy",
                        body: "Your stored Kryptonite.",
                        thumbnailUrl: "https://raw.githubusercontent.com/HIROITADORI72/krypton-WhatsappBot/main/assets/kryptonite_vault.png",
                        sourceUrl: "",
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        showAdAttribution: true,
                    },
                },
            }
        );
    } catch (error) {
        console.error('Vault command error:', error);
        return M.reply('❌ *An error occurred while fetching your vault*');
    }
};

module.exports.command = {
    name: "vault",
    aliases: ["storage"],
    category: "economy",
    usage: "",
    exp: 5,
    description: "Check your Kryptonite vault.",
};
