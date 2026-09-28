// =====================================================
//  HABIBI BOT ID API — server.js
//  REST API: AI chat, downloader TikTok & YouTube,
//  info stiker + website dokumentasi.
//
//  Konfigurasi 100% via environment variable:
//    PORT        (default 3000)
//    API_KEY     (WAJIB — server menolak start kalau kosong)
//    AI_API_KEY  (opsional — key provider AI)
//    AI_API_URL  (opsional — base URL provider AI, mis. OpenAI-compatible)
//    YT_DLP_BIN  (default "yt-dlp" — path binary yt-dlp di sistem)
// =====================================================
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

// ---------------- konfigurasi ----------------
const PORT = Number(process.env.PORT) || 3000;
const API_KEY = String(process.env.API_KEY || '').trim();
const AI_API_KEY = String(process.env.AI_API_KEY || '').trim();
const AI_API_URL = String(process.env.AI_API_URL || '').replace(/\/+$/, '');
const YT_DLP_BIN = String(process.env.YT_DLP_BIN || 'yt-dlp').trim();

const NAMA_API = 'Habibi Bot ID API';
const VERSI_API = '1.0.0';

if (!API_KEY) {
  console.error(
    '\n❌ FATAL: environment variable API_KEY kosong.\n' +
      '   Set API_KEY dengan key acak yang aman, contoh:\n' +
      '     API_KEY=kunci-rahasiamu node server.js\n' +
      '   atau salin api/.env.example menjadi .env lalu isi.\n',
  );
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
// Percaya header X-Forwarded-* dari Cloudflare Tunnel agar req.protocol/host benar (https).
// Percaya 1 hop proxy (cukup untuk Cloudflare Tunnel) — tetap baca X-Forwarded-Proto
// untuk deteksi https, tanpa memicu warning permissive trust proxy dari rate limiter.
app.set('trust proxy', 1);
const waktuMulai = Date.now();

// ---------------- middleware ----------------
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Rate limit: 60 request per menit per IP, khusus /api/*
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      status: false,
      message:
        'Terlalu banyak permintaan dari IP ini. Batas 60 request per menit. Tunggu sebentar lalu coba lagi.',
    }),
});
app.use('/api/', limiter);

// Auth: header x-api-key harus sama dengan env API_KEY
function butuhKey(req, res, next) {
  const key = String(req.header('x-api-key') || '').trim();
  if (!key || key !== API_KEY) {
    return res
      .status(401)
      .json({ status: false, message: 'API key tidak valid. Sertakan header x-api-key yang benar.' });
  }
  next();
}

function isUrlHttp(s) {
  try {
    const u = new URL(String(s));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function err500(res, tag, e, pesan) {
  console.error(`[${tag}]`, e?.message || e);
  return res.status(502).json({ status: false, message: pesan });
}

// ---------------- daftar endpoint (dipakai /api/menu & website) ----------------
const DAFTAR_ENDPOINT = [
  {
    method: 'GET',
    path: '/api/status',
    auth: false,
    deskripsi: 'Cek status API: nama, versi, uptime, dan waktu server.',
    params: [],
    contoh: 'curl __BASE_URL__/api/status',
  },
  {
    method: 'GET',
    path: '/api/menu',
    auth: false,
    deskripsi: 'Daftar semua endpoint API beserta deskripsi dan parameternya.',
    params: [],
    contoh: 'curl __BASE_URL__/api/menu',
  },
  {
    method: 'POST',
    path: '/api/ai',
    auth: true,
    deskripsi:
      'Tanya jawab dengan AI (Bahasa Indonesia). Proxy ke provider AI yang dikonfigurasi via env AI_API_URL. ' +
      'Jika AI_API_URL belum diisi, endpoint ini menjawab 503.',
    params: [{ nama: 'text', tipe: 'body', wajib: true, contoh: 'Apa itu fotosintesis?' }],
    contoh:
      "curl -X POST __BASE_URL__/api/ai -H 'x-api-key: KEY-KAMU' -H 'Content-Type: application/json' -d '{\"text\":\"Halo, siapa kamu?\"}'",
  },
  {
    method: 'GET',
    path: '/api/download/tiktok',
    auth: true,
    deskripsi: 'Ambil direct URL video TikTok tanpa watermark beserta info video.',
    params: [{ nama: 'url', tipe: 'query', wajib: true, contoh: 'https://vt.tiktok.com/ZSxxxxxx/' }],
    contoh:
      "curl \"__BASE_URL__/api/download/tiktok?url=https://vt.tiktok.com/ZSxxxxxx/\" -H 'x-api-key: KEY-KAMU'",
  },
  {
    method: 'GET',
    path: '/api/download/ytmp3',
    auth: true,
    deskripsi:
      'Ambil info + direct URL audio (format audio terbaik, mis. m4a/webm) dari video YouTube via yt-dlp. ' +
      'Catatan: URL direct YouTube bersifat sementara dan bisa kedaluwarsa (biasanya beberapa jam).',
    params: [{ nama: 'url', tipe: 'query', wajib: true, contoh: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }],
    contoh:
      "curl \"__BASE_URL__/api/download/ytmp3?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ\" -H 'x-api-key: KEY-KAMU'",
  },
  {
    method: 'GET',
    path: '/api/download/ytmp4',
    auth: true,
    deskripsi:
      'Ambil info + direct URL video MP4 dari YouTube via yt-dlp. ' +
      'Catatan: URL direct YouTube bersifat sementara dan bisa kedaluwarsa (biasanya beberapa jam).',
    params: [{ nama: 'url', tipe: 'query', wajib: true, contoh: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }],
    contoh:
      "curl \"__BASE_URL__/api/download/ytmp4?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ\" -H 'x-api-key: KEY-KAMU'",
  },
  {
    method: 'GET',
    path: '/api/sticker/info',
    auth: false,
    deskripsi: 'Info fitur stiker bot: format yang didukung, batas ukuran, dan parameter pack/author.',
    params: [
      { nama: 'pack', tipe: 'query', wajib: false, contoh: 'Habibi Pack' },
      { nama: 'author', tipe: 'query', wajib: false, contoh: 'Habibih Cloud ID' },
    ],
    contoh: 'curl "__BASE_URL__/api/sticker/info?pack=Habibi%20Pack&author=Habibih%20Cloud%20ID"',
  },
  {
    method: 'GET',
    path: '/health',
    auth: false,
    deskripsi: 'Healthcheck tanpa auth — dipakai monitoring/uptime checker.',
    params: [],
    contoh: 'curl __BASE_URL__/health',
  },
];

// ---------------- endpoint publik ----------------

// Healthcheck (tanpa auth & tanpa rate limit khusus)
app.get('/health', (req, res) => {
  res.json({ status: true, message: 'ok' });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: true,
    nama: NAMA_API,
    versi: VERSI_API,
    uptime_detik: Math.floor((Date.now() - waktuMulai) / 1000),
    waktu_server: new Date().toISOString(),
  });
});

app.get('/api/menu', (req, res) => {
  // Base URL dinamis: "http://localhost:3000" saat lokal,
  // "https://cloud.habibi-api.web.id" saat diakses via Cloudflare Tunnel.
  const base = `${req.protocol}://${req.get('host')}`.replace(/\/$/, '');
  const endpoints = DAFTAR_ENDPOINT.map((e) => ({
    ...e,
    contoh: e.contoh.split('__BASE_URL__').join(base),
  }));
  res.json({ status: true, nama: NAMA_API, versi: VERSI_API, base_url: base, endpoints });
});

// Info stiker (statis — pembuatan stiker butuh sesi WhatsApp aktif)
app.get('/api/sticker/info', (req, res) => {
  const pack = String(req.query.pack || 'Habibi Bot').slice(0, 60);
  const author = String(req.query.author || 'Habibih Cloud ID').slice(0, 60);
  res.json({
    status: true,
    info: 'Pembuatan stiker WhatsApp membutuhkan sesi WhatsApp aktif, jadi stiker dibuat lewat bot-wa (perintah !sticker / !smeme), bukan via REST.',
    format_didukung: ['Gambar: JPG, PNG, WebP (maks ~512x512 px)', 'Animasi: video/GIF pendek (maks ~8 detik)'],
    batas_ukuran: 'Disarankan di bawah 1 MB per stiker agar terkirim cepat.',
    pack,
    author,
    catatan: 'Parameter ?pack= dan ?author= dipakai sebagai nama pack & pembuat stiker oleh bot-wa.',
  });
});

// ---------------- endpoint ber-key ----------------

// AI chat — proxy ke provider AI dari env (mis. OpenAI-compatible / Pollinations)
const AI_SYSTEM =
  'Kamu adalah asisten yang ramah dan membantu. Jawab dalam Bahasa Indonesia yang natural, ringkas, dan jelas.';

app.post('/api/ai', butuhKey, async (req, res) => {
  if (!AI_API_URL) {
    return res.status(503).json({
      status: false,
      message:
        'Layanan AI belum dikonfigurasi. Set environment variable AI_API_URL (dan AI_API_KEY jika provider butuh key), lalu restart server.',
    });
  }
  const text = String(req.body?.text || '').trim();
  if (!text) {
    return res.status(400).json({ status: false, message: 'Body JSON harus berisi "text". Contoh: {"text":"Halo"}' });
  }
  try {
    const prompt = `${AI_SYSTEM}\n\nPertanyaan: ${text}`;
    let jawaban;
    if (AI_API_KEY) {
      // Mode OpenAI-compatible: POST JSON dengan Bearer key
      const { data } = await axios.post(
        AI_API_URL,
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: AI_SYSTEM },
            { role: 'user', content: text },
          ],
          max_tokens: 2000,
        },
        {
          headers: { Authorization: `Bearer ${AI_API_KEY}`, 'Content-Type': 'application/json' },
          timeout: 90000,
        },
      );
      jawaban = String(data?.choices?.[0]?.message?.content || '').trim();
    } else {
      // Mode tanpa key ala Pollinations: GET <base>/<prompt-terencode>
      const { data } = await axios.get(AI_API_URL + '/' + encodeURIComponent(prompt), {
        timeout: 90000,
        params: { model: 'openai' },
        responseType: 'text',
      });
      jawaban = String(data || '').trim();
    }
    if (!jawaban) throw new Error('respon kosong dari provider AI');
    res.json({ status: true, reply: jawaban.slice(0, 4000) });
  } catch (e) {
    err500(res, 'api/ai', e, 'AI sedang sibuk atau provider tidak merespons. Tunggu sebentar lalu coba lagi.');
  }
});

// TikTok tanpa watermark — via tikwm (gratis, tanpa key)
app.get('/api/download/tiktok', butuhKey, async (req, res) => {
  const url = String(req.query.url || '').trim();
  if (!url || !isUrlHttp(url) || !/tiktok\.com/i.test(url)) {
    return res.status(400).json({ status: false, message: 'Parameter "url" harus berupa link TikTok yang valid (http/https).' });
  }
  try {
    const { data } = await axios.get('https://www.tikwm.com/api/?url=' + encodeURIComponent(url), { timeout: 30000 });
    const d = data?.data;
    const downloadUrl = d?.play || d?.hdplay || d?.wmplay || d?.download_url;
    if (!downloadUrl) throw new Error('link video tidak ditemukan di respon API');
    res.json({
      status: true,
      title: d?.title || 'Video TikTok',
      author: d?.author?.nickname || d?.author?.unique_id || '',
      duration: d?.duration ?? null,
      downloadUrl,
    });
  } catch (e) {
    err500(res, 'api/download/tiktok', e, 'Gagal mengambil video. Link mungkin privat/dihapus, atau layanan sedang down. Coba lagi nanti.');
  }
});

// ---- helper yt-dlp ----
function ytDlpAda() {
  return new Promise((resolve) => {
    execFile(YT_DLP_BIN, ['--version'], { timeout: 10000 }, (err) => resolve(!err));
  });
}

function ytDlpInfo(url, format) {
  return new Promise((resolve, reject) => {
    execFile(
      YT_DLP_BIN,
      ['--no-playlist', '--no-warnings', '--dump-single-json', '--skip-download', '-f', format, url],
      { timeout: 60000, maxBuffer: 16 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          const msg = String(stderr || err.message || '').slice(0, 300);
          return reject(new Error(msg || 'yt-dlp gagal'));
        }
        try {
          resolve(JSON.parse(stdout));
        } catch {
          reject(new Error('respon yt-dlp bukan JSON valid'));
        }
      },
    );
  });
}

async function unduhanYoutube(req, res, format, label) {
  const url = String(req.query.url || '').trim();
  if (!url) {
    return res.status(400).json({ status: false, message: 'Parameter "url" wajib diisi dengan link YouTube (http/https).' });
  }
  if (!isUrlHttp(url) || !/(youtube\.com|youtu\.be)/i.test(url)) {
    return res.status(400).json({ status: false, message: 'Parameter "url" harus berupa link YouTube yang valid (http/https).' });
  }
  if (!(await ytDlpAda())) {
    return res.status(503).json({
      status: false,
      message: `Binary yt-dlp tidak ditemukan di server ("${YT_DLP_BIN}"). Pasang yt-dlp di server lalu coba lagi.`,
    });
  }
  try {
    const info = await ytDlpInfo(url, format);
    const downloadUrl = info?.url;
    if (!downloadUrl) throw new Error('URL direct tidak ditemukan di hasil yt-dlp');
    res.json({
      status: true,
      title: info?.title || 'Media YouTube',
      duration: info?.duration ?? null,
      downloadUrl,
      catatan:
        'URL direct YouTube bersifat sementara dan bisa kedaluwarsa (biasanya dalam beberapa jam). Unduh segera setelah diterima.',
    });
  } catch (e) {
    err500(res, `api/download/${label}`, e, 'Gagal mengambil media. Video mungkin privat/dihapus atau dibatasi wilayah. Coba lagi nanti.');
  }
}

// YouTube → audio (format audio terbaik)
app.get('/api/download/ytmp3', butuhKey, (req, res) =>
  unduhanYoutube(req, res, 'bestaudio[ext=m4a]/bestaudio/best', 'ytmp3'),
);

// YouTube → video MP4
app.get('/api/download/ytmp4', butuhKey, (req, res) =>
  unduhanYoutube(req, res, 'best[ext=mp4]/best', 'ytmp4'),
);

// ---------------- website statis + 404 ----------------
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res) => {
  res.status(404).json({ status: false, message: 'Endpoint tidak ditemukan. Lihat daftar endpoint di GET /api/menu.' });
});

// ---------------- start ----------------
app.listen(PORT, () => {
  console.log(`🚀 ${NAMA_API} v${VERSI_API} jalan di http://localhost:${PORT}`);
  console.log(`📖 Dokumentasi: http://localhost:${PORT}/`);
  if (!AI_API_URL) console.log('⚠️  AI_API_URL kosong — endpoint POST /api/ai akan menjawab 503.');
});
