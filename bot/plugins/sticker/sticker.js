// Sticker — ubah gambar/video menjadi stiker WhatsApp
// Cara pakai: kirim/forward gambar atau video dengan caption "sticker",
//             atau balas gambar/video lalu ketik "sticker"
// Video dipotong maks ~8 detik dulu (pakai ffmpeg sistem, jika tersedia).
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Ambil pesan yang dikutip (quoted message), kalau ada
function ambilQuoted(msg) {
  const m = msg.message || {};
  const ctxInfo =
    m.extendedTextMessage?.contextInfo ||
    m.imageMessage?.contextInfo ||
    m.videoMessage?.contextInfo ||
    m.stickerMessage?.contextInfo ||
    m.documentMessage?.contextInfo;
  return ctxInfo?.quotedMessage || null;
}

function jalankan(cmd, args, timeout = 60000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr?.trim() || err.message));
      resolve(stdout);
    });
  });
}

// Potong video kepanjangan (stiker WA ideal ≤ 10 detik)
async function potongVideo(masuk, keluar, detik = 8) {
  await jalankan('ffmpeg', ['-y', '-i', masuk, '-t', String(detik), '-c', 'copy', keluar]);
}

export default {
  name: 'sticker',
  alias: ['s', 'stiker'],
  desc: 'Ubah gambar/video menjadi stiker (kirim media + caption, atau balas media)',
  category: 'sticker',
  cooldown: 3,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, reply } = ctx;

    // Ambil pesan media: dari pesan saat ini atau dari pesan yang dibalas
    let target = msg;
    const q = ambilQuoted(msg);
    if (q && (q.imageMessage || q.videoMessage)) {
      target = { ...msg, message: q };
    }
    const tipe = target.message?.imageMessage ? 'gambar' : target.message?.videoMessage ? 'video' : null;
    if (!tipe) {
      return reply('🖼️ Kirim *gambar/video* dengan caption *sticker*, atau balas media lalu ketik perintah ini.');
    }

    await reply('⏳ Membuat stiker…');
    try {
      const buf = await downloadMediaMessage(target, 'buffer', {});
      if (!buf?.length) throw new Error('gagal mengunduh media');

      let bahan = buf;
      // Video: potong dulu agar ringan & tidak kepanjangan
      if (tipe === 'video') {
        const tmp = tmpdir();
        const masuk = path.join(tmp, `st-${randomUUID()}.mp4`);
        const keluar = path.join(tmp, `st-${randomUUID()}-cut.mp4`);
        try {
          await writeFile(masuk, buf);
          await potongVideo(masuk, keluar);
          bahan = await readFile(keluar);
        } catch (e) {
          console.warn('[sticker] gagal potong video, pakai aslinya:', e.message);
        } finally {
          await rm(masuk, { force: true }).catch(() => {});
          await rm(keluar, { force: true }).catch(() => {});
        }
      }

      const stiker = new Sticker(bahan, {
        pack: 'Habibi Bot ID',
        author: 'Habibi Bot',
        type: StickerTypes.FULL,
        quality: 60,
      });
      await sock.sendMessage(chat, { sticker: await stiker.toBuffer() }, { quoted: msg });
    } catch (e) {
      console.error('[sticker]', e.message);
      await reply(`❌ Gagal bikin stiker. _${String(e.message || 'coba lagi nanti').slice(0, 120)}_`);
    }
  },
};
