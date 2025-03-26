const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const qrImage = require('qrcode');

// Function to display and save QR Code
function generateQR(qrCode) {
  // Display in Terminal
  console.log("🔎 Scan this QR code to log in:");
  qrcode.generate(qrCode, { small: true });

  // Save as PNG
  const qrPath = path.resolve(__dirname, 'qr.png');
  qrImage.toFile(qrPath, qrCode, (err) => {
    if (err) {
      console.error('❗ Error saving QR code:', err);
    } else {
      console.log(`✅ QR Code saved as ${qrPath}`);
    }
  });
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({ auth: state });

  sock.ev.on('creds.update', saveCreds);

  // QR Code Generation and Connection Management
  sock.ev.on('connection.update', (update) => {
    const { connection, qr } = update;

    if (qr) {
      generateQR(qr);
    }

    if (connection === 'open') {
      console.log('✅ Successfully connected to WhatsApp!');
    } else if (connection === 'close') {
      console.log('❗ Connection closed. Restarting...');
      startBot();
    }
  });

  // Message Handler
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || !msg.key.remoteJid || msg.key.fromMe) return;

    const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!textMessage) return;

    const args = textMessage.split(' ');
    const command = args[0].toLowerCase();

    // ✅ Commands
    if (command === '.cmds') {
      const commandsList = `
╭━━━〔 🤖 *PRAVEEN BOT COMMANDS* 🤖 〕━━━╮

💡 *Basic Commands:*
➤ _.alive_ - Check if the bot is active
➤ _.cmds_ - Show this command list

✉️ *Messaging Commands:*
➤ _.spam <count> <msg>_ - Spam a message multiple times
➤ _.info_ - Get user info

🔒 *Privacy Commands:*
➤ _.block_ - Block the current chat
➤ _.unblock_ - Unblock the current chat

✨ *More Features Coming Soon!*

╰━━━━━━━━━━━━━━━━━━━━━━╯
      `;
      await sock.sendMessage(msg.key.remoteJid, { text: commandsList });
      return;
    }

    if (command === '.alive') {
      await sock.sendMessage(msg.key.remoteJid, { text: '✅ *Bot is Alive and Running!*' });
      return;
    }

    if (command === '.spam') {
      if (args.length < 3) {
        await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Usage: .spam <count> <message>' });
        return;
      }
      const count = parseInt(args[1]);
      if (isNaN(count) || count <= 0) {
        await sock.sendMessage(msg.key.remoteJid, { text: '❗ Invalid count! Please provide a valid number.' });
        return;
      }
      const spamMessage = args.slice(2).join(' ');
      for (let i = 0; i < count; i++) {
        await sock.sendMessage(msg.key.remoteJid, { text: spamMessage });
      }
      return;
    }

    if (command === '.info') {
      const contact = await sock.onWhatsApp(msg.key.remoteJid);
      const userInfo = contact[0] || {};
      const infoMessage = `
📌 *User Info:*
- 📛 *Name:* ${userInfo.notify || 'Unknown'}
- 🆔 *JID:* ${msg.key.remoteJid}
- 🏢 *Business Account:* ${userInfo.isBusiness ? 'Yes' : 'No'}
- ✅ *Exists on WhatsApp:* ${userInfo.exists ? 'Yes' : 'No'}
      `;
      await sock.sendMessage(msg.key.remoteJid, { text: infoMessage });
      return;
    }

    if (command === '.block') {
      await sock.updateBlockStatus(msg.key.remoteJid, 'block');
      await sock.sendMessage(msg.key.remoteJid, { text: '🚫 *User Blocked Successfully!*' });
      return;
    }

    if (command === '.unblock') {
      await sock.updateBlockStatus(msg.key.remoteJid, 'unblock');
      await sock.sendMessage(msg.key.remoteJid, { text: '✅ *User Unblocked Successfully!*' });
      return;
    }
  });
}

startBot();