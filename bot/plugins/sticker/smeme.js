// Smeme — meme teks atas & bawah di atas gambar (contoh: smeme teks atas | teks bawah)
// Cara pakai: kirim gambar dengan caption, atau balas gambar.
// CATATAN: teks digambar via SVG oleh sharp — butuh font di sistem.
// Jika teks tidak muncul, install font, misal:  sudo apt install fonts-dejavu
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import sharp from 'sharp';

const UKURAN = 512;

const escapeXml = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function ambilQuoted(msg) {
  const m = msg.message || {};
  const ctxInfo =
    m.extendedTextMessage?.contextInfo ||
    m.imageMessage?.contextInfo ||
    m.stickerMessage?.contextInfo;
  return ctxInfo?.quotedMessage || null;
}

// Bungkus teks agar muat dalam lebar gambar
function bungkusTeks(teks, maksKarakter = 18) {
  const kata = String(teks || '').toUpperCase().split(/\s+/).filter(Boolean);
  const baris = [];
  let jalan = '';
  for (const k of kata) {
    if ((jalan + ' ' + k).trim().length > maksKarakter) {
      baris.push(jalan.trim());
      jalan = k;
    } else {
      jalan += ' ' + k;
    }
  }
  if (jalan.trim()) baris.push(jalan.trim());
  return baris.slice(0, 4); // batasi 4 baris
}

function svgMeme(atas, bawah) {
  const barisAtas = bungkusTeks(atas);
  const barisBawah = bungkusTeks(bawah);
  const tinggi = 34;
  const gaya = `font-family="sans-serif" font-size="34" font-weight="bold" fill="white" stroke="black" stroke-width="1.5" text-anchor="middle"`;

  let isi = '';
  barisAtas.forEach((b, i) => {
    isi += `<text x="256" y="${36 + i * tinggi}" ${gaya}>${escapeXml(b)}</text>`;
  });
  const totalBawah = barisBawah.length;
  barisBawah.forEach((b, i) => {
    isi += `<text x="256" y="${UKURAN - 20 - (totalBawah - 1 - i) * tinggi}" ${gaya}>${escapeXml(b)}</text>`;
  });

  return Buffer.from(
    `<svg width="${UKURAN}" height="${UKURAN}" xmlns="http://www.w3.org/2000/svg">${isi}</svg>`,
  );
}

export default {
  name: 'smeme',
  alias: ['meme'],
  desc: 'Bikin meme teks atas|bawah dari gambar (balas gambar)',
  category: 'sticker',
  cooldown: 3,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, text, reply } = ctx;

    let target = msg;
    const q = ambilQuoted(msg);
    if (q?.imageMessage) target = { ...msg, message: q };
    if (!target.message?.imageMessage) {
      return reply('🖼️ Balas sebuah gambar lalu ketik:\n*smeme teks atas | teks bawah*');
    }
    if (!text.includes('|')) {
      return reply('✍️ Format: *smeme teks atas | teks bawah*\nContoh: *smeme aku | ngoding terus*');
    }
    const [atas, bawah] = text.split('|').map((s) => s.trim());

    await reply('⏳ Membuat meme…');
    try {
      const buf = await downloadMediaMessage(target, 'buffer', {});
      if (!buf?.length) throw new Error('gagal mengunduh gambar');
      const meme = await sharp(buf)
        .resize(UKURAN, UKURAN, { fit: 'cover' })
        .composite([{ input: svgMeme(atas, bawah), top: 0, left: 0 }])
        .jpeg({ quality: 85 })
        .toBuffer();

      await sock.sendMessage(chat, { image: meme, caption: '😄' }, { quoted: msg });
    } catch (e) {
      console.error('[smeme]', e.message);
      await reply(`❌ Gagal bikin meme. _${String(e.message || 'coba lagi nanti').slice(0, 120)}_`);
    }
  },
};
