// Asmaul Husna — 99 nama Allah (arab + latin + arti)
// Cara pakai:
//   asmaulhusna      → tampilkan 99 nama (2 pesan)
//   asmaulhusna 5    → detail nama nomor 5
import { readFileSync } from 'node:fs';

const DAFTAR = JSON.parse(readFileSync(new URL('../../data/asmaulhusna.json', import.meta.url), 'utf8'));

export default {
  name: 'asmaulhusna',
  alias: ['asma', 'asmaulhusna99'],
  desc: '99 Asmaul Husna (arab, latin, arti)',
  category: 'muslim',
  cooldown: 5,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, text, reply } = ctx;
    try {
      const arg = (text || '').trim();

      if (!arg) {
        const baris = DAFTAR.map((d) => `${d.nomor}. ${d.latin}`);
        const tengah = 50;
        await sock.sendMessage(
          chat,
          { text: `✨ *Asmaul Husna (1–${tengah})*\n\n${baris.slice(0, tengah).join('\n')}\n\n_Ketik *asmaulhusna <nomor>* untuk detail_` },
          { quoted: msg },
        );
        await sock.sendMessage(
          chat,
          { text: `✨ *Asmaul Husna (${tengah + 1}–${baris.length})*\n\n${baris.slice(tengah).join('\n')}` },
          { quoted: msg },
        );
        return;
      }

      const no = parseInt(arg, 10);
      if (!no || no < 1 || no > DAFTAR.length) {
        return reply(`❌ Nomor tidak valid. Pilih 1–${DAFTAR.length}.`);
      }

      const d = DAFTAR[no - 1];
      const teks =
        `✨ *${d.nomor}. ${d.latin}*\n\n` +
        `${d.arab}\n\n` +
        `_Artinya: ${d.arti}_`;

      await sock.sendMessage(chat, { text: teks }, { quoted: msg });
    } catch (e) {
      console.error('[asmaulhusna]', e.message);
      await reply('❌ Gagal memuat Asmaul Husna.');
    }
  },
};
