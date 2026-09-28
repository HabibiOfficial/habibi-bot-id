// Ayat Kursi — QS. Al-Baqarah ayat 255 beserta terjemahan (sumber: api.alquran.cloud)
// Cara pakai: ayatkursi
import axios from 'axios';

export default {
  name: 'ayatkursi',
  alias: ['kursi'],
  desc: 'Ayat Kursi (QS. Al-Baqarah : 255) + terjemahan',
  category: 'muslim',
  cooldown: 5,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, reply } = ctx;
    try {
      const res = await axios.get(
        'https://api.alquran.cloud/v1/ayah/2:255/id.indonesian',
        { timeout: 20000 },
      );
      const d = res.data?.data;
      if (!d?.text) throw new Error('data ayat tidak tersedia');

      const teks =
        `🤲 *Ayat Kursi*\n` +
        `📖 QS. Al-Baqarah : 255\n\n` +
        `${d.text}\n\n` +
        `_Artinya: ${d.translation}_`;

      await sock.sendMessage(chat, { text: teks }, { quoted: msg });
    } catch (e) {
      console.error('[ayatkursi]', e.message);
      await reply(`❌ Gagal mengambil Ayat Kursi. _${String(e.message || 'coba lagi nanti').slice(0, 120)}_`);
    }
  },
};
