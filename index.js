const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const P = require("pino")

const badWords = ["كلمة_شتيمة1", "كلمة_شتيمة2"] // حط هنا كلمات الشتيمة

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("session")
    const sock = makeWASocket({
        logger: P({ level: "silent" }),
        auth: state
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return

        const from = msg.key.remoteJid
        const sender = msg.key.participant || msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""

        // منع الروابط
        if (text.includes("http://") || text.includes("https://")) {
            await sock.sendMessage(from, { text: "🚫 الروابط ممنوعة!" })
            await sock.groupParticipantsUpdate(from, [sender], "remove")
        }

        // منع الشتيمة
        for (let word of badWords) {
            if (text.includes(word)) {
                await sock.sendMessage(from, { text: "🚫 تم طردك بسبب الألفاظ!" })
                await sock.groupParticipantsUpdate(from, [sender], "remove")
            }
        }

        // قائمة الأوامر
        if (text === "!menu") {
            await sock.sendMessage(from, { text: "📋 الأوامر:\n!menu - عرض القائمة" })
        }
    })

    sock.ev.on("group-participants.update", async (update) => {
        const group = update.id
        for (let participant of update.participants) {
            if (update.action === "add") {
                await sock.sendMessage(group, { text: "🎉 أهلاً وسهلاً بيك في الجروب!" })
            }
            if (update.action === "remove") {
                await sock.sendMessage(group, { text: "👋 مع السلامة!" })
            }
        }
    })
}

startBot()
