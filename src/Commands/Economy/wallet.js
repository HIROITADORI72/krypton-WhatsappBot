const { getKryptonite } = require("../../Library/Economy");

module.exports.execute = async (client, flag, arg, M) => {
    try {
        const userId = M.sender;
        const balance = await getKryptonite(userId);

        return M.reply(
            `*Your Kryptonite Wallet*\n\n*Balance:* ${balance} Kryptonite`,
            {
                contextInfo: {
                    externalAdReply: {
                        title: "Krypton Economy",
                        body: "Your current Kryptonite balance.",
                        thumbnailUrl: "https://raw.githubusercontent.com/HIROITADORI72/krypton-WhatsappBot/main/assets/kryptonite_currency.png",
                        sourceUrl: "",
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        showAdAttribution: true,
                    },
                },
            }
        );
    } catch (error) {
        console.error('Wallet command error:', error);
        return M.reply('❌ *An error occurred while fetching your wallet*');
    }
};

module.exports.command = {
    name: "wallet",
    aliases: ["bal", "balance"],
    category: "economy",
    usage: "",
    exp: 5,
    description: "Check your Kryptonite balance.",
};
