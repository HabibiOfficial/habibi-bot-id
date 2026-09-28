// Plugin owner: mengirim kontak owner + info developer.
import { config } from '../../config.js';

export default {
  name: 'owner',
  alias: ['own'],
  desc: 'Info kontak owner & developer bot',
  category: 'main',
  cooldown: 5,
  ownerOnly: false,
  adminOnly: false,
  groupOnly: false,
  privateOnly: false,
  async run(ctx) {
    const { sock, chat, msg } = ctx;
    const vcard =
      'BEGIN:VCARD\n' +
      'VERSION:3.0\n' +
      `FN:Owner ${config.BOT_NAME}\n` +
      `TEL;type=CELL;type=VOICE;waid=${config.OWNER_NUMBER}:${config.OWNER_NUMBER}\n` +
      'END:VCARD';
    await sock.sendMessage(
      chat,
      { contacts: { displayName: 'Owner Bot', contacts: [{ vcard }] } },
      { quoted: msg },
    );
    await ctx.reply(
      `👑 *Owner:* wa.me/${config.OWNER_NUMBER}\n` +
        `💻 *Developer:* ${config.DEVELOPER}\n` +
        `🤖 *Bot:* ${config.BOT_NAME}\n\n` +
        `Chat owner bila ada keperluan penting ya 🙏`,
    );
  },
};
