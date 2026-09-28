#!/bin/bash
# =====================================================
#  Setup Cloudflare Tunnel untuk Habibi REST API
#  Menghubungkan https://cloud.habibi-api.web.id
#  ke API di http://localhost:3000
#
#  Syarat: sudah buat tunnel di dashboard Cloudflare
#  dan menambahkan Public Hostname:
#    hostname : cloud.habibi-api.web.id
#    service  : http://localhost:3000
#
#  Cara pakai: sudo bash tunnel.sh
# =====================================================
set -e

if [ "$EUID" -ne 0 ]; then
  echo "❌ Jalankan sebagai root: sudo bash tunnel.sh"
  exit 1
fi

echo "== [1/4] Install cloudflared =="
if ! command -v cloudflared >/dev/null 2>&1; then
  curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
    -o /tmp/cloudflared.deb
  dpkg -i /tmp/cloudflared.deb
  echo "✅ cloudflared terinstall"
else
  echo "✅ cloudflared sudah ada"
fi

echo ""
echo "== [2/4] Tunnel token =="
# Bisa via env: sudo TUNNEL_TOKEN='<token>' bash tunnel.sh
TOKEN="${TUNNEL_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  echo "   Ambil di: dash.cloudflare.com → Zero Trust → Networks → Tunnels"
  echo "   → pilih tunnel kamu → Install and run a connector → salin token"
  echo ""
  read -rsp "Tempel tunnel token di sini: " TOKEN
  echo ""
fi
if [ -z "$TOKEN" ]; then
  echo "❌ Token kosong, batal."
  exit 1
fi

echo "== [3/4] Simpan token (aman, hanya root) =="
mkdir -p /etc/habibi-tunnel
printf 'TUNNEL_TOKEN=%s\n' "$TOKEN" > /etc/habibi-tunnel/token
chmod 600 /etc/habibi-tunnel/token
unset TOKEN

echo "== [4/4] Pasang systemd service =="
cat > /etc/systemd/system/habibi-tunnel.service << 'EOF'
[Unit]
Description=Cloudflare Tunnel untuk Habibi REST API
After=network-online.target
Wants=network-online.target

[Service]
EnvironmentFile=/etc/habibi-tunnel/token
ExecStart=/usr/bin/cloudflared tunnel --no-autoupdate run --token ${TUNNEL_TOKEN}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now habibi-tunnel
sleep 6

if systemctl is-active --quiet habibi-tunnel; then
  echo ""
  echo "✅ Tunnel BERJALAN."
  echo ""
  echo "Tes dari VPS:"
  echo "  curl -s https://cloud.habibi-api.web.id/api/status"
  echo ""
  echo "Kalau error 404/hostname, pastikan di dashboard Cloudflare"
  echo "sudah tambah Public Hostname: cloud.habibi-api.web.id → http://localhost:3000"
else
  echo ""
  echo "❌ Service gagal jalan. Cek log:"
  echo "  journalctl -u habibi-tunnel -n 50 --no-pager"
fi
