// TikTok downloader — unduh video TikTok tanpa watermark + postingan slide foto
// Memakai API publik gratis (tikwm). Tanpa API key.
// CATATAN: API publik bisa mati/berubah sewaktu-waktu.
import axios from 'axios';

const API_TIKWM = 'https://www.tikwm.com/api/?url=';
const isUrl = (s) => /^https?:\/\/\S+/i.test(String(s || ''));

export default {
  name: 'tiktok',
  alias: ['tt', 'tiktokdl'],
  desc: 'Unduh video TikTok tanpa watermark / slide foto',
  category: 'downloader',
  cooldown: 10,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, text, reply } = ctx;
    const url = (text || '').split(/\s+/)[0];
    if (!url || !isUrl(url) || !/tiktok\.com/i.test(url)) {
      return reply('🔗 Kirim link TikTok.\nContoh: *tiktok https://vt.tiktok.com/xxxx/*');
    }

    await reply('⏳ Sedang mengunduh dari TikTok, mohon tunggu…');
    try {
      const { data } = await axios.get(API_TIKWM + encodeURIComponent(url), { timeout: 30000 });
      const d = data?.data;
      const judul = d?.title || 'TikTok';
      const author = d?.author?.nickname || d?.author?.unique_id || '';

      // Postingan slide foto → kirim tiap gambar berurutan (maks 10)
      const images = Array.isArray(d?.images) ? d.images.filter((u) => typeof u === 'string' && isUrl(u)) : [];
      if (images.length > 0) {
        const kirim = images.slice(0, 10);
        for (let i = 0; i < kirim.length; i++) {
          await sock.sendMessage(
            chat,
            {
              image: { url: kirim[i] },
              caption: i === 0 ? `🖼️ *${judul}*\n👤 ${author}\n📷 ${images.length} foto` : '',
            },
            { quoted: i === 0 ? msg : undefined },
          );
        }
        return;
      }

      // Video biasa — parsing defensif: beberapa API memakai nama field berbeda
      const videoUrl = d?.play || d?.hdplay || d?.wmplay || d?.download_url;
      if (!videoUrl) throw new Error('link video tidak ditemukan di respon API');

      await sock.sendMessage(
        chat,
        { video: { url: videoUrl }, caption: `🎵 *${judul}*\n👤 ${author}`, mimetype: 'video/mp4' },
        { quoted: msg },
      );
    } catch (e) {
      console.error('[tiktok]', e.message);
      await reply('❌ Gagal mengunduh. Link mungkin privat/dihapus, atau API sedang down. Coba lagi nanti.');
    }
  },
};
