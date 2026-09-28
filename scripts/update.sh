#!/usr/bin/env bash
#
# update.sh — Update "Habibi Bot ID" ke versi bundle terbaru.
#
# Cara pakai (dari folder instalasi):
#   cd /opt/habibi-bot && sudo ./scripts/update.sh
#   atau dengan URL bundle baru:
#   sudo ./scripts/update.sh "https://contoh.com/habibi-bot-v2.tar.gz"
#
# Yang dilakukan:
#   1. Backup .env (bot & api) — TIDAK PERNAH ditimpa otomatis.
#   2. Unduh & ekstrak bundle baru (session WhatsApp dipertahankan).
#   3. npm install ulang di bot/ dan api/.
#   4. Restart habibi-bot & habibi-api via PM2.
#
# Script ini idempoten: aman dijalankan berulang kali.
#
set -euo pipefail

BUNDLE_URL_DEFAULT="https://muse.ai/files/1317108121489030/1969599767040331/dhoreklacvc99ve8k0xgdzyo/habibi-bot.zip"   # diganti koordinator saat bundle siap
INSTALL_DIR="/opt/habibi-bot"
TMP_DIR="/tmp/habibi-update"
BACKUP_DIR="/tmp/habibi-backup-$(date +%Y%m%d-%H%M%S)"

info() { echo -e "\e[1;34m[INFO]\e[0m $*"; }
ok()   { echo -e "\e[1;32m[OK]\e[0m $*"; }
warn() { echo -e "\e[1;33m[PERHATIAN]\e[0m $*"; }
err()  { echo -e "\e[1;31m[GAGAL]\e[0m $*" >&2; }

echo "=============================================================="
echo "  🔄  Update Habibi Bot ID"
echo "=============================================================="
echo

if [ "$(id -u)" -ne 0 ]; then
  err "Jalankan sebagai root:  sudo ./scripts/update.sh"
  exit 1
fi

if [ ! -d "$INSTALL_DIR/bot" ] || [ ! -d "$INSTALL_DIR/api" ]; then
  err "Instalasi tidak ditemukan di $INSTALL_DIR."
  err "Jalankan pasang.sh dulu untuk instalasi awal."
  exit 1
fi

# --- Tentukan URL bundle ---
BUNDLE_URL="${1:-${BUNDLE_URL:-$BUNDLE_URL_DEFAULT}}"
if [ "$BUNDLE_URL" = "https://muse.ai/files/1317108121489030/1969599767040331/dhoreklacvc99ve8k0xgdzyo/habibi-bot.zip" ] || [ -z "$BUNDLE_URL" ]; then
  warn "URL bundle belum tersedia otomatis."
  read -rp "Tempel URL bundle baru: " BUNDLE_URL
fi
if ! [[ "$BUNDLE_URL" =~ ^https?:// ]]; then
  err "URL tidak valid: '$BUNDLE_URL' (harus diawali http:// atau https://)"
  exit 1
fi
ok "URL bundle: $BUNDLE_URL"

mkdir -p "$TMP_DIR" "$BACKUP_DIR"

# --- 1. Backup .env ---
info "Membackup file .env..."
for f in "$INSTALL_DIR/bot/.env" "$INSTALL_DIR/api/.env"; do
  if [ -f "$f" ]; then
    cp -a "$f" "$BACKUP_DIR/$(echo "$f" | tr '/' '_')"
    ok "Backup: $f"
  fi
done
if [ -d "$INSTALL_DIR/bot/session" ]; then
  cp -a "$INSTALL_DIR/bot/session" "$BACKUP_DIR/session"
  ok "Backup: session WhatsApp"
fi
info "Backup tersimpan di: $BACKUP_DIR"

# --- 2. Unduh & ekstrak ke folder sementara ---
info "Mengunduh bundle baru..."
BUNDLE_FILE="$TMP_DIR/bundle"
curl -fSL --retry 3 -o "$BUNDLE_FILE" "$BUNDLE_URL"
ok "Bundle terunduh."

EXTRACT_DIR="$TMP_DIR/extract"
rm -rf "$EXTRACT_DIR"
mkdir -p "$EXTRACT_DIR"
if [[ "$BUNDLE_URL" == *.zip ]]; then
  unzip -q -o "$BUNDLE_FILE" -d "$EXTRACT_DIR"
else
  tar -xzf "$BUNDLE_FILE" -C "$EXTRACT_DIR"
fi

# Normalisasi: tangani folder pembungkus tunggal
SRC="$EXTRACT_DIR"
if [ ! -d "$SRC/bot" ] || [ ! -d "$SRC/api" ]; then
  subdir="$(find "$SRC" -mindepth 1 -maxdepth 1 -type d | head -n 1 || true)"
  if [ -n "$subdir" ] && [ -d "$subdir/bot" ] && [ -d "$subdir/api" ]; then
    SRC="$subdir"
  fi
fi
if [ ! -d "$SRC/bot" ] || [ ! -d "$SRC/api" ]; then
  err "Isi bundle tidak valid: folder 'bot' dan/atau 'api' tidak ditemukan."
  exit 1
fi

# --- 3. Ganti file aplikasi (kecuali .env & session) ---
info "Mengganti file aplikasi (mempertahankan .env & session)..."
for app in bot api; do
  # hapus semua kecuali .env dan session
  find "$INSTALL_DIR/$app" -mindepth 1 -maxdepth 1 \
    ! -name '.env' ! -name 'session' -exec rm -rf {} +
  # salin file baru (kecuali .env bawaan bundle, kalau ada)
  shopt -s dotglob
  for item in "$SRC/$app"/*; do
    base="$(basename "$item")"
    if [ "$base" = ".env" ]; then
      warn "Melewati .env bawaan bundle di $app/ (memakai .env lama Anda)."
      continue
    fi
    cp -a "$item" "$INSTALL_DIR/$app/"
  done
  shopt -u dotglob
done
ok "File aplikasi diperbarui."

# --- 4. npm install ulang ---
for app in bot api; do
  info "Menginstal ulang package '$app'..."
  pushd "$INSTALL_DIR/$app" >/dev/null
  if [ -f package-lock.json ]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
  popd >/dev/null
  ok "Package '$app' siap."
done

# --- 5. Restart PM2 ---
info "Me-restart bot & API..."
restart_app() { # restart_app <nama> <dir> <ecosystem> <fallback-entry>
  local nama="$1" dir="$2" eco="$3" fallback="$4"
  if pm2 describe "$nama" >/dev/null 2>&1; then
    pm2 restart "$nama"
  elif [ -f "$eco" ]; then
    pm2 start "$eco"
  else
    pm2 start "$dir/$fallback" --name "$nama"
  fi
}
restart_app "habibi-bot" "$INSTALL_DIR/bot" "$INSTALL_DIR/bot/ecosystem.config.js" "index.js"
restart_app "habibi-api" "$INSTALL_DIR/api" "$INSTALL_DIR/api/ecosystem.config.js" "index.js"
pm2 save
ok "Bot & API di-restart."

echo
echo "=============================================================="
echo "  ✅  UPDATE SELESAI"
echo "=============================================================="
echo "Cek status:   pm2 status"
echo "Lihat log:    pm2 logs habibi-bot"
echo "Backup .env:  $BACKUP_DIR"
echo "Catatan: session WhatsApp & .env Anda TIDAK berubah,"
echo "jadi biasanya tidak perlu pairing ulang."
echo "=============================================================="
