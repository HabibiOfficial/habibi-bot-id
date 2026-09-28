// Tourl — upload media (gambar/video/dokumen/stiker) lalu dapatkan URL publiknya
// Cara pakai: kirim media dengan caption "tourl", atau balas media lalu ketik tourl
// Host: catbox.moe → fallback tmpfiles.org → fallback uguu.se
import { downloadMediaMessage } from '@whiskeysockets/baileys';

function ambilQuoted(msg) {
  const m = msg.message || {};
  const ctxInfo =
    m.extendedTextMessage?.contextInfo ||
    m.imageMessage?.contextInfo ||
    m.videoMessage?.contextInfo ||
    m.documentMessage?.contextInfo ||
    m.stickerMessage?.contextInfo ||
    m.audioMessage?.contextInfo;
  return ctxInfo?.quotedMessage || null;
}

const TIPE_MEDIA = ['imageMessage', 'videoMessage', 'documentMessage', 'stickerMessage', 'audioMessage'];

const EKSTENSI = {
  imageMessage: '.jpg',
  videoMessage: '.mp4',
  documentMessage: '',
  stickerMessage: '.webp',
  audioMessage: '.mp3',
};

const MIME = {
  imageMessage: 'image/jpeg',
  videoMessage: 'video/mp4',
  documentMessage: 'application/octet-stream',
  stickerMessage: 'image/webp',
  audioMessage: 'audio/mpeg',
};

async function uploadBuffer(buffer, filename, mime) {
  const host = [
    // 1) catbox.moe
    async () => {
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('fileToUpload', new Blob([buffer], { type: mime }), filename);
      const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form });
      const url = (await res.text()).trim();
      if (!/^https?:\/\//i.test(url)) throw new Error('catbox gagal');
      return url;
    },
    // 2) tmpfiles.org
    async () => {
      const form = new FormData();
      form.append('file', new Blob([buffer], { type: mime }), filename);
      const res = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: form });
      const json = await res.json();
      const url = json?.data?.url;
      if (!url) throw new Error('tmpfiles gagal');
      return url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    },
    // 3) uguu.se
    async () => {
      const form = new FormData();
      form.append('files[]', new Blob([buffer], { type: mime }), filename);
      const res = await fetch('https://uguu.se/upload.php', { method: 'POST', body: form });
      const json = await res.json();
      const url = json?.files?.[0]?.url;
      if (!url) throw new Error('uguu gagal');
      return url;
    },
  ];
  for (const coba of host) {
    try {
      return await coba();
    } catch {
      // lanjut ke host berikutnya
    }
  }
  throw new Error('upload gagal di semua host, coba lagi nanti');
}

export default {
  name: 'tourl',
  alias: ['upload', 'tourlink'],
  desc: 'Upload media lalu dapatkan URL publiknya',
  category: 'tools',
  cooldown: 10,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { msg, chat, reply, sock } = ctx;

    const q = ambilQuoted(msg);
    let target = null;
    let tipe = null;
    for (const t of TIPE_MEDIA) {
      if (q?.[t]) { target = { ...msg, message: q }; tipe = t; break; }
      if (msg.message?.[t]) { target = msg; tipe = t; break; }
    }
    if (!target) {
      return reply('🔗 Kirim *media* (gambar/video/dokumen/stiker) dengan caption *tourl*, atau balas media lalu ketik perintah ini.');
    }

    await reply('⏳ Mengupload media…');
    try {
      const buf = await downloadMediaMessage(target, 'buffer', {});
      if (!buf?.length) throw new Error('gagal mengunduh media');
      const ext = EKSTENSI[tipe] || '';
      const url = await uploadBuffer(buf, `habibi-${Date.now()}${ext}`, MIME[tipe] || 'application/octet-stream');
      await sock.sendMessage(chat, { text: `🔗 *URL Media*\n\n${url}` }, { quoted: msg });
    } catch (e) {
      console.error('[tourl]', e.message);
      await reply(`❌ Gagal upload. _${String(e.message || 'coba lagi nanti').slice(0, 120)}_`);
    }
  },
};
