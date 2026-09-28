# Laporan Testing — Habibi Bot ID

Tanggal: 2026-09-28. Semua tes dijalankan di sandbox Linux (Node 20+).

## 1. Sintaks
- `node --check` untuk **seluruh** file JS di `bot/` dan `api/` (di luar `node_modules`): **SEMUA OK**
- `bash -n scripts/pasang.sh` dan `bash -n scripts/update.sh`: **OK**

## 2. Bot (`bot/`)
| Tes | Hasil |
|---|---|
| Boot tanpa `BOT_NUMBER` | ✅ Exit 1 graceful + pesan Indonesia jelas (tanpa stack trace) |
| Loader: 38 plugin | ✅ Semua valid, 0 warning; kategori: ai 1, downloader 9, group 5, main 3, maker 2, muslim 12, sticker 2, tools 4 |
| Duplikat command/alias | ✅ Tidak ada |
| Kontrak ctx (`sock, msg, command, args, text, sender, senderNumber, chat, isGroup, isOwner, reply, helpers`) | ✅ Cocok antara core & plugin |
| `PAIR_METHOD=code` (ditulis pasang.sh) | ✅ Jatuh ke mode `pairing` (default aman di config.js) |

## 3. Data & fitur kritis
| Tes | Hasil |
|---|---|
| `surah.json`: total ayat | ✅ 6236 |
| Surah #75 Al-Qiyamah | ✅ 40 ayat |
| `asmaulhusna.json` #98 / #99 | ✅ Ar-Rasyid / **As-Shabur** |
| `.brat` render lokal | ✅ PNG 512×512, pixel pojok RGB 255,255,255 (**putih**), → WebP valid (magic RIFF, 3752 bytes) |
| `pin.js` terima `pin.it` | ✅ |
| `niatsholat.js` normalisasi | ✅ magrib/shubuh/lohor/ashar → kunci baku |
| Helpers tombol | ✅ Native flow (`quick_reply`/`single_select` via `relayMessage`); tidak ada `buttonsMessage` legacy |

## 4. REST API (`api/`, `API_KEY=test123`)
| Tes | Hasil |
|---|---|
| Start tanpa `API_KEY` | ✅ Ditolak (FATAL, exit 1) |
| `GET /api/status` (tanpa key) | ✅ 200 |
| `GET /api/menu` | ✅ 200 |
| `GET /health`, `GET /` | ✅ 200 |
| Download endpoint tanpa key / key salah | ✅ 401 pesan Indonesia |
| 65 request cepat | ✅ 429 setelah batas 60/menit |
| `ytmp3` tanpa yt-dlp terinstal | ✅ 503 "Binary yt-dlp tidak ditemukan" |

## 5. Yang BELUM bisa dites di sandbox (butuh VPS / HP asli)
- Pairing WhatsApp asli (kode 8 digit / QR) dan pengiriman pesan.
- **Tombol/list interaktif di HP asli** — implementasi native flow sesuai riset, wajib verifikasi manual.
- Download sungguhan (YouTube/TikTok/IG) — butuh `yt-dlp` + jaringan ke provider.
- Fallback AI gratis (Pollinations) — timeout dari sandbox ini; pola kode sama dengan bot lama yang dulu jalan.
- `pasang.sh` end-to-end — butuh Ubuntu fresh + akses root.

## 6. Tidak ada secret
- Tidak ada `.env` asli, `session/`, atau key di dalam proyek. Semua secret via environment.
