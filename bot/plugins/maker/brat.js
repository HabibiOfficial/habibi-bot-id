// Brat — bikin stiker meme "brat" (ala cover album Charli XCX) dari teks
// Cara pakai: brat <teks>
// Contoh: brat habibi bot
// Generate LOKAL pakai sharp (tanpa API) → fallback ke API publik jika gagal
import axios from 'axios';
import sharp from 'sharp';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';

const WARNA_BG = '#FFFFFF'; // background putih (sesuai pilihan user; '#89CC04' untuk hijau brat klasik)
const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Bungkus teks jadi beberapa baris (maks ~10 karakter per baris)
function bungkus(teks, maks = 10) {
  const baris = [];
  let kini = '';
  for (const kata of teks.split(/\s+/)) {
    const t = kini ? `${kini} ${kata}` : kata;
    if (t.length > maks && kini) {
      baris.push(kini);
      kini = kata;
    } else {
      kini = t;
    }
  }
  if (kini) baris.push(kini);
  return baris.slice(0, 5);
}

// Render gambar brat lokal: background putih + teks hitam blur khas
async function bratLokal(teks) {
  const W = 512;
  const H = 512;
  const baris = bungkus(teks);
  const tspans = baris
    .map((b, i) => `<tspan x="50%" dy="${i === 0 ? '0' : '1.15em'}">${escapeXml(b)}</tspan>`)
    .join('');
  // Offset vertikal agar blok teks tetap di tengah
  const yTengah = H / 2 - (baris.length - 1) * 41;
  const svg =
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="100%" height="100%" fill="${WARNA_BG}"/>` +
    `<text x="50%" y="${yTengah}" font-family="Arial, 'DejaVu Sans', sans-serif" ` +
    `font-size="72" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="black">${tspans}</text>` +
    `</svg>`;
  return sharp(Buffer.from(svg)).blur(1.1).png().toBuffer();
}

// Fallback: API publik (background putih)
async function bratApi(teks) {
  const { data } = await axios.get(
    `https://aqul-brat.hf.space?text=${encodeURIComponent(teks)}`,
    { responseType: 'arraybuffer', timeout: 30000 },
  );
  if (!data?.length) throw new Error('API brat tidak merespon');
  return Buffer.from(data);
}

export default {
  name: 'brat',
  alias: ['bratsticker'],
  desc: 'Bikin stiker brat dari teks (background putih)',
  category: 'maker',
  cooldown: 5,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, text, reply } = ctx;
    const input = (text || '').trim();
    if (!input) {
      return reply('🟩 *Brat Sticker*\n\nContoh: *brat habibi bot*');
    }
    if (input.length > 60) return reply('❌ Teks maksimal 60 karakter.');

    await reply('⏳ Membuat stiker brat…');
    try {
      let gambar;
      try {
        gambar = await bratLokal(input);
      } catch (e) {
        console.error('[brat] lokal gagal, coba API:', e.message);
        gambar = await bratApi(input);
      }

      const stiker = new Sticker(gambar, {
        pack: 'Habibi Bot ID',
        author: 'Habibi Bot',
        type: StickerTypes.FULL,
        quality: 80,
      });

      await sock.sendMessage(chat, { sticker: await stiker.toBuffer() }, { quoted: msg });
    } catch (e) {
      console.error('[brat]', e.message);
      await reply(`❌ Gagal bikin brat. _${String(e.message || 'coba lagi nanti').slice(0, 120)}_`);
    }
  },
};
