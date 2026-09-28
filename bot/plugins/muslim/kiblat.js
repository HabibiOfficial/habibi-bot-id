// Kiblat — hitung arah kiblat dari suatu kota (perhitungan lokal, tanpa API)
// Cara pakai: kiblat <kota>  (contoh: kiblat sipirok)
// Tanpa argumen → default Jakarta
import { readFileSync } from 'node:fs';

const KOTA = JSON.parse(readFileSync(new URL('../../data/kota.json', import.meta.url), 'utf8'));

// Koordinat Ka'bah, Masjidil Haram
const KABAH = { lat: 21.4225, lng: 39.8262 };

const NAMA_KHUSUS = {
  bandaaceh: 'Banda Aceh',
  bandarlampung: 'Bandar Lampung',
  padangsidimpuan: 'Padangsidimpuan',
  yogyakarta: 'Yogyakarta',
};

const namaKota = (k) => NAMA_KHUSUS[k] || (k.charAt(0).toUpperCase() + k.slice(1));

const keRad = (d) => (d * Math.PI) / 180;
const keDeg = (r) => (r * 180) / Math.PI;

// Bearing (derajat dari utara) dari titik 1 ke titik 2
function hitungBearing(lat1, lng1, lat2, lng2) {
  const dLng = keRad(lng2 - lng1);
  const y = Math.sin(dLng);
  const x = Math.cos(keRad(lat1)) * Math.tan(keRad(lat2))
    - Math.sin(keRad(lat1)) * Math.cos(dLng);
  return (keDeg(Math.atan2(y, x)) + 360) % 360;
}

function arahMataAngin(derajat) {
  const mata = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'];
  return mata[Math.round(derajat / 45) % 8];
}

export default {
  name: 'kiblat',
  alias: ['arahkiblat', 'qibla'],
  desc: 'Arah kiblat dari kotamu',
  category: 'muslim',
  cooldown: 5,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, text, reply } = ctx;
    const arg = (text || '').trim();
    const kunci = (arg.toLowerCase().replace(/\s+/g, '') || 'jakarta');

    try {
      if (!KOTA[kunci]) {
        const daftar = Object.keys(KOTA).map(namaKota).join(', ');
        return reply(
          `❌ Kota *${arg || kunci}* belum ada di data.\n\n` +
          `Kota tersedia:\n${daftar}\n\n` +
          `Contoh: *kiblat sipirok*`,
        );
      }

      const [lat, lng] = KOTA[kunci];
      const bearing = hitungBearing(lat, lng, KABAH.lat, KABAH.lng);
      const arah = arahMataAngin(bearing);

      const teks =
        `🧭 *Arah Kiblat*\n` +
        `📍 ${namaKota(kunci)}\n\n` +
        `*${bearing.toFixed(1)}°* dari arah utara\n` +
        `Arah: *${arah}*\n\n` +
        `_Hadapkan badan ke arah ${arah} (${bearing.toFixed(0)}°) saat sholat._`;

      await sock.sendMessage(chat, { text: teks }, { quoted: msg });
    } catch (e) {
      console.error('[kiblat]', e.message);
      await reply('❌ Gagal menghitung arah kiblat.');
    }
  },
};
