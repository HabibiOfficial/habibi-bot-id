// Kick — keluarkan anggota dari grup
// Cara pakai: kick @tag  |  balas pesan target lalu ketik kick
// Khusus admin grup.
function ambilTarget(msg, arg) {
  const m = msg.message || {};
  const info = m.extendedTextMessage?.contextInfo || m.imageMessage?.contextInfo || m.videoMessage?.contextInfo;
  // 1) dari mention
  const mentioned = info?.mentionedJid;
  if (Array.isArray(mentioned) && mentioned.length) return mentioned[0];
  // 2) dari pesan yang dibalas
  const quoted = info?.participant;
  if (quoted) return quoted;
  // 3) dari argumen nomor
  const digits = String(arg || '').replace(/[^0-9]/g, '');
  if (digits.length >= 8) return `${digits}@s.whatsapp.net`;
  return null;
}

const keNomor = (jid) => String(jid || '').split('@')[0].split(':')[0];

export default {
  name: 'kick',
  alias: ['tendang'],
  desc: 'Keluarkan anggota dari grup',
  category: 'group',
  cooldown: 3,
  ownerOnly: false, adminOnly: true, groupOnly: true, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, args, senderNumber, reply } = ctx;
    const target = ambilTarget(msg, args[0]);
    if (!target) return reply('👢 Tag atau balas pesan target.\nContoh: *kick @nama*');
    if (keNomor(target) === String(senderNumber || '')) return reply('😅 Tidak bisa kick diri sendiri.');

    try {
      await sock.groupParticipantsUpdate(chat, [target], 'remove');
      await reply(`👢 @${keNomor(target)} dikeluarkan dari grup.`);
    } catch (e) {
      console.error('[kick]', e.message);
      await reply('❌ Gagal mengeluarkan anggota. Pastikan bot juga admin grup.');
    }
  },
};
