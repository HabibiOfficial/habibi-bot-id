// Hidetag — kirim pengumuman dengan mention tersembunyi ke semua anggota
// Cara pakai: hidetag Halo semuanya, rapat jam 8 malam ya
// Khusus admin grup.

async function ambilAnggota(sock, chat) {
  const meta = await sock.groupMetadata(chat);
  return meta?.participants || [];
}

export default {
  name: 'hidetag',
  alias: ['tagall', 'pengumuman'],
  desc: 'Tag semua anggota grup (pengumuman)',
  category: 'group',
  cooldown: 5,
  ownerOnly: false, adminOnly: true, groupOnly: true, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, text, reply } = ctx;
    if (!(text || '').trim()) return reply('📢 Tulis pesannya.\nContoh: *hidetag Rapat jam 8 malam!*');

    try {
      const participants = await ambilAnggota(sock, chat);
      if (!participants.length) return reply('❌ Daftar anggota tidak terbaca. Coba lagi.');

      const mentions = participants.map((p) => p.id).filter(Boolean);
      const pesan =
        `📢 *PENGUMUMAN*\n` +
        `━━━━━━━━━━━━━━━\n${text.trim()}\n━━━━━━━━━━━━━━━\n` +
        `_(${mentions.length} anggota)_`;
      await sock.sendMessage(chat, { text: pesan, mentions }, { quoted: msg });
    } catch (e) {
      console.error('[hidetag]', e.message);
      await reply(`❌ Gagal mengirim pengumuman. _${String(e.message || 'coba lagi nanti').slice(0, 120)}_`);
    }
  },
};
