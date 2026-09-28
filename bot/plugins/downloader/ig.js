// Instagram downloader — unduh video/foto dari postingan Instagram
// Memakai binary yt-dlp SISTEM (lihat pasang.sh). Reels & video feed didukung.
// CATATAN: postingan privat / yang butuh login tidak bisa diunduh.
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { readFile, readdir, stat, rm, mkdir } from 'node:fs/promises';

const TIMEOUT = 120000; // 120 detik
const BATAS_UKURAN = 90 * 1024 * 1024; // 90 MB — batas aman kirim media WhatsApp
const EKSTENSI_VIDEO = new Set(['.mp4', '.mkv', '.webm', '.mov']);
const EKSTENSI_GAMBAR = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function jalankan(cmd, args, timeout = TIMEOUT) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr?.trim() || err.message));
      resolve(stdout);
    });
  });
}

let ytDlpOk = null;
async function cekYtDlp() {
  if (ytDlpOk === null) {
    try { await jalankan('yt-dlp', ['--version'], 15000); ytDlpOk = true; }
    catch { ytDlpOk = false; }
  }
  return ytDlpOk;
}

const formatBytes = (b) => {
  if (!b && b !== 0) return '-';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return `${b.toFixed(1)} ${u[i]}`;
};

async function unduh(url) {
  const dir = path.join(tmpdir(), `hb-ig-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  try {
    const pola = path.join(dir, 'hasil.%(ext)s');
    await jalankan('yt-dlp', ['--no-playlist', '--no-warnings', '-o', pola, url]);
    const files = (await readdir(dir)).filter((f) => !f.startsWith('.'));
    if (!files.length) throw new Error('file hasil unduhan tidak ditemukan');
    const filePath = path.join(dir, files[0]);
    const { size } = await stat(filePath);
    if (size > BATAS_UKURAN) throw new Error(`file terlalu besar (${formatBytes(size)}). Batas aman ±90MB.`);
    return { filePath, size, ext: path.extname(files[0]).toLowerCase(), dir };
  } catch (e) {
    await rm(dir, { recursive: true, force: true });
    throw e;
  }
}

export default {
  name: 'ig',
  alias: ['instagram', 'igdl', 'igreels'],
  desc: 'Unduh video/foto dari Instagram (reels, feed)',
  category: 'downloader',
  cooldown: 10,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, text, reply } = ctx;
    const url = (text || '').split(/\s+/)[0];
    if (!url || !/^https?:\/\//i.test(url) || !/instagram\.com/i.test(url)) {
      return reply('🔗 Kirim link Instagram.\nContoh: *ig https://www.instagram.com/reel/xxxx/*');
    }
    if (!(await cekYtDlp())) return reply('❌ Perintah *yt-dlp* belum terpasang di server. Minta owner menjalankan pasang.sh lalu coba lagi.');

    await reply('⏳ Sedang mengunduh dari Instagram, mohon tunggu…');
    let dir;
    try {
      const hasil = await unduh(url);
      dir = hasil.dir;
      const media = await readFile(hasil.filePath);
      const caption = `📸 *Media Instagram*\n📦 ${formatBytes(hasil.size)}\n🔗 ${url}`;

      if (EKSTENSI_GAMBAR.has(hasil.ext)) {
        await sock.sendMessage(chat, { image: media, caption }, { quoted: msg });
      } else if (EKSTENSI_VIDEO.has(hasil.ext)) {
        await sock.sendMessage(chat, { video: media, caption, mimetype: 'video/mp4' }, { quoted: msg });
      } else {
        // Format tak dikenal — kirim sebagai dokumen agar tidak hilang
        await sock.sendMessage(
          chat,
          { document: media, fileName: `instagram${hasil.ext || '.bin'}`, caption },
          { quoted: msg },
        );
      }
    } catch (e) {
      console.error('[ig]', e.message);
      await reply(
        '❌ Gagal mengunduh dari Instagram. _Postingan privat atau butuh login tidak didukung._\n' +
        `_${String(e.message || '').slice(0, 150)}_`,
      );
    } finally {
      if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  },
};
