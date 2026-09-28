// Demote — turunkan admin menjadi anggota biasa
// Cara pakai: demote @tag  |  balas pesan target lalu ketik demote
// Khusus admin grup.
function ambilTarget(msg, arg) {
  const m = msg.message || {};
  const info = m.extendedTextMessage?.contextInfo || m.imageMessage?.contextInfo || m.videoMessage?.contextInfo;
  const mentioned = info?.mentionedJid;
  if (Array.isArray(mentioned) && mentioned.length) return mentioned[0];
  const quoted = info?.participant;
  if (quoted) return quoted;
  const digits = String(arg || '').replace(/[^0-9]/g, '');
  if (digits.length >= 8) return `${digits}@s.whatsapp.net`;
  return null;
}

const keNomor = (jid) => String(jid || '').split('@')[0].split(':')[0];

export default {
  name: 'demote',
  alias: ['unadmin'],
  desc: 'Turunkan admin menjadi anggota biasa',
  category: 'group',
  cooldown: 3,
  ownerOnly: false, adminOnly: true, groupOnly: true, privateOnly: false,

  async run(ctx) {
    const { sock, chat, msg, args, reply } = ctx;
    const target = ambilTarget(msg, args[0]);
    if (!target) return reply('⬇️ Tag atau balas pesan target.\nContoh: *demote @nama*');

    try {
      await sock.groupParticipantsUpdate(chat, [target], 'demote');
      await sock.sendMessage(chat, { text: `⬇️ @${keNomor(target)} bukan admin lagi.`, mentions: [target] });
    } catch (e) {
      console.error('[demote]', e.message);
      await reply('❌ Gagal demote anggota. Pastikan bot juga admin grup.');
    }
  },
};
