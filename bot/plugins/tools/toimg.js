// ToImg — ubah stiker menjadi gambar PNG
// Cara pakai: balas sebuah stiker lalu ketik toimg
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import sharp from 'sharp';

function ambilQuoted(msg) {
  const m = msg.message || {};
  const ctxInfo =
    m.extendedTextMessage?.contextInfo ||
    m.imageMessage?.contextInfo ||
    m.stickerMessage?.contextInfo;
  return ctxInfo?.quotedMessage || null;
}

export default {
  name: 'toimg',
  alias: ['toimage', 'stimg'],
  desc: 'Ubah stiker menjadi gambar PNG',
  category: 'tools',
  cooldown: 5,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, reply } = ctx;
    const q = ambilQuoted(msg);
    if (!q?.stickerMessage) {
      return reply('🖼️ Balas sebuah *stiker* lalu ketik *toimg*');
    }

    await reply('⏳ Mengubah stiker jadi gambar…');
    try {
      const buf = await downloadMediaMessage({ ...msg, message: q }, 'buffer', {});
      if (!buf?.length) throw new Error('gagal mengunduh stiker');
      // Stiker animasi (webp) → diambil frame pertamanya oleh sharp
      const png = await sharp(buf).png().toBuffer();
      await sock.sendMessage(chat, { image: png, caption: '🖼️' }, { quoted: msg });
    } catch (e) {
      console.error('[toimg]', e.message);
      await reply(`❌ Gagal mengubah stiker. _${String(e.message || 'coba lagi nanti').slice(0, 120)}_`);
    }
  },
};
