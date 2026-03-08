const { serialize } = require('../Helper/WAclient')
const { getStats } = require('../Library/stats')
const chalk = require('chalk')
const axios = require('axios')

/**
 * Main message handler with error isolation and rate-limiting
 * @async
 * @param {Object} messages - Incoming messages from Baileys
 * @param {Object} client - Krypton bot client instance
 */
const MessageHandler = async (messages, client) => {
    try {
        if (messages.type !== 'notify') return
        let M = serialize(JSON.parse(JSON.stringify(messages.messages[0])), client)
        if (!M.message) return
        if (M.key && M.key.remoteJid === 'status@broadcast') return
        if (M.type === 'protocolMessage' || M.type === 'senderKeyDistributionMessage' || !M.type || M.type === '')
            return

        const { isGroup, sender, from, body } = M
        const gcMeta = isGroup ? await client.groupMetadata(from) : ''
        const gcName = isGroup ? gcMeta.subject : ''
        const isCmd = body.startsWith(client.config.prefix)
        const [cmdName, ...args] = body.replace(client.config.prefix, '').split(' ')
        const arg = args.filter((x) => !x.startsWith('--')).join(' ')
        const flag = args.filter((arg) => arg.startsWith('--'))
        const groupMembers = gcMeta?.participants || []
        const groupAdmins = groupMembers.filter((v) => v.admin).map((v) => v.id)
        const ActivateMod = (await client.DB.get('mod')) || []
        const ActivateChatBot = (await client.DB.get('chatbot')) || []
        const banned = (await client.DB.get('banned')) || []

        // Antilink protection
        await antilink(client, M, groupAdmins, ActivateMod, isGroup, sender, body, from)

        // Banned user check
        if (banned.includes(sender)) return M.reply('🟥 *You are banned from using the bot*')

        // AI chat functionality
        await ai_chat(client, M, isGroup, isCmd, ActivateChatBot, body, from)

        // Message logging
        client.log(
            `${chalk[isCmd ? 'red' : 'green'](`${isCmd ? '~EXEC' : '~RECV'}`)} ${
                isCmd ? `${client.config.prefix}${cmdName}` : 'Message'
            } ${chalk.white('from')} ${M.pushName} ${chalk.white('in')} ${isGroup ? gcName : 'DM'} ${chalk.white(
                `args: [${chalk.blue(args.length)}]`
            )}`,
            'yellow'
        )

        if (!isCmd) return
        const command =
            client.cmd.get(cmdName) ||
            client.cmd.find((cmd) => cmd.command.aliases && cmd.command.aliases.includes(cmdName))

        if (!command) return M.reply(`💔 *No such command found!!*`)
        if (!groupAdmins.includes(sender) && command.command.category == 'moderation')
            return M.reply('🟨 *User Missing Admin Permission*')
        if (
            !groupAdmins.includes(client.user.id.split(':')[0] + '@s.whatsapp.net') &&
            command.command.category == 'moderation'
        )
            return M.reply('💔 *Missing admin permission. Try promoting me to admin and try again.*')
        if (!isGroup && command.command.category == 'moderation')
            return M.reply('🟨 *This command and its aliases can only be used in a group chat*')
        if (!client.config.mods.includes(sender.split('@')[0]) && command.command.category == 'dev')
            return M.reply('📛 *This command only can be accessed by the mods*')

        // Rate-limiting check per user/group
        const rateLimitKey = `${sender}_${cmdName}`
        const lastExecution = client.messagesMap.get(rateLimitKey) || 0
        const cooldown = (command.command.cooldown || 3) * 1000
        if (Date.now() - lastExecution < cooldown) {
            const timeLeft = ((cooldown - (Date.now() - lastExecution)) / 1000).toFixed(1)
            return M.reply(`⏱️ *Please wait ${timeLeft}s before using this command again*`)
        }
        client.messagesMap.set(rateLimitKey, Date.now())

        // Execute command with error isolation
        try {
            await command.execute(client, flag, arg, M)
        } catch (cmdError) {
            client.log(`Command error in ${cmdName}: ${cmdError.message}`, 'red')
            M.reply(`❌ *An error occurred while executing the command*`)
        }

        // Award experience
        await experience(client, sender, M, from, command)
    } catch (err) {
        client.log(`Message handler error: ${err.message}`, 'red')
    }
}

module.exports = MessageHandler

/**
 * Anti-link protection for groups
 * @async
 * @param {Object} client - Bot client
 * @param {Object} M - Message object
 * @param {Array} groupAdmins - Group admin list
 * @param {Array} ActivateMod - Active moderation groups
 * @param {boolean} isGroup - Is group message
 * @param {string} sender - Sender JID
 * @param {string} body - Message body
 * @param {string} from - Chat JID
 * @returns {Promise<void>}
 */
const antilink = async (client, M, groupAdmins, ActivateMod, isGroup, sender, body, from) => {
    try {
        if (
            isGroup &&
            ActivateMod.includes(from) &&
            groupAdmins.includes(client.user.id.split(':')[0] + '@s.whatsapp.net') &&
            body
        ) {
            const groupCodeRegex = body.match(/chat.whatsapp.com\/(?:invite\/)?([\w\d]*)/)
            if (groupCodeRegex && groupCodeRegex.length === 2 && !groupAdmins.includes(sender)) {
                const groupCode = groupCodeRegex[1]
                const groupNow = await client.groupInviteCode(from)

                if (groupCode !== groupNow) {
                    await client.sendMessage(from, { delete: M.key })
                    await client.groupParticipantsUpdate(from, [sender], 'remove')
                    M.reply('❤ *Successfully removed an intruder!!!!*')
                }
            }
        }
    } catch (error) {
        console.error('Antilink error:', error)
    }
}

/**
 * AI chat functionality with error handling
 * @async
 * @param {Object} client - Bot client
 * @param {Object} M - Message object
 * @param {boolean} isGroup - Is group message
 * @param {boolean} isCmd - Is command
 * @param {Array} ActivateChatBot - Active chatbot groups
 * @param {string} body - Message body
 * @param {string} from - Chat JID
 * @returns {Promise<void>}
 */
const ai_chat = async (client, M, isGroup, isCmd, ActivateChatBot, body, from) => {
    try {
        if (M.quoted?.participant) M.mentions.push(M.quoted.participant)
        if (
            M.mentions.includes(client.user.id.split(':')[0] + '@s.whatsapp.net') &&
            !isCmd &&
            isGroup &&
            ActivateChatBot.includes(from)
        ) {
            const msg = M.mentions
                ? M.mentions
                      .map(async (x) => `${body.replace(x, (await client.contact.getContact(x, client)).username)}`)
                      .join(', ')
                : body
            const text = await axios.get(`https://hercai.onrender.com/beta/hercai?question=${encodeURI(msg)}`, {
                headers: {
                    'content-type': 'application/json'
                },
                timeout: 10000
            })
            M.reply(text.data.reply)
        }
    } catch (error) {
        console.error('AI chat error:', error.message)
    }
}

/**
 * Award experience and handle level-ups
 * @async
 * @param {Object} client - Bot client
 * @param {string} sender - Sender JID
 * @param {Object} M - Message object
 * @param {string} from - Chat JID
 * @param {Object} cmd - Command object
 */
const experience = async (client, sender, M, from, cmd) => {
    try {
        // Award experience for command execution
        await client.exp.add(sender, cmd.command.exp || 10)

        // Check for level up
        const level = (await client.DB.get(`${sender}_LEVEL`)) || 0
        const experience = await client.exp.get(sender)
        const { requiredXpToLevelUp } = getStats(level)
        if (requiredXpToLevelUp > experience) return null
        await client.DB.add(`${sender}_LEVEL`, 1)
        await M.reply(` 🎉 *_You Leveled Up_*\n\n _*${M.pushName}*_ Level up 🆙 *_${level} ==> ${level + 1}_*`)
    } catch (error) {
        console.error('Experience error:', error.message)
    }
}
