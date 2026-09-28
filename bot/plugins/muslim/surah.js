// Surah — tampilkan ayat Al-Qur'an beserta terjemahan (sumber: api.alquran.cloud)
// Cara pakai:
//   surah 112        → tampilkan surah (maks 10 ayat pertama bila surah panjang)
//   surah 112:1-3    → tampilkan rentang ayat tertentu
//   surah 2:255      → satu ayat tertentu
import axios from 'axios';

const BATAS_AYAT = 10;

export default {
  name: 'surah',
  alias: ['surat', 'qs'],
  desc: "Tampilkan ayat Al-Qur'an + terjemahan",
  category: 'muslim',
  cooldown: 5,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, text, reply } = ctx;
    const arg = (text || '').trim();

    const m = arg.match(/^(\d{1,3})(?::(\d{1,3})(?:-(\d{1,3}))?)?$/);
    if (!m) {
      return reply(
        `📖 *Al-Qur'an*\n\n` +
        `Contoh:\n` +
        `• *surah 112* — tampilkan surah\n` +
        `• *surah 112:1-3* — rentang ayat\n` +
        `• *listsurah* — daftar 114 surah`,
      );
    }

    const noSurah = parseInt(m[1], 10);
    if (noSurah < 1 || noSurah > 114) return reply('❌ Nomor surah harus 1–114.');

    let dari = m[2] ? parseInt(m[2], 10) : null;
    let sampai = m[3] ? parseInt(m[3], 10) : dari;
    if (dari && sampai && dari > sampai) [dari, sampai] = [sampai, dari];

    try {
      const res = await axios.get(
        `https://api.alquran.cloud/v1/surah/${noSurah}/id.indonesian`,
        { timeout: 20000 },
      );
      const d = res.data?.data;
      if (!d?.ayahs?.length) throw new Error('data surah tidak tersedia');

      let ayats = d.ayahs;
      if (dari) {
        ayats = ayats.filter((a) => a.numberInSurah >= dari && a.numberInSurah <= sampai);
        if (!ayats.length) return reply(`❌ Rentang ayat tidak valid untuk surah ini (1–${d.numberOfAyahs}).`);
      }

      let catatan = '';
      if (!dari && ayats.length > 20) {
        ayats = ayats.slice(0, BATAS_AYAT);
        catatan = `\n\n_Menampilkan 10 ayat pertama dari ${d.numberOfAyahs} ayat. Gunakan *surah ${noSurah}:11-20* untuk lanjut._`;
      }

      const rentang = dari ? ` : ${dari}${sampai > dari ? `-${sampai}` : ''}` : '';
      let teks = `📖 *QS. ${d.englishName} (${noSurah})${rentang}*\n_${d.englishNameTranslation} — ${d.numberOfAyahs} ayat_\n`;

      for (const a of ayats) {
        teks += `\n*Ayat ${a.numberInSurah}*\n${a.text}\n_Artinya: ${a.translation}_\n`;
      }
      teks += catatan;

      await sock.sendMessage(chat, { text: teks.trim() }, { quoted: msg });
    } catch (e) {
      console.error('[surah]', e.message);
      await reply(`❌ Gagal mengambil surah. _${String(e.message || 'coba lagi nanti').slice(0, 120)}_`);
    }
  },
};
