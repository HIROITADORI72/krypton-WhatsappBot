const { getKryptonite } = require("../../Library/Economy");

module.exports.execute = async (client, flag, arg, M) => {
    const userId = M.sender;
    const balance = await getKryptonite(userId);

    await client.sendMessage(
        M.from,
        {
            text: `*Your Kryptonite Vault*\n\n*You have:* ${balance} Kryptonite`,
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
        },
        {
            quoted: M,
        }
    );
};

module.exports.command = {
    name: "vault",
    aliases: ["storage"],
    category: "economy",
    usage: "",
    exp: 5,
    description: "Check your Kryptonite vault.",
};
