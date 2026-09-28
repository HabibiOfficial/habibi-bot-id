# 🤖 Habibi Bot ID

Bot WhatsApp multifungsi + REST API, dibuat oleh **Habibih Cloud ID**.
Pemilik (owner): **6285181576338**.

Bot ini berjalan di VPS Ubuntu dan dikelola dengan **PM2** (auto-restart & auto-start saat VPS reboot).

---

## 📦 Cara Install di VPS

> Kamu hanya butuh akses **console/terminal VPS** (Ubuntu 22.04 atau 24.04). Tidak perlu install apa pun manual — script mengurus semuanya.

**1. Unduh script installer:**

```bash
curl -fsSL https://muse.ai/files/1317108121489030/2592227517892513/5mxnt6to3zytq66yrw2q14xr/pasang.sh -o pasang.sh
chmod +x pasang.sh
```

> ⚠️ Link di atas kedaluwarsa pada **30 Sep 2026** — lakukan install sebelum tanggal itu, atau minta link baru.

**2. Jalankan sebagai root:**

```bash
sudo ./pasang.sh
```

**3. Ikuti panduan di layar** — script akan meminta:
- 🔢 **Nomor WhatsApp bot** (format `628xxx`, 10–15 digit, tanpa `+` atau spasi)
- 👑 **Nomor owner** (default: `6285181576338`, tekan Enter untuk pakai default)
- 🔑 **API Key** (kosongkan + Enter untuk dibuatkan otomatis — **disarankan**)

### Apa yang dilakukan `pasang.sh`?

| Langkah | Keterangan |
|---|---|
| ✅ Cek root & Ubuntu | Menolak berjalan kalau bukan root |
| ✅ Install dependensi | Node.js 20, ffmpeg, yt-dlp, PM2, curl, git |
| ✅ Unduh bundle | Dari URL yang kamu berikan / tempel saat diminta |
| ✅ Install ke `/opt/habibi-bot` | Instalasi lama dibersihkan, `.env` & session di-backup |
| ✅ Kembalikan SSH normal | Menghapus hack port 443 (sudah tidak dipakai) |
| ✅ Buat `.env` | `bot/.env` (nomor bot & owner), `api/.env` (PORT & API_KEY) |
| ✅ `npm install` | Untuk `bot/` dan `api/` |
| ✅ Jalankan via PM2 | `habibi-bot` & `habibi-api`, plus `pm2 save` |

> 💡 Script ini **idempoten** — aman dijalankan ulang. Dependensi yang sudah ada akan dilewati.

---

## 📱 Pairing WhatsApp (Tautkan Nomor Bot)

Setelah instalasi selesai:

1. Jalankan:
   ```bash
   pm2 logs habibi-bot
   ```
2. Tunggu sampai muncul **KODE 8 DIGIT** di log (contoh: `ABCD-1234`).
3. Di HP, buka **WhatsApp** → **Perangkat Tertaut** → **Tautkan Perangkat** → pilih **"Tautkan dengan nomor telepon"**.
4. Masukkan **nomor bot** kamu, lalu masukkan **kode 8 digit** dari log.
5. Selesai! Bot akan online. Tekan `Ctrl+C` untuk keluar dari log.

### Fallback: pakai QR Code

Kalau pairing code tidak muncul / gagal, ubah metode pairing ke QR:

```bash
nano /opt/habibi-bot/bot/.env
# ubah baris PAIR_METHOD=code menjadi:
PAIR_METHOD=qr
# simpan (Ctrl+O, Enter, Ctrl+X), lalu:
pm2 restart habibi-bot
pm2 logs habibi-bot   # scan QR yang muncul dengan WhatsApp HP
```

---

## 🖥️ Operasional Sehari-hari

```bash
pm2 status            # lihat status bot & api
pm2 logs habibi-bot   # log bot (pairing code, error, aktivitas)
pm2 logs habibi-api   # log REST API
pm2 restart all       # restart semuanya
pm2 restart habibi-bot
pm2 stop habibi-bot   # hentikan sementara
```

### Lokasi file penting

| File | Isi |
|---|---|
| `/opt/habibi-bot/bot/.env` | `BOT_NUMBER`, `OWNER_NUMBER`, `PAIR_METHOD` |
| `/opt/habibi-bot/api/.env` | `PORT=3000`, `API_KEY` |
| `/opt/habibi-bot/API_KEY.txt` | Salinan API key (cadangan) |
| `/opt/habibi-bot/bot/session/` | Session WhatsApp (jangan dihapus kalau tidak mau pairing ulang!) |

### Cara ganti API Key

```bash
nano /opt/habibi-bot/api/.env   # ubah nilai API_KEY=
pm2 restart habibi-api
```

### Cara update ke versi baru

```bash
cd /opt/habibi-bot
sudo ./scripts/update.sh
# atau dengan URL bundle baru:
sudo ./scripts/update.sh "https://contoh.com/habibi-bot-v2.tar.gz"
```

`update.sh` akan: backup `.env` → unduh bundle baru → install ulang package → restart bot & API.
**Session WhatsApp dan `.env` tidak berubah**, jadi biasanya tidak perlu pairing ulang.

---

## 🌐 REST API

API berjalan di dalam VPS pada:

```
http://localhost:3000
```

Setelah Cloudflare Tunnel aktif (lihat di bawah), API publik bisa diakses di:

```
https://cloud.habibi-api.web.id
```

> 📖 **Dokumentasi interaktif** (daftar endpoint + contoh curl yang siap salin) tersedia di website API itu sendiri — buka salah satu base URL di atas di browser.

Setiap request harus menyertakan header:

```
x-api-key: <API_KEY kamu>
```

API key bisa dilihat di `/opt/habibi-bot/API_KEY.txt` (atau `/opt/habibi-bot/api/.env`).

### Contoh cek cepat dari dalam VPS

```bash
curl -H "x-api-key: $(cat /opt/habibi-bot/API_KEY.txt)" http://localhost:3000/
```

---

## ☁️ Cloudflare Tunnel (API publik via internet)

Secara default API hanya bisa diakses dari dalam VPS. Supaya bisa diakses dari internet (misalnya untuk webhook) tanpa buka port, pakai Cloudflare Tunnel:

**Cara cepat (URL sementara, cocok untuk testing):**

```bash
# Install cloudflared
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Jalankan tunnel ke API lokal
cloudflared tunnel --url http://localhost:3000
```

Cloudflare akan memberikan URL publik seperti `https://xxx.trycloudflare.com` — pakai URL itu untuk mengakses API dari internet.

**Cara permanen (URL tetap + subdomain sendiri):**

1. Login: `cloudflared tunnel login`
2. Buat tunnel: `cloudflared tunnel create habibi-api`
3. Buat config `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: <TUNNEL_ID>
   credentials-file: /root/.cloudflared/<TUNNEL_ID>.json
   ingress:
     - hostname: cloud.habibi-api.web.id
       service: http://localhost:3000
     - service: http_status:404
   ```
4. Arahkan DNS: `cloudflared tunnel route dns habibi-api cloud.habibi-api.web.id`
5. Jalankan: `cloudflared tunnel run habibi-api` (jalankan via PM2/systemd agar permanen)

---

## ⚠️ Catatan Jujur

- **Tombol interaktif WhatsApp** memakai *native flow* WhatsApp. Tampilannya **perlu diverifikasi di HP asli** — tidak dijamin tampil sempurna di semua aplikasi/versi WhatsApp (terutama WhatsApp versi lama atau WhatsApp Business tertentu).
- Jangan pernah membagikan isi `bot/session/` atau API key ke orang lain — itu sama dengan memberikan akses ke akun WhatsApp bot kamu.

---

## 🛠️ Troubleshooting

| Masalah | Solusi |
|---|---|
| Kode pairing tidak muncul di log | Tunggu 1–2 menit; cek `pm2 logs habibi-bot` dari awal. Pastikan nomor di `bot/.env` benar (format `628xxx`). Kalau tetap gagal, pakai mode QR (lihat di atas). |
| Bot restart terus / error | Lihat log: `pm2 logs habibi-bot --lines 100`. Seringnya karena `.env` salah atau session rusak. |
| Session rusak / logout sendiri | Hapus folder session lalu pairing ulang: `rm -rf /opt/habibi-bot/bot/session && pm2 restart habibi-bot` |
| API mengembalikan **401** | API key salah / tidak dikirim. Pastikan header `x-api-key` sesuai isi `/opt/habibi-bot/API_KEY.txt`, lalu `pm2 restart habibi-api`. |
| `npm install` gagal | Cek koneksi internet VPS & ruang disk (`df -h`). Ulangi `sudo ./scripts/update.sh`. |
| Lupa API key | Lihat `/opt/habibi-bot/API_KEY.txt` (hanya bisa dibaca root). |
| Perintah `pm2` tidak ditemukan | Jalankan ulang `pasang.sh` — atau install manual: `npm install -g pm2`. |
| VPS reboot, bot tidak jalan | Jalankan `pm2 resurrect` lalu `pm2 save`. Pastikan `pm2 startup` sudah dijalankan (otomatis oleh `pasang.sh`). |

---

<div align="center">

**Habibi Bot ID** — dibuat dengan ❤️ oleh **Habibih Cloud ID**

</div>
