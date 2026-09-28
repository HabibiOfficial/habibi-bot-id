#!/usr/bin/env bash
#
# pasang.sh — Installer one-shot "Habibi Bot ID" untuk VPS Ubuntu.
#
# Cara pakai:
#   curl -fsSL <URL_RAW_pasang.sh> -o pasang.sh && chmod +x pasang.sh && sudo ./pasang.sh
#   atau dengan URL bundle langsung:
#   sudo ./pasang.sh "https://contoh.com/habibi-bot.tar.gz"
#
#   Bisa juga lewat environment variable:
#   sudo BUNDLE_URL="https://contoh.com/habibi-bot.tar.gz" ./pasang.sh
#
set -euo pipefail

# ============================================================
#  Konfigurasi
# ============================================================
BUNDLE_URL_DEFAULT="https://muse.ai/files/1317108121489030/1969599767040331/dhoreklacvc99ve8k0xgdzyo/habibi-bot.zip"   # diganti koordinator saat bundle siap
INSTALL_DIR="/opt/habibi-bot"
TMP_DIR="/tmp/habibi-install"
BACKUP_DIR="/tmp/habibi-backup-$(date +%Y%m%d-%H%M%S)"

# ============================================================
#  Fungsi bantu
# ============================================================
info()  { echo -e "\e[1;34m[INFO]\e[0m $*"; }
ok()    { echo -e "\e[1;32m[OK]\e[0m $*"; }
warn()  { echo -e "\e[1;33m[PERHATIAN]\e[0m $*"; }
err()   { echo -e "\e[1;31m[GAGAL]\e[0m $*" >&2; }
tanya() { # tanya "pertanyaan" "default"
  local jawab
  read -rp "$1 [$2]: " jawab
  echo "${jawab:-$2}"
}

# ============================================================
#  1. Cek root & OS
# ============================================================
echo "=============================================================="
echo "  🤖  Installer Habibi Bot ID"
echo "=============================================================="
echo

if [ "$(id -u)" -ne 0 ]; then
  err "Script ini harus dijalankan sebagai root (administrator)."
  err "Silakan ulangi dengan:  sudo ./pasang.sh"
  exit 1
fi
ok "Berjalan sebagai root."

if [ -f /etc/os-release ]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  OS_ID="${ID:-unknown}"
else
  OS_ID="unknown"
fi

if [ "$OS_ID" != "ubuntu" ]; then
  warn "Sistem ini terdeteksi sebagai '$OS_ID', bukan Ubuntu."
  warn "Script ini dibuat untuk Ubuntu 22.04 / 24.04."
  lanjut=$(tanya "Tetap lanjutkan? (y/N)" "N")
  if [ "$lanjut" != "y" ] && [ "$lanjut" != "Y" ]; then
    info "Instalasi dibatalkan. Tidak ada perubahan yang dilakukan."
    exit 0
  fi
else
  ok "OS: Ubuntu terdeteksi."
fi

# ============================================================
#  2. Install dependensi sistem
# ============================================================
info "Memperbarui daftar paket & menginstal dependensi (curl, git, ffmpeg)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ffmpeg ca-certificates gnupg unzip tar openssl
ok "Dependensi dasar terinstal."

# --- Node.js 20 (lewati kalau sudah ada versi 20+) ---
perlu_node=true
if command -v node >/dev/null 2>&1; then
  node_ver="$(node -v | sed 's/^v//;s/\..*//')"
  if [ "$node_ver" -ge 20 ] 2>/dev/null; then
    perlu_node=false
    ok "Node.js $(node -v) sudah terinstal — dilewati."
  else
    warn "Node.js $(node -v) terlalu lama — akan di-upgrade ke Node.js 20."
  fi
fi

if [ "$perlu_node" = true ]; then
  info "Menginstal Node.js 20 dari NodeSource..."
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" \
    | tee /etc/apt/sources.list.d/nodesource.list >/dev/null
  apt-get update -y
  apt-get install -y nodejs
  ok "Node.js $(node -v) terinstal."
fi

# --- yt-dlp (binary statis dari GitHub release) ---
if command -v yt-dlp >/dev/null 2>&1; then
  ok "yt-dlp sudah terinstal ($(yt-dlp --version)) — dilewati."
else
  info "Mengunduh yt-dlp (binary statis) dari GitHub..."
  curl -fSL -o /usr/local/bin/yt-dlp \
    https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp
  chmod +x /usr/local/bin/yt-dlp
  ok "yt-dlp $(yt-dlp --version) terinstal."
fi

# --- PM2 ---
if command -v pm2 >/dev/null 2>&1; then
  ok "PM2 sudah terinstal ($(pm2 -v)) — dilewati."
else
  info "Menginstal PM2..."
  npm install -g pm2 --no-audit --no-fund
  ok "PM2 $(pm2 -v) terinstal."
fi

# ============================================================
#  3. Tentukan URL bundle
# ============================================================
BUNDLE_URL="${1:-${BUNDLE_URL:-$BUNDLE_URL_DEFAULT}}"

if [ "$BUNDLE_URL" = "https://muse.ai/files/1317108121489030/1969599767040331/dhoreklacvc99ve8k0xgdzyo/habibi-bot.zip" ] || [ -z "$BUNDLE_URL" ]; then
  echo
  warn "URL bundle belum tersedia otomatis."
  echo "Tempel (paste) URL unduhan file bundle Habibi Bot ID di bawah ini."
  echo "Contoh: https://contoh.com/habibi-bot.tar.gz"
  read -rp "URL bundle: " BUNDLE_URL
fi

if ! [[ "$BUNDLE_URL" =~ ^https?:// ]]; then
  err "URL tidak valid: '$BUNDLE_URL'"
  err "URL harus diawali http:// atau https://"
  exit 1
fi
ok "URL bundle: $BUNDLE_URL"

# ============================================================
#  4. Backup instalasi lama (kalau ada), lalu unduh & ekstrak
# ============================================================
mkdir -p "$TMP_DIR" "$BACKUP_DIR"

if [ -d "$INSTALL_DIR" ]; then
  info "Ditemukan instalasi lama — membackup .env & session..."
  for f in "$INSTALL_DIR/bot/.env" "$INSTALL_DIR/api/.env"; do
    if [ -f "$f" ]; then
      mkdir -p "$BACKUP_DIR"
      cp -a "$f" "$BACKUP_DIR/$(echo "$f" | tr '/' '_')"
      ok "Backup: $f -> $BACKUP_DIR"
    fi
  done
  if [ -d "$INSTALL_DIR/bot/session" ]; then
    cp -a "$INSTALL_DIR/bot/session" "$BACKUP_DIR/session"
    ok "Backup: session WhatsApp tersimpan."
  fi
  warn "Menghapus instalasi lama di $INSTALL_DIR ..."
  rm -rf "$INSTALL_DIR"
fi

mkdir -p "$INSTALL_DIR"

info "Mengunduh bundle..."
BUNDLE_FILE="$TMP_DIR/bundle"
curl -fSL --retry 3 -o "$BUNDLE_FILE" "$BUNDLE_URL"
ok "Bundle terunduh ($(du -h "$BUNDLE_FILE" | cut -f1))."

info "Mengekstrak bundle ke $INSTALL_DIR ..."
if [[ "$BUNDLE_URL" == *.zip ]]; then
  unzip -q -o "$BUNDLE_FILE" -d "$INSTALL_DIR"
else
  tar -xzf "$BUNDLE_FILE" -C "$INSTALL_DIR"
fi

# Kalau bundle berisi satu folder pembungkus (mis. habibi-bot/bot, habibi-bot/api),
# naikkan isinya satu level.
if [ ! -d "$INSTALL_DIR/bot" ] || [ ! -d "$INSTALL_DIR/api" ]; then
  subdir="$(find "$INSTALL_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1 || true)"
  if [ -n "$subdir" ] && [ -d "$subdir/bot" ] && [ -d "$subdir/api" ]; then
    info "Menyesuaikan struktur folder bundle..."
    shopt -s dotglob
    mv "$subdir"/* "$INSTALL_DIR"/
    shopt -u dotglob
    rmdir "$subdir"
  fi
fi

if [ ! -d "$INSTALL_DIR/bot" ] || [ ! -d "$INSTALL_DIR/api" ]; then
  err "Isi bundle tidak valid: folder 'bot' dan/atau 'api' tidak ditemukan."
  err "Pastikan URL bundle benar."
  exit 1
fi
ok "Bundle terekstrak."

# Kembalikan session lama (supaya tidak perlu pairing ulang)
if [ -d "$BACKUP_DIR/session" ]; then
  info "Mengembalikan session WhatsApp lama..."
  rm -rf "$INSTALL_DIR/bot/session"
  cp -a "$BACKUP_DIR/session" "$INSTALL_DIR/bot/session"
  ok "Session dikembalikan — kemungkinan besar tidak perlu pairing ulang."
fi

# ============================================================
#  5. REVERT hack SSH port 443 (sudah tidak dipakai lagi)
# ============================================================
info "Mengembalikan konfigurasi SSH ke normal (menghapus hack port 443)..."
if [ -f /etc/ssh/sshd_config.d/00-port443.conf ]; then
  rm -f /etc/ssh/sshd_config.d/00-port443.conf
  ok "Dihapus: /etc/ssh/sshd_config.d/00-port443.conf"
fi
if grep -q '^Port 443$' /etc/ssh/sshd_config 2>/dev/null; then
  sed -i '/^Port 443$/d' /etc/ssh/sshd_config
  ok "Baris 'Port 443' dihapus dari /etc/ssh/sshd_config"
fi
if sshd -t 2>/dev/null; then
  if systemctl restart ssh 2>/dev/null || service ssh restart 2>/dev/null; then
    ok "Service SSH di-restart dengan konfigurasi normal."
  else
    warn "Tidak bisa me-restart SSH otomatis — tidak masalah, instalasi lanjut."
  fi
else
  warn "Konfigurasi SSH tidak valid menurut 'sshd -t' — dilewati agar instalasi tidak gagal."
fi

# ============================================================
#  6. Minta input: nomor WA, owner, API key
# ============================================================
echo
echo "--------------------------------------------------------------"
echo "  Konfigurasi Bot"
echo "--------------------------------------------------------------"

while true; do
  BOT_NUMBER=$(tanya "Nomor WhatsApp BOT (format: 628xxx, tanpa +/spasi)" "")
  if [[ "$BOT_NUMBER" =~ ^[0-9]{10,15}$ ]]; then
    break
  fi
  warn "Nomor tidak valid. Harus 10-15 digit angka saja, contoh: 6281234567890"
done

OWNER_NUMBER=$(tanya "Nomor WhatsApp OWNER (admin bot)" "6285181576338")
while ! [[ "$OWNER_NUMBER" =~ ^[0-9]{10,15}$ ]]; do
  warn "Nomor tidak valid. Harus 10-15 digit angka saja."
  OWNER_NUMBER=$(tanya "Nomor WhatsApp OWNER (admin bot)" "6285181576338")
done

echo
echo "API Key dipakai untuk mengakses REST API bot dari luar."
echo "Kosongkan lalu tekan Enter untuk dibuatkan otomatis (disarankan)."
read -rsp "API Key (Enter = buat otomatis): " API_KEY_INPUT
echo
if [ -z "$API_KEY_INPUT" ]; then
  API_KEY="$(openssl rand -hex 16)"
  API_KEY_BARU=true
else
  API_KEY="$API_KEY_INPUT"
  API_KEY_BARU=false
fi

# --- Tulis bot/.env ---
cat > "$INSTALL_DIR/bot/.env" <<EOF
# Dibuat otomatis oleh pasang.sh pada $(date '+%Y-%m-%d %H:%M:%S')
BOT_NUMBER=$BOT_NUMBER
OWNER_NUMBER=$OWNER_NUMBER
PAIR_METHOD=code
EOF
chmod 600 "$INSTALL_DIR/bot/.env"
ok "Konfigurasi bot tersimpan: $INSTALL_DIR/bot/.env"

# --- Tulis api/.env ---
cat > "$INSTALL_DIR/api/.env" <<EOF
# Dibuat otomatis oleh pasang.sh pada $(date '+%Y-%m-%d %H:%M:%S')
PORT=3000
API_KEY=$API_KEY
EOF
chmod 600 "$INSTALL_DIR/api/.env"
ok "Konfigurasi API tersimpan: $INSTALL_DIR/api/.env"

# --- Simpan API key ke file terpisah (cadangan) ---
echo "$API_KEY" > "$INSTALL_DIR/API_KEY.txt"
chmod 600 "$INSTALL_DIR/API_KEY.txt"

# ============================================================
#  7. npm install di bot/ dan api/
# ============================================================
for app in bot api; do
  info "Menginstal package Node.js untuk '$app' (bisa beberapa menit)..."
  pushd "$INSTALL_DIR/$app" >/dev/null
  if [ -f package-lock.json ]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
  popd >/dev/null
  ok "Package '$app' terinstal."
done

# ============================================================
#  8. Jalankan dengan PM2
# ============================================================
info "Menjalankan bot & API dengan PM2..."

start_app() { # start_app <nama> <dir> <ecosystem> <fallback-entry>
  local nama="$1" dir="$2" eco="$3" fallback="$4"
  pm2 delete "$nama" >/dev/null 2>&1 || true
  if [ -f "$eco" ]; then
    pm2 start "$eco"
  else
    warn "File $(basename "$eco") tidak ada — memakai fallback: $fallback"
    pm2 start "$dir/$fallback" --name "$nama"
  fi
}

start_app "habibi-bot" "$INSTALL_DIR/bot" "$INSTALL_DIR/bot/ecosystem.config.js" "index.js"
start_app "habibi-api" "$INSTALL_DIR/api" "$INSTALL_DIR/api/ecosystem.config.js" "index.js"

pm2 save
# Aktifkan auto-start saat VPS reboot (abaikan kalau gagal)
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
ok "Bot & API berjalan di PM2."

# ============================================================
#  9. RINGKASAN AKHIR
# ============================================================
echo
echo "=============================================================="
echo "  ✅  INSTALASI SELESAI — Habibi Bot ID"
echo "=============================================================="
echo
echo "📱  PAIRING WHATSAPP (tautkan nomor bot):"
echo "    1. Jalankan:  pm2 logs habibi-bot"
echo "    2. Tunggu sampai muncul KODE 8 DIGIT (contoh: ABCD-1234)."
echo "    3. Di HP: buka WhatsApp > Perangkat Tertaut"
echo "       > Tautkan Perangkat > 'Tautkan dengan nomor telepon'"
echo "    4. Masukkan nomor bot: $BOT_NUMBER"
echo "    5. Masukkan kode 8 digit yang muncul di log."
echo "    Kalau kode tidak muncul, lihat Troubleshooting di README."
echo
echo "🖥️  CEK STATUS:"
echo "    pm2 status          → lihat bot & api berjalan"
echo "    pm2 logs habibi-bot → log bot (pairing code ada di sini)"
echo "    pm2 logs habibi-api → log API"
echo "    pm2 restart all     → restart semuanya"
echo
echo "📁  FILE PENTING:"
echo "    $INSTALL_DIR/bot/.env   (nomor bot & owner)"
echo "    $INSTALL_DIR/api/.env   (PORT & API_KEY)"
echo "    API key juga tersimpan di: $INSTALL_DIR/API_KEY.txt"
if [ "$API_KEY_BARU" = true ]; then
  echo
  echo "🔑  API KEY ANDA (catat baik-baik, hanya ditampilkan sekali di sini):"
  echo "    $API_KEY"
fi
echo
echo "🔄  CARA UPDATE KE VERSI BARU:"
echo "    cd $INSTALL_DIR && sudo ./scripts/update.sh"
echo "    (atau: sudo ./scripts/update.sh \"<URL bundle baru>\")"
echo
echo "🌐  API PUBLIK (opsional):"
echo "    API hanya bisa diakses dari dalam VPS (http://localhost:3000)."
echo "    Untuk akses dari internet via subdomain https://cloud.habibi-api.web.id,"
echo "    pasang Cloudflare Tunnel — caranya ada di README.md bagian 'Cloudflare Tunnel'."
echo
echo "📖  Panduan lengkap: $INSTALL_DIR/README.md"
echo "=============================================================="
