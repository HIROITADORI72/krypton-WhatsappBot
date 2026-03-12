const { QuickDB } = require("quick.db");
const { MongoDriver } = require("quickmongo");

let economyDB;

/**
 * Initializes the economy database.
 * @param {string} mongoUri - MongoDB connection URI.
 */
const initEconomyDB = async (mongoUri) => {
    try {
        const driver = new MongoDriver(mongoUri);
        await driver.connect();
        economyDB = new QuickDB({ driver });
        console.log("✅ Economy database connected!");
    } catch (error) {
        console.error("❌ Economy database connection error:", error);
        process.exit(1);
    }
};

/**
 * Get user's Kryptonite balance.
 * @param {string} userId - The user's JID.
 * @returns {Promise<number>} The user's Kryptonite balance.
 */
const getKryptonite = async (userId) => {
    return (await economyDB.get(`kryptonite_${userId}`)) || 0;
};

/**
 * Add Kryptonite to a user's balance.
 * @param {string} userId - The user's JID.
 * @param {number} amount - The amount of Kryptonite to add.
 * @returns {Promise<number>} The new Kryptonite balance.
 */
const addKryptonite = async (userId, amount) => {
    return await economyDB.add(`kryptonite_${userId}`, amount);
};

/**
 * Subtract Kryptonite from a user's balance.
 * @param {string} userId - The user's JID.
 * @param {number} amount - The amount of Kryptonite to subtract.
 * @returns {Promise<number>} The new Kryptonite balance.
 */
const subtractKryptonite = async (userId, amount) => {
    return await economyDB.subtract(`kryptonite_${userId}`, amount);
};

/**
 * Set a user's Kryptonite balance.
 * @param {string} userId - The user's JID.
 * @param {number} amount - The amount of Kryptonite to set.
 * @returns {Promise<number>} The new Kryptonite balance.
 */
const setKryptonite = async (userId, amount) => {
    return await economyDB.set(`kryptonite_${userId}`, amount);
};

module.exports = {
    initEconomyDB,
    getKryptonite,
    addKryptonite,
    subtractKryptonite,
    setKryptonite,
};
