// Dzikir — dzikir pagi & petang (arab + latin + arti)
// Cara pakai:
//   dzikir pagi
//   dzikir petang
import { readFileSync } from 'node:fs';

const DATA = JSON.parse(readFileSync(new URL('../../data/dzikir.json', import.meta.url), 'utf8'));
const MAKS_ITEM = 8;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
  name: 'dzikir',
  alias: ['dzikirpagi', 'dzikirpetang', 'wirid'],
  desc: 'Dzikir pagi & petang',
  category: 'muslim',
  cooldown: 5,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, text, reply } = ctx;
    const sesi = (text || '').trim().toLowerCase();

    if (sesi !== 'pagi' && sesi !== 'petang') {
      return reply(
        `📿 *Dzikir Pagi & Petang*\n\n` +
        `Ketik:\n` +
        `• *dzikir pagi* — dzikir waktu pagi\n` +
        `• *dzikir petang* — dzikir waktu petang`,
      );
    }

    try {
      const items = DATA[sesi].slice(0, MAKS_ITEM);
      const judul = sesi === 'pagi' ? '🌅 Dzikir Pagi' : '🌇 Dzikir Petang';

      await sock.sendMessage(
        chat,
        { text: `${judul}\n_Berikut ${items.length} dzikir yang masyhur dibaca:_\n\n_Ketik ulang dzikir ini setiap hari ya 🤲_` },
        { quoted: msg },
      );

      let i = 0;
      for (const d of items) {
        i += 1;
        const teks =
          `*${i}. ${d.nama}* (dibaca ${d.ulang})\n\n` +
          `${d.arab}\n\n` +
          `_Latin: ${d.latin}_\n\n` +
          `_Artinya: ${d.arti}_`;
        await sock.sendMessage(chat, { text: teks }, { quoted: msg });
        await sleep(700);
      }
    } catch (e) {
      console.error('[dzikir]', e.message);
      await reply('❌ Gagal memuat dzikir.');
    }
  },
};
