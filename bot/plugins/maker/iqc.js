// IQC — iPhone Quoted Chat: bikin gambar fake chat iPhone dari teks
// Cara pakai: iqc <teks>
// Contoh: iqc kenapa lo ganteng banget
// API gratisan kadang 500 sesaat → retry hingga 2x
import axios from 'axios';

const OPERATOR = ['Telkomsel', 'XL', 'AXIS', 'Indosat', 'Tri', 'Smartfren'];
const acak = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
  name: 'iqc',
  alias: ['iphonechat', 'fakechat'],
  desc: 'Bikin gambar fake chat iPhone dari teks',
  category: 'maker',
  cooldown: 5,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { sock, msg, chat, text, reply } = ctx;
    const input = (text || '').trim();

    if (!input) {
      return reply('📱 *iPhone Quoted Chat*\n\nContoh: *iqc kenapa lo ganteng banget*');
    }
    if (input.length > 200) return reply('❌ Teks maksimal 200 karakter.');

    await reply('⏳ Membuat gambar chat…');
    try {
      const jam = `${String(acak(0, 23)).padStart(2, '0')}.${String(acak(0, 59)).padStart(2, '0')}`;
      const baterai = acak(10, 100);
      const operator = OPERATOR[acak(0, OPERATOR.length - 1)];

      const url =
        'https://brat.siputzx.my.id/iphone-quoted' +
        `?time=${encodeURIComponent(jam)}` +
        `&batteryPercentage=${baterai}` +
        `&carrierName=${encodeURIComponent(operator)}` +
        `&messageText=${encodeURIComponent(input)}` +
        '&emojiStyle=apple';

      // Coba hingga 2x — API gratisan kadang 500 sesaat (transient)
      let res = null;
      let galat = null;
      for (let i = 0; i < 2; i++) {
        try {
          res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
          galat = null;
          break;
        } catch (e) {
          galat = e;
          await sleep(2000);
        }
      }
      if (!res) throw galat || new Error('API tidak merespon');
      if (!res.data?.length) throw new Error('respon kosong');

      await sock.sendMessage(chat, { image: Buffer.from(res.data) }, { quoted: msg });
    } catch (e) {
      console.error('[iqc]', e.message);
      await reply(`❌ Gagal bikin IQC. _${String(e.message || 'coba lagi nanti').slice(0, 120)}_`);
    }
  },
};
