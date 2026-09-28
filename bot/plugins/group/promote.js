// Promote — jadikan anggota sebagai admin grup
// Cara pakai: promote @tag  |  balas pesan target lalu ketik promote
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
  name: 'promote',
  alias: ['admin'],
  desc: 'Jadikan anggota sebagai admin grup',
  category: 'group',
  cooldown: 3,
  ownerOnly: false, adminOnly: true, groupOnly: true, privateOnly: false,

  async run(ctx) {
    const { sock, chat, msg, args, reply } = ctx;
    const target = ambilTarget(msg, args[0]);
    if (!target) return reply('⬆️ Tag atau balas pesan target.\nContoh: *promote @nama*');

    try {
      await sock.groupParticipantsUpdate(chat, [target], 'promote');
      await sock.sendMessage(chat, { text: `⬆️ @${keNomor(target)} sekarang admin grup.`, mentions: [target] });
    } catch (e) {
      console.error('[promote]', e.message);
      await reply('❌ Gagal promote anggota. Pastikan bot juga admin grup.');
    }
  },
};
