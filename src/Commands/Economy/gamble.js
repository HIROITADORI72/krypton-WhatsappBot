const { getKryptonite, addKryptonite, subtractKryptonite } = require("../../Library/Economy");

module.exports.execute = async (client, flag, arg, M) => {
    try {
        const [choice, amountStr] = arg.split(" ");
        const amount = parseInt(amountStr);

        if (!choice || !amount || (choice !== "left" && choice !== "right") || isNaN(amount) || amount <= 0) {
            return M.reply("Please use the command in the format: gamble <left/right> <amount>");
        }

        const userId = M.sender;
        const balance = await getKryptonite(userId);

        if (balance < amount) {
            return M.reply("You don't have enough Kryptonite to make that bet.");
        }

        // Advanced gambling pattern: 60% chance to win on chosen side, 40% on other
        const winChance = 0.6; // 60% chance to win on the chosen side
        const random = Math.random();

        let result = "";
        let winnings = 0;
        let stickerPath = "";

        if (random < winChance) {
            // User wins on their chosen side
            result = choice;
            winnings = amount;
        } else {
            // User loses, and the other side wins
            result = choice === "left" ? "right" : "left";
            winnings = -amount; // Indicate a loss
        }

        if (result === "left") {
            stickerPath = "https://raw.githubusercontent.com/HIROITADORI72/krypton-WhatsappBot/main/assets/arrow_left.webp";
        } else {
            stickerPath = "https://raw.githubusercontent.com/HIROITADORI72/krypton-WhatsappBot/main/assets/arrow_right.webp";
        }

        if (winnings > 0) {
            await addKryptonite(userId, winnings);
            M.reply(`You chose ${choice} and the ${result} side won! You won ${winnings} Kryptonite!`);
        } else {
            await subtractKryptonite(userId, Math.abs(winnings));
            M.reply(`You chose ${choice} and the ${result} side won! You lost ${Math.abs(winnings)} Kryptonite.`);
        }

        // Send the sticker
        try {
            await client.sendMessage(M.from, { sticker: { url: stickerPath } }, { quoted: M });
        } catch (stickerError) {
            console.error('Error sending sticker:', stickerError);
        }
    } catch (error) {
        console.error('Gamble command error:', error);
        return M.reply('❌ *An error occurred while gambling*');
    }
};

module.exports.command = {
    name: "gamble",
    aliases: ["bet"],
    category: "economy",
    usage: "<left/right> <amount>",
    exp: 10,
    description: "Gamble your Kryptonite on left or right.",
};
