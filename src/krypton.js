const {
    default: Baileys,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')
const { useMongoAuthState } = require('./Library/MongoAuthState')
const { QuickDB } = require('quick.db')
const { getConfig } = require('./getConfig')
const { MongoDriver } = require('quickmongo')
const { Collection } = require('discord.js')
const MessageHandler = require('./Handlers/Message')
const EventsHandler = require('./Handlers/Events')
const contact = require('./Helper/contacts')
const utils = require('./Helper/function')
const openai = require('./Library/AI_lib')
const { initEconomyDB } = require('./Library/Economy')
const app = require('express')()
const chalk = require('chalk')
const P = require('pino')
const { Boom } = require('@hapi/boom')
const { join } = require('path')
const { imageSync } = require('qr-image')
const { readdirSync, remove } = require('fs-extra')
const port = process.env.PORT || 3000
const driver = new MongoDriver(process.env.URL)

/**
 * Initialize and start the Krypton WhatsApp bot
 * Handles QR code authentication, session management, and connection lifecycle
 * @async
 * @returns {Promise<void>}
 */
const start = async () => {
    try {
        // Use MongoDB for session persistence to avoid re-authentication after updates
        const { state, saveCreds } = await useMongoAuthState(process.env.URL)

        const client = Baileys({
            version: (await fetchLatestBaileysVersion()).version,
            auth: state,
            logger: P({ level: 'silent' }),
            browser: ['krypton-WhatsappBot', 'silent', '4.0.0'],
            printQRInTerminal: true,
            markOnlineOnConnect: true,
            syncFullHistory: false,
            retryRequestDelayMs: 10,
            maxMsgsInMemory: 100
        })

        //Config
        client.config = getConfig()

        //Database
        client.DB = new QuickDB({
            driver
        })
        //Tables
        client.contactDB = client.DB.table('contacts')

        //Economy
        await initEconomyDB(process.env.URL)

        //Contacts
        client.contact = contact

        //Open AI
        client.AI = openai

        //Experience
        client.exp = client.DB.table('experience')

        //Commands
        client.cmd = new Collection()

        //Utils
        client.utils = utils

        client.messagesMap = new Map()

        /**
         * @returns {Promise<string[]>}
         */

        client.getAllGroups = async () => Object.keys(await client.groupFetchAllParticipating())

        /**
         * @returns {Promise<string[]>}
         */

        client.getAllUsers = async () => {
            try {
                const allContacts = await client.contactDB.all()
                if (!allContacts || allContacts.length === 0) return []
                const data = allContacts.map((x) => x.id).filter(Boolean)
                const users = data.filter((element) => /^\d+@s$/.test(element)).map((element) => `${element}.whatsapp.net`)
                return users
            } catch (error) {
                console.error('Error getting all users:', error)
                return []
            }
        }

        //Colourful
        client.log = (text, color = 'green') =>
            color ? console.log(chalk.keyword(color)(text)) : console.log(chalk.green(text))

        //Command Loader
        const loadCommands = async () => {
            const readCommand = (rootDir) => {
                try {
                    readdirSync(rootDir).forEach(($dir) => {
                        const commandFiles = readdirSync(join(rootDir, $dir)).filter((file) => file.endsWith('.js'))
                        for (let file of commandFiles) {
                            try {
                                const cmd = require(join(rootDir, $dir, file))
                                client.cmd.set(cmd.command.name, cmd)
                                client.log(`Loaded: ${cmd.command.name.toUpperCase()} from ${file}`)
                            } catch (cmdErr) {
                                client.log(`Failed to load command ${file}: ${cmdErr.message}`, 'red')
                            }
                        }
                    })
                    client.log('Successfully Loaded Commands', 'green')
                } catch (err) {
                    client.log(`Error loading commands: ${err.message}`, 'red')
                }
            }
            readCommand(join(__dirname, '.', 'Commands'))
        }

        /**
         * Handle connection updates with exponential backoff and graceful reconnection
         * Preserves QR code flow and session-based authentication
         */
        let reconnectAttempts = 0
        const maxReconnectAttempts = 5
        const baseReconnectDelay = 3000

        client.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update

            // QR Code Display for first-time authentication
            if (qr) {
                reconnectAttempts = 0
                client.log(`[${chalk.red('!')}]`, 'white')
                client.log(`Scan the QR code above | You can also authenticate in http://localhost:${port}`, 'blue')
                client.QR = imageSync(qr)
            }

            // Handle connection close with exponential backoff
            if (connection === 'close') {
                const { statusCode } = new Boom(lastDisconnect?.error).output

                // Logged out - session is now in MongoDB, so just reconnect
                if (statusCode === DisconnectReason.loggedOut) {
                    client.log('Logged out. Attempting to reconnect...', 'yellow')
                    // Don't clear session since it's stored in MongoDB
                    setTimeout(() => start(), baseReconnectDelay)
                }
                // Restart required - reconnect immediately
                else if (statusCode === DisconnectReason.restartRequired) {
                    client.log('Restart required. Reconnecting...', 'yellow')
                    reconnectAttempts = 0
                    setTimeout(() => start(), 1000)
                }
                // Other disconnections - exponential backoff
                else if (reconnectAttempts < maxReconnectAttempts) {
                    const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts)
                    client.log(`Reconnecting... (Attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`, 'yellow')
                    reconnectAttempts++
                    setTimeout(() => start(), delay)
                } else {
                    client.log('Max reconnection attempts reached. Please restart the bot.', 'red')
                }
            }

            // Connecting state
            if (connection === 'connecting') {
                client.state = 'connecting'
                client.log('Connecting to WhatsApp...', 'yellow')
            }

            // Connected and ready
            if (connection === 'open') {
                client.state = 'open'
                reconnectAttempts = 0
                loadCommands()
                client.log('Connected to WhatsApp', 'green')
                client.log('Total Mods: ' + client.config.mods.length, 'green')
            }
        })

        app.get('/', (req, res) => {
            res.status(200).setHeader('Content-Type', 'image/png').send(client.QR)
        })

        client.ev.on('messages.upsert', async (messages) => await MessageHandler(messages, client))

        client.ev.on('group-participants.update', async (event) => await EventsHandler(event, client))

        client.ev.on('contacts.update', async (update) => await contact.saveContacts(update, client))

        // Save credentials on update (session persistence)
        client.ev.on('creds.update', saveCreds)

        return client
    } catch (error) {
        console.error('Error starting bot:', error)
        setTimeout(() => start(), 5000)
    }
}

/**
 * Global error handlers for unhandled rejections and exceptions
 */
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
    process.exit(1)
})

// Database connection and bot startup
if (!process.env.URL) {
    console.error('❌ You have not provided any MongoDB URL!!')
    process.exit(1)
}

driver
    .connect()
    .then(() => {
        console.log('✅ Connected to the database!')
        // Start the bot after successful database connection
        start()
    })
    .catch((err) => {
        console.error('❌ Database connection error:', err)
        process.exit(1)
    })

app.listen(port, () => console.log(`✅ Server started on PORT : ${port}`))
