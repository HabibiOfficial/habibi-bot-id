// TikTok Sound — unduh audio/musik dari video TikTok
// Memakai API publik gratis (tikwm). Tanpa API key.
// CATATAN: API publik bisa mati/berubah sewaktu-waktu.
import axios from 'axios';

const API_TIKWM = 'https://www.tikwm.com/api/?url=';
const isUrl = (s) => /^https?:\/\/\S+/i.test(String(s || ''));

// Cari URL musik secara defensif — struktur respon tikwm bisa berbeda-beda
function cariUrlMusik(d) {
  const kandidat = [
    d?.music_info?.play,
    d?.music?.play_url,
    d?.music?.playUrl,
    d?.music,
    d?.music_info?.cover,
  ];
  for (const k of kandidat) {
    if (typeof k === 'string' && isUrl(k) && /\.(mp3|m4a|wav|ogg|aac)(\?|$)/i.test(k)) return k;
  }
  // fallback: string URL apapun di field musik
  const longgar = [d?.music_info?.play, d?.music?.play_url, d?.music?.playUrl, d?.music];
  for (const k of longgar) {
    if (typeof k === 'string' && isUrl(k)) return k;
  }
  return null;
}

export default {
  name: 'ttsound',
  alias: ['tiktoksound', 'ttmp3', 'ttaudio'],
  desc: 'Unduh sound/musik dari video TikTok',
  category: 'downloader',
  cooldown: 10,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, text, reply } = ctx;
    const url = (text || '').split(/\s+/)[0];
    if (!url || !isUrl(url) || !/tiktok\.com/i.test(url)) {
      return reply('🔗 Kirim link TikTok.\nContoh: *ttsound https://vt.tiktok.com/xxxx/*');
    }

    await reply('⏳ Sedang mengambil sound TikTok, mohon tunggu…');
    try {
      const { data } = await axios.get(API_TIKWM + encodeURIComponent(url), { timeout: 30000 });
      const d = data?.data;
      const musikUrl = cariUrlMusik(d);
      if (!musikUrl) throw new Error('link audio tidak ditemukan di respon API');

      const judul = d?.music_info?.title || d?.music?.title || d?.title || 'Sound TikTok';
      const author = d?.music_info?.author || d?.music?.author || d?.author?.nickname || '';

      await sock.sendMessage(
        chat,
        {
          audio: { url: musikUrl },
          mimetype: 'audio/mpeg',
          fileName: `${String(judul).slice(0, 60)}.mp3`,
        },
        { quoted: msg },
      );
      await reply(`🎵 *${judul}*\n👤 ${author}`);
    } catch (e) {
      console.error('[ttsound]', e.message);
      await reply('❌ Gagal mengunduh sound. Link mungkin privat/dihapus, atau API sedang down. Coba lagi nanti.');
    }
  },
};
