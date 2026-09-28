// Niat Sholat — bacaan niat sholat fardhu & sunnah (arab + latin + arti)
// Cara pakai:
//   niat          → daftar niat
//   niat subuh    → tampilkan niat sholat subuh
import { readFileSync } from 'node:fs';

const DAFTAR = JSON.parse(readFileSync(new URL('../../data/niat.json', import.meta.url), 'utf8'));

// Normalisasi istilah umum yang diketik user → kunci data
const ALIAS = {
  magrib: 'maghrib',
  shubuh: 'subuh', shubuuh: 'subuh',
  lohor: 'dzuhur', luhur: 'dzuhur', luhurr: 'dzuhur', zuhur: 'dzuhur', dhuhur: 'dzuhur', dzuhurr: 'dzuhur',
  asar: 'ashar', asharrr: 'ashar',
  isa: 'isya', isyaa: 'isya',
  tahajjud: 'tahajud', tahajut: 'tahajud',
  tarawihh: 'tarawih', taraweh: 'tarawih',
};

export default {
  name: 'niat',
  alias: ['niatsholat', 'niatshalat'],
  desc: 'Bacaan niat sholat (fardhu & sunnah)',
  category: 'muslim',
  cooldown: 3,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, text, reply } = ctx;
    try {
      const arg = (text || '').trim().toLowerCase();

      if (!arg) {
        const daftar = DAFTAR.map((d) => `• ${d.sholat}`).join('\n');
        return sock.sendMessage(
          chat,
          { text: `🕌 *Niat Sholat*\n\n${daftar}\n\n_Ketik *niat <nama>* untuk melihat bacaannya_\n_Contoh: *niat subuh*_` },
          { quoted: msg },
        );
      }

      // Normalisasi: buang kata "sholat/shalat/solat" biar "niat sholat magrib" tetap ketemu
      let kunci = arg.replace(/\b(niat|sholat|shalat|solat|sholad)\b/gi, ' ').replace(/\s+/g, ' ').trim();
      kunci = ALIAS[kunci] || kunci;

      const d = DAFTAR.find((x) => x.sholat.toLowerCase() === kunci)
        || DAFTAR.find((x) => x.sholat.toLowerCase().includes(kunci))
        || DAFTAR.find((x) => kunci.includes(x.sholat.toLowerCase()));
      if (!d) {
        return reply(`❌ Niat *${arg}* tidak ditemukan.\nKetik *niat* untuk melihat daftar.`);
      }

      const teks =
        `🕌 *Niat Sholat ${d.sholat}*\n\n` +
        `${d.arab}\n\n` +
        `_Latin: ${d.latin}_\n\n` +
        `_Artinya: ${d.arti}_`;

      await sock.sendMessage(chat, { text: teks }, { quoted: msg });
    } catch (e) {
      console.error('[niatsholat]', e.message);
      await reply('❌ Gagal memuat niat sholat.');
    }
  },
};
