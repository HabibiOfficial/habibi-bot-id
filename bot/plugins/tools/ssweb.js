// SSWeb — screenshot tampilan sebuah website (URL penuh)
// Cara pakai: ssweb <url>
// Contoh: ssweb https://example.com
// Memakai layanan screenshot gratis WordPress mShots (tanpa API key).
import axios from 'axios';

const isUrl = (s) => /^https?:\/\/\S+/i.test(String(s || ''));

export default {
  name: 'ssweb',
  alias: ['ss', 'screenshot'],
  desc: 'Screenshot tampilan website dari URL',
  category: 'tools',
  cooldown: 10,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, text, reply } = ctx;
    let url = (text || '').split(/\s+/)[0];
    if (!url) {
      return reply('📸 Kirim URL website.\nContoh: *ssweb https://example.com*');
    }
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (!isUrl(url)) return reply('❌ URL tidak valid. Contoh: *ssweb https://example.com*');

    await reply('⏳ Mengambil screenshot website…');
    try {
      const shotUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=1280`;
      const { data } = await axios.get(shotUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      const buf = Buffer.from(data);
      if (buf.length < 2000) throw new Error('screenshot tidak valid / website tidak bisa diakses');

      await sock.sendMessage(
        chat,
        { image: buf, caption: `📸 *Screenshot*\n🔗 ${url}` },
        { quoted: msg },
      );
    } catch (e) {
      console.error('[ssweb]', e.message);
      await reply('❌ Gagal mengambil screenshot. Website mungkin memblokir akses atau sedang down. Coba lagi nanti.');
    }
  },
};
