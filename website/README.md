# 🌐 Website Dokumentasi Habibi REST API

Website dokumentasi **standalone** (1 file `index.html`, tanpa build step) untuk Habibi REST API.
Punya tester interaktif — coba endpoint langsung dari browser.

## Cara Deploy (pilih salah satu)

### A. Cloudflare Pages (gratis, disarankan)
1. Buka https://pages.cloudflare.com → **Create** → **Upload assets**
2. Kasih nama project misal `habibi-api-docs`
3. Drag & drop file `index.html` → **Deploy**
4. (Opsional) Tambahkan custom domain di **Custom domains**

### B. Hosting statis lain
File `index.html` bisa di-host di mana saja: Netlify Drop, Vercel, GitHub Pages,
atau folder `public/` web server biasa (nginx/apache).

## Konfigurasi

Buka websitenya → isi **Base URL API** dan **API Key** di kartu ⚙️ Konfigurasi,
lalu **Simpan & Tes Koneksi**. Tersimpan otomatis di browser (localStorage).

- Base URL default: `https://cloud.habibi-api.web.id`
  (ganti ke `http://IP-VPS:3000` kalau API belum dipasang tunnel)
- API key: lihat di VPS → `cat /opt/habibi-bot/API_KEY.txt`

## Catatan

- Website ini murni frontend — tidak menyimpan apa pun di server.
- Pastikan server API mengizinkan CORS dari domain website ini
  (server bawaan Habibi Bot ID sudah mengaktifkan CORS).
- Endpoint bertanda 🔒 wajib header `x-api-key`.
- Rate limit: 60 request/menit per IP.

Dibuat oleh **Habibih Cloud ID** untuk **Habibi Bot ID** v1.0.0.
