// Konfigurasi Habibi Bot ID — semua nilai dari environment, tanpa secret yang di-hardcode.
// Muat file .env bila ada (diabaikan bila tidak ada).
import 'dotenv/config';

const onlyDigits = (v) => String(v || '').replace(/\D/g, '');

const pairMethod = String(process.env.PAIR_METHOD || 'pairing').toLowerCase();
const PAIR_METHOD = pairMethod === 'qr' ? 'qr' : 'pairing';

export const config = {
  BOT_NAME: process.env.BOT_NAME || 'Habibi Bot ID',
  OWNER_NUMBER: onlyDigits(process.env.OWNER_NUMBER) || '6285181576338',
  DEVELOPER: process.env.DEVELOPER || 'Habibih Cloud ID',
  PREFIX: process.env.PREFIX || '.',
  // Nomor WhatsApp bot (format internasional tanpa +, mis. 6281234567890).
  // WAJIB diisi bila PAIR_METHOD=pairing.
  BOT_NUMBER: onlyDigits(process.env.BOT_NUMBER),
  PAIR_METHOD,
};

export default config;
