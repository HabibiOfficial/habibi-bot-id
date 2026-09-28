// Murottal — kirim audio murottal full 1 surah (Mishary Rashid Alafasy)
// Cara pakai: murrotal 112   (atau murottal)
import { readFileSync } from 'node:fs';

const DAFTAR = JSON.parse(readFileSync(new URL('../../data/surah.json', import.meta.url), 'utf8'));

export default {
  name: 'murrotal',
  alias: ['murottal', 'murotal'],
  desc: 'Audio murottal full surah (Mishary Rashid Alafasy)',
  category: 'muslim',
  cooldown: 10,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, text, reply } = ctx;
    const n = parseInt((text || '').trim(), 10);

    if (!n || n < 1 || n > 114) {
      return reply(
        `🎧 *Murottal Al-Qur'an*\n\n` +
        `Ketik: *murrotal <nomor surah>*\n` +
        `Contoh: *murrotal 112*\n\n` +
        `_Qari: Mishary Rashid Alafasy_`,
      );
    }

    try {
      const s = DAFTAR[n - 1];
      const kode = String(n).padStart(3, '0');
      const url = `https://server8.mp3quran.net/afs/${kode}.mp3`;

      await sock.sendMessage(
        chat,
        { text: `🎧 *Murottal QS. ${s.nama}* (${n})\n_${s.arti} — ${s.ayat} ayat_\n_Qari: Mishary Rashid Alafasy_\n\n_Mengirim audio, mohon tunggu…_` },
        { quoted: msg },
      );
      await sock.sendMessage(
        chat,
        { audio: { url }, mimetype: 'audio/mpeg', fileName: `QS-${s.nama}.mp3` },
        { quoted: msg },
      );
    } catch (e) {
      console.error('[murrotal]', e.message);
      await reply(`❌ Gagal mengirim murottal. _${String(e.message || 'coba lagi nanti').slice(0, 120)}_`);
    }
  },
};
