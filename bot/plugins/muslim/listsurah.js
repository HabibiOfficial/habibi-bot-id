// ListSurah — daftar 114 surah Al-Qur'an (data lokal)
// Cara pakai: listsurah
import { readFileSync } from 'node:fs';

const DAFTAR = JSON.parse(readFileSync(new URL('../../data/surah.json', import.meta.url), 'utf8'));

export default {
  name: 'listsurah',
  alias: ['daftarsurah'],
  desc: "Daftar 114 surah Al-Qur'an",
  category: 'muslim',
  cooldown: 5,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, reply } = ctx;
    try {
      const baris = DAFTAR.map((s) => `${s.nomor}. ${s.nama} (${s.arti}) — ${s.ayat} ayat`);
      const tengah = Math.ceil(baris.length / 2);

      await sock.sendMessage(
        chat,
        { text: `📚 *Daftar Surah Al-Qur'an (1–${tengah})*\n\n${baris.slice(0, tengah).join('\n')}` },
        { quoted: msg },
      );
      await sock.sendMessage(
        chat,
        { text: `📚 *Daftar Surah Al-Qur'an (${tengah + 1}–${baris.length})*\n\n${baris.slice(tengah).join('\n')}` },
        { quoted: msg },
      );
    } catch (e) {
      console.error('[listsurah]', e.message);
      await reply('❌ Gagal memuat daftar surah.');
    }
  },
};
