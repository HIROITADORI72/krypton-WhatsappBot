const { getKryptonite, addKryptonite, subtractKryptonite } = require("../../Library/Economy");

module.exports.execute = async (client, flag, arg, M) => {
    const userId = M.sender;
    const bet = parseInt(arg);

    if (isNaN(bet) || bet <= 0) {
        return M.reply("Please enter a valid bet amount.");
    }

    const balance = await getKryptonite(userId);

    if (balance < bet) {
        return M.reply("You don't have enough Kryptonite to make that bet.");
    }

    const reels = ["🍒", "🍊", "🍇", "🍋", "🍉", "⭐"];
    const reel1 = reels[Math.floor(Math.random() * reels.length)];
    const reel2 = reels[Math.floor(Math.random() * reels.length)];
    const reel3 = reels[Math.floor(Math.random() * reels.length)];

    let winnings = 0;
    if (reel1 === reel2 && reel2 === reel3) {
        if (reel1 === "⭐") {
            winnings = bet * 10;
        } else {
            winnings = bet * 5;
        }
    } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
        winnings = bet * 2;
    }

    let resultText = `${reel1} | ${reel2} | ${reel3}\n\n`;

    if (winnings > 0) {
        await addKryptonite(userId, winnings);
        resultText += `You won ${winnings} Kryptonite!`;
    } else {
        await subtractKryptonite(userId, bet);
        resultText += `You lost ${bet} Kryptonite.`;
    }

    M.reply(resultText);
};

module.exports.command = {
    name: "slot",
    aliases: ["slots"],
    category: "economy",
    usage: "<bet>",
    exp: 10,
    description: "Play the slot machine.",
};
