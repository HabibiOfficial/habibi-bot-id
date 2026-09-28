// YouTube → MP3 — unduh audio dari YouTube (link atau judul lagu)
// Memakai binary yt-dlp SISTEM (lihat pasang.sh). Tanpa API publik.
// CATATAN: hormati ToS YouTube & hak cipta — gunakan untuk konten milik sendiri / bebas hak.
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { readFile, readdir, stat, rm, mkdir } from 'node:fs/promises';

const TIMEOUT = 120000; // 120 detik
const BATAS_UKURAN = 90 * 1024 * 1024; // 90 MB — batas aman kirim media WhatsApp
// Bypass challenge "Sign in to confirm you're not a bot" yang sering muncul
// dari IP datacenter/VPS: pakai player client Android yang jarang kena challenge.
const YT_BYPASS = ['--extractor-args', 'youtube:player_client=android'];

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

const formatDurasi = (d) => {
  if (!d && d !== 0) return '-';
  const m = Math.floor(d / 60);
  const s = Math.floor(d % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

// Cari video: URL langsung atau hasil pencarian ytsearch1
async function cariVideo(query) {
  if (/^https?:\/\//i.test(query)) {
    const out = await jalankan('yt-dlp', ['--dump-json', '--no-playlist', '--no-warnings', ...YT_BYPASS, query]);
    const info = JSON.parse(out.split('\n').find((l) => l.trim().startsWith('{')) || '{}');
    if (!info.id) throw new Error('video tidak ditemukan / tidak bisa dibaca');
    return {
      url: info.webpage_url || query,
      title: info.title || 'Audio YouTube',
      channel: info.uploader || info.channel || '-',
      durasi: formatDurasi(info.duration),
    };
  }
  const out = await jalankan('yt-dlp', ['--dump-json', '--no-playlist', '--no-warnings', ...YT_BYPASS, `ytsearch1:${query}`]);
  const info = JSON.parse(out.split('\n').find((l) => l.trim().startsWith('{')) || '{}');
  if (!info.id) throw new Error('video tidak ditemukan untuk pencarian itu');
  return {
    url: info.webpage_url,
    title: info.title || query,
    channel: info.uploader || info.channel || '-',
    durasi: formatDurasi(info.duration),
  };
}

async function unduhAudio(url) {
  const dir = path.join(tmpdir(), `hb-ytmp3-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  try {
    const pola = path.join(dir, 'hasil.%(ext)s');
    await jalankan('yt-dlp', ['-x', '--audio-format', 'mp3', '--audio-quality', '0', '--no-playlist', '--no-warnings', ...YT_BYPASS, '-o', pola, url]);
    const files = (await readdir(dir)).filter((f) => !f.startsWith('.'));
    if (!files.length) throw new Error('file hasil unduhan tidak ditemukan');
    const filePath = path.join(dir, files[0]);
    const { size } = await stat(filePath);
    if (size > BATAS_UKURAN) throw new Error(`file terlalu besar (${formatBytes(size)}). Batas aman ±90MB — coba lagu yang lebih pendek.`);
    return { filePath, size, dir };
  } catch (e) {
    await rm(dir, { recursive: true, force: true });
    throw e;
  }
}

export default {
  name: 'ytmp3',
  alias: ['ytaudio', 'yta'],
  desc: 'Unduh audio/MP3 dari YouTube (link atau judul lagu)',
  category: 'downloader',
  cooldown: 20,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, text, reply } = ctx;
    const query = (text || '').trim();
    if (!query) return reply('🎧 Contoh: *ytmp3 judika - aku yang tersakiti*');
    if (!(await cekYtDlp())) return reply('❌ Perintah *yt-dlp* belum terpasang di server. Minta owner menjalankan pasang.sh lalu coba lagi.');

    await reply('⏳ Sedang mengunduh audio, mohon tunggu…');
    let dir;
    try {
      const { url, title, channel, durasi } = await cariVideo(query);
      const hasil = await unduhAudio(url);
      dir = hasil.dir;

      await sock.sendMessage(
        chat,
        {
          audio: await readFile(hasil.filePath),
          mimetype: 'audio/mpeg',
          fileName: `${title.slice(0, 60)}.mp3`,
        },
        { quoted: msg },
      );
      await reply(`🎧 *${title}*\n👤 ${channel}\n⏱️ ${durasi}\n📦 ${formatBytes(hasil.size)}`);
    } catch (e) {
      console.error('[ytmp3]', e.message);
      await reply(`❌ Gagal mengunduh audio. _${String(e.message || '').slice(0, 180)}_`);
    } finally {
      if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  },
};
