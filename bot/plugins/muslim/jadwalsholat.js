// Jadwal Sholat — jadwal sholat harian per kota (sumber: api.myquran.com)
// Cara pakai: jadwalsholat <kota>  (contoh: jadwalsholat bandung)
// Tanpa argumen → default Jakarta
import axios from 'axios';
import { readFileSync } from 'node:fs';

const KOTA = JSON.parse(readFileSync(new URL('../../data/kota.json', import.meta.url), 'utf8'));

const ambilTanggal = () => {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1, day: d.getDate() };
};

const namaKotaBagus = (k) => {
  const khusus = {
    bandaaceh: 'Banda Aceh', bandarlampung: 'Bandar Lampung',
    padangsidimpuan: 'Padangsidimpuan', yogyakarta: 'Yogyakarta',
  };
  return khusus[k] || (k.charAt(0).toUpperCase() + k.slice(1));
};

export default {
  name: 'jadwalsholat',
  alias: ['sholat', 'jadwalshalat'],
  desc: 'Jadwal sholat harian per kota',
  category: 'muslim',
  cooldown: 5,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, text, reply } = ctx;
    const kata = (text || '').trim() || 'jakarta';

    try {
      const cari = await axios.get(
        `https://api.myquran.com/v2/sholat/kota/cari/${encodeURIComponent(kata)}`,
        { timeout: 15000 },
      );
      const daftar = cari.data?.data || [];
      if (!daftar.length) {
        // Saran: daftar kota yang dikenal bot (dari data lokal)
        const saran = Object.keys(KOTA).map(namaKotaBagus).join(', ');
        return reply(
          `❌ Kota *${kata}* tidak ditemukan di API jadwal.\n\n` +
          `Kota yang umum tersedia:\n${saran}\n\n` +
          `Contoh: *jadwalsholat bandung*`,
        );
      }

      const { id } = daftar[0];
      const { y, m, day } = ambilTanggal();
      const res = await axios.get(
        `https://api.myquran.com/v2/sholat/jadwal/${id}/${y}/${m}/${day}`,
        { timeout: 15000 },
      );
      const d = res.data?.data;
      if (!d?.jadwal) throw new Error('jadwal tidak tersedia');

      const s = d.jadwal;
      let teks =
        `🕌 *Jadwal Sholat*\n` +
        `📍 ${d.lokasi}, ${d.daerah}\n` +
        `📅 ${s.tanggal}\n\n` +
        `Imsak     : ${s.imsak}\n` +
        `Subuh     : ${s.subuh}\n` +
        `Terbit    : ${s.terbit}\n` +
        `Dhuha     : ${s.dhuha}\n` +
        `Dzuhur    : ${s.dzuhur}\n` +
        `Ashar     : ${s.ashar}\n` +
        `Maghrib   : ${s.maghrib}\n` +
        `Isya      : ${s.isya}`;

      if (daftar.length > 1) {
        const lain = daftar.slice(1, 6).map((k) => `• ${k.lokasi}`).join('\n');
        teks += `\n\n_Maksudmu salah satunya?_\n${lain}`;
      }

      await sock.sendMessage(chat, { text: teks }, { quoted: msg });
    } catch (e) {
      console.error('[jadwalsholat]', e.message);
      await reply(`❌ Gagal mengambil jadwal sholat. _${String(e.message || 'coba lagi nanti').slice(0, 120)}_`);
    }
  },
};
