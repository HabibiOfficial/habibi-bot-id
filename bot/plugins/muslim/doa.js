// Doa — kumpulan doa harian (arab + latin + arti)
// Cara pakai:
//   doa       → tampilkan daftar doa
//   doa 3     → tampilkan isi doa nomor 3
import { readFileSync } from 'node:fs';

const DAFTAR = JSON.parse(readFileSync(new URL('../../data/doa.json', import.meta.url), 'utf8'));

export default {
  name: 'doa',
  alias: ['doaharian'],
  desc: 'Kumpulan doa harian (arab, latin, arti)',
  category: 'muslim',
  cooldown: 3,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, text, reply } = ctx;
    try {
      const arg = (text || '').trim();

      if (!arg) {
        const daftar = DAFTAR.map((d, i) => `*${i + 1}.* ${d.nama}`).join('\n');
        return sock.sendMessage(
          chat,
          { text: `🤲 *Kumpulan Doa Harian*\n\n${daftar}\n\n_Ketik *doa <nomor>* untuk melihat isinya_\n_Contoh: *doa 3*_` },
          { quoted: msg },
        );
      }

      const no = parseInt(arg, 10);
      if (!no || no < 1 || no > DAFTAR.length) {
        return reply(`❌ Nomor tidak valid. Pilih 1–${DAFTAR.length}.`);
      }

      const d = DAFTAR[no - 1];
      const teks =
        `🤲 *${d.nama}*\n\n` +
        `${d.arab}\n\n` +
        `_Latin: ${d.latin}_\n\n` +
        `_Artinya: ${d.arti}_`;

      await sock.sendMessage(chat, { text: teks }, { quoted: msg });
    } catch (e) {
      console.error('[doa]', e.message);
      await reply('❌ Gagal memuat doa.');
    }
  },
};
