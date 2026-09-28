// HD — tingkatkan kualitas / resolusi gambar (GRATIS, tanpa API key)
// Cara pakai: balas sebuah gambar lalu ketik hd
// Alur: gambar diupload ke catbox.moe (fallback tmpfiles.org → uguu.se)
//       → diproses api-faa.my.id/faa/hdimage
import { downloadMediaMessage } from '@whiskeysockets/baileys';

function ambilQuoted(msg) {
  const m = msg.message || {};
  const ctxInfo =
    m.extendedTextMessage?.contextInfo ||
    m.imageMessage?.contextInfo ||
    m.stickerMessage?.contextInfo;
  return ctxInfo?.quotedMessage || null;
}

// Upload buffer gambar ke host gratis — coba beberapa host berurutan
// (satu host bisa down/diblokir dari server tertentu)
async function uploadGambar(buffer, filename = 'hd.jpg') {
  const host = [
    // 1) catbox.moe
    async () => {
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('fileToUpload', new Blob([buffer], { type: 'image/jpeg' }), filename);
      const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form });
      const url = (await res.text()).trim();
      if (!/^https?:\/\//i.test(url)) throw new Error('catbox gagal');
      return url;
    },
    // 2) tmpfiles.org
    async () => {
      const form = new FormData();
      form.append('file', new Blob([buffer], { type: 'image/jpeg' }), filename);
      const res = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: form });
      const json = await res.json();
      const url = json?.data?.url;
      if (!url) throw new Error('tmpfiles gagal');
      return url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    },
    // 3) uguu.se
    async () => {
      const form = new FormData();
      form.append('files[]', new Blob([buffer], { type: 'image/jpeg' }), filename);
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
  throw new Error('upload gambar gagal di semua host, coba lagi nanti');
}

export default {
  name: 'hd',
  alias: ['remini', 'upscale', 'enhance'],
  desc: 'Tingkatkan kualitas gambar jadi HD (gratis)',
  category: 'tools',
  cooldown: 20,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, reply } = ctx;

    const q = ambilQuoted(msg);
    let target = null;
    if (q?.imageMessage) target = { ...msg, message: q };
    else if (msg.message?.imageMessage) target = msg;
    if (!target) {
      return reply(
        '✨ *HD Enhancer*\n\nBalas sebuah gambar lalu ketik *hd*\n_Contoh: kirim foto → reply → *hd*_',
      );
    }

    await reply('⏳ Memproses HD, mohon tunggu…');
    try {
      const buf = await downloadMediaMessage(target, 'buffer', {});
      if (!buf?.length) throw new Error('gagal download gambar');

      const url = await uploadGambar(buf);
      const apiUrl = `https://api-faa.my.id/faa/hdimage?url=${encodeURIComponent(url)}`;

      const res = await fetch(apiUrl, { signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw new Error('server HD sibuk, coba lagi nanti');
      const hasil = Buffer.from(await res.arrayBuffer());
      if (hasil.length < 500) throw new Error('respon HD tidak valid');

      await sock.sendMessage(chat, { image: hasil, caption: '✨ *HD Enhanced*' }, { quoted: msg });
    } catch (e) {
      console.error('[hd]', e.message);
      await reply(`❌ Gagal HD. _${String(e.message || 'coba lagi nanti').slice(0, 140)}_`);
    }
  },
};
