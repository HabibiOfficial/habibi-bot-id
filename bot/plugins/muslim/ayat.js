// Ayat — kirim 1 ayat acak dari Al-Qur'an beserta terjemahan (sumber: api.alquran.cloud)
// Cara pakai: ayat  atau  randomayat
import axios from 'axios';
import { readFileSync } from 'node:fs';

const DAFTAR = JSON.parse(readFileSync(new URL('../../data/surah.json', import.meta.url), 'utf8'));
const TOTAL_AYAT = DAFTAR.reduce((a, s) => a + s.ayat, 0); // 6236

export default {
  name: 'ayat',
  alias: ['randomayat'],
  desc: "Ayat Al-Qur'an acak + terjemahan",
  category: 'muslim',
  cooldown: 5,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, reply } = ctx;
    try {
      let sisa = Math.floor(Math.random() * TOTAL_AYAT) + 1;
      let surah = DAFTAR[0];
      for (const s of DAFTAR) {
        if (sisa <= s.ayat) { surah = s; break; }
        sisa -= s.ayat;
      }

      const res = await axios.get(
        `https://api.alquran.cloud/v1/ayah/${surah.nomor}:${sisa}/id.indonesian`,
        { timeout: 20000 },
      );
      const d = res.data?.data;
      if (!d?.text) throw new Error('data ayat tidak tersedia');

      const teks =
        `🎲 *Ayat Acak*\n\n` +
        `📖 QS. ${d.surah?.englishName || surah.nama} (${surah.nomor}) : ${d.numberInSurah}\n\n` +
        `${d.text}\n\n` +
        `_Artinya: ${d.translation}_`;

      await sock.sendMessage(chat, { text: teks }, { quoted: msg });
    } catch (e) {
      console.error('[ayat]', e.message);
      await reply(`❌ Gagal mengambil ayat acak. _${String(e.message || 'coba lagi nanti').slice(0, 120)}_`);
    }
  },
};
