const { QuickDB } = require('quick.db');
const { MongoDriver } = require('quickmongo');
const fs = require('fs-extra');
const path = require('path');
const { BufferJSON, initAuthCreds, proto } = require('@whiskeysockets/baileys');

/**
 * Creates a MongoDB-based authentication state store
 * This ensures session persistence across bot restarts and deployments
 * @param {string} mongoUri - MongoDB connection URI
 * @returns {Promise<Object>} Auth state object with save/load functions
 */
const useMongoAuthState = async (mongoUri) => {
    try {
        const driver = new MongoDriver(mongoUri);
        await driver.connect();
        const db = new QuickDB({ driver });
        const authTable = db.table('auth_state');

        const creds = await authTable.get('creds');
        const keys = await authTable.get('keys');

        const state = {
            creds: creds || initAuthCreds(),
            keys: keys || {
                preKeys: new Map(),
                sessions: new Map(),
                senderKeys: new Map(),
                appStateSyncKeys: new Map(),
                appStateVersions: new Map(),
                lastAccountSyncTimestamp: Date.now()
            }
        };

        const saveCreds = async () => {
            try {
                // Save credentials
                await authTable.set('creds', state.creds);

                // Convert Maps to objects for storage
                const keysToStore = {
                    preKeys: Object.fromEntries(state.keys.preKeys),
                    sessions: Object.fromEntries(state.keys.sessions),
                    senderKeys: Object.fromEntries(state.keys.senderKeys),
                    appStateSyncKeys: Object.fromEntries(state.keys.appStateSyncKeys),
                    appStateVersions: Object.fromEntries(state.keys.appStateVersions),
                    lastAccountSyncTimestamp: state.keys.lastAccountSyncTimestamp
                };

                await authTable.set('keys', keysToStore);
                console.log('✅ Auth state saved to MongoDB');
            } catch (error) {
                console.error('Error saving auth state:', error);
            }
        };

        // Restore Maps from stored objects
        if (keys) {
            state.keys.preKeys = new Map(Object.entries(keys.preKeys || {}));
            state.keys.sessions = new Map(Object.entries(keys.sessions || {}));
            state.keys.senderKeys = new Map(Object.entries(keys.senderKeys || {}));
            state.keys.appStateSyncKeys = new Map(Object.entries(keys.appStateSyncKeys || {}));
            state.keys.appStateVersions = new Map(Object.entries(keys.appStateVersions || {}));
            state.keys.lastAccountSyncTimestamp = keys.lastAccountSyncTimestamp || Date.now();
        }

        return { state, saveCreds };
    } catch (error) {
        console.error('Error initializing MongoDB auth state:', error);
        // Fallback to file-based auth if MongoDB fails
        console.log('Falling back to file-based authentication...');
        const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
        return await useMultiFileAuthState('session');
    }
};

module.exports = { useMongoAuthState };
