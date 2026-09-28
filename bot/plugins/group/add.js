// Add — tambahkan nomor ke grup
// Cara pakai: add 6281234567890
// Khusus admin grup.
export default {
  name: 'add',
  alias: ['tambah'],
  desc: 'Tambahkan nomor ke grup',
  category: 'group',
  cooldown: 3,
  ownerOnly: false, adminOnly: true, groupOnly: true, privateOnly: false,

  async run(ctx) {
    const { sock, chat, args, reply } = ctx;
    const digits = String(args[0] || '').replace(/[^0-9]/g, '');
    if (digits.length < 8) {
      return reply('➕ Masukkan nomor yang valid.\nContoh: *add 6281234567890*');
    }
    try {
      const [hasil] = await sock.groupParticipantsUpdate(chat, [`${digits}@s.whatsapp.net`], 'add');
      const status = hasil?.status || 'unknown';
      await reply(
        `➕ ${digits}: *${status}*` +
        (status !== '200' ? '\n_Kemungkinan nomor tidak terdaftar / privasi ketat._' : ''),
      );
    } catch (e) {
      console.error('[add]', e.message);
      await reply('❌ Gagal menambahkan anggota. Pastikan bot juga admin grup.');
    }
  },
};
