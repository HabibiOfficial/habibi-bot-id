// Tahlil — rangkaian bacaan tahlil (dikirim berurutan per bagian)
// Cara pakai: tahlil
import { readFileSync } from 'node:fs';

const DATA = JSON.parse(readFileSync(new URL('../../data/tahlil.json', import.meta.url), 'utf8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
  name: 'tahlil',
  alias: ['tahlilan'],
  desc: 'Rangkaian bacaan tahlil',
  category: 'muslim',
  cooldown: 8,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, reply } = ctx;
    try {
      await sock.sendMessage(
        chat,
        { text: '📿 *Rangkaian Tahlil*\n_Berikut urutan bacaan tahlil yang masyhur. Baca setiap bagian dengan khusyuk 🤲_' },
        { quoted: msg },
      );

      let i = 0;
      for (const b of DATA) {
        i += 1;
        const teks =
          `*Bagian ${i}: ${b.judul}* (dibaca ${b.ulang})\n\n` +
          `${b.arab}\n\n` +
          `_Latin: ${b.latin}_\n\n` +
          `_Artinya: ${b.arti}_`;
        await sock.sendMessage(chat, { text: teks }, { quoted: msg });
        await sleep(700);
      }

      await sock.sendMessage(
        chat,
        { text: '🤲 *Tahlil selesai.*\n_Semoga bacaan kita diterima Allah SWT dan pahalanya sampai kepada yang dituju. Aamiin._' },
        { quoted: msg },
      );
    } catch (e) {
      console.error('[tahlil]', e.message);
      await reply('❌ Gagal memuat rangkaian tahlil.');
    }
  },
};
