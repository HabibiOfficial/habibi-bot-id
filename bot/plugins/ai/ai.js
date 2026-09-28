// AI — tanya jawab dengan AI
// Prioritas: API OpenAI-compatible dari environment (AI_API_URL + AI_API_KEY + opsional AI_MODEL).
// Fallback: Pollinations gratis (https://text.pollinations.ai/) agar langsung jalan tanpa konfigurasi,
// sama seperti perilaku bot lama.
// CATATAN: jangan kirim data pribadi/rahasia ke AI.
import axios from 'axios';

const SYSTEM = 'Kamu adalah asisten WhatsApp yang ramah, santai, dan membantu. Jawab dalam Bahasa Indonesia yang natural, ringkas, dan jelas.';
const POLLINATIONS_URL = 'https://text.pollinations.ai/';

export default {
  name: 'ai',
  alias: ['tanya', 'gpt'],
  desc: 'Tanya jawab dengan AI',
  category: 'ai',
  cooldown: 8,
  ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,

  async run(ctx) {
    const { text, reply } = ctx;
    const query = (text || '').trim();
    if (!query) return reply('🤖 Tulis pertanyaanmu.\nContoh: *ai apa itu fotosintesis?*');

    const apiUrl = process.env.AI_API_URL;
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL || 'gpt-4o-mini';
    const pakaiCustom = Boolean(apiUrl && apiKey);

    await reply('💭 AI sedang berpikir…');
    try {
      let jawaban = '';
      if (pakaiCustom) {
        const endpoint = apiUrl.replace(/\/+$/, '') + '/chat/completions';
        const { data } = await axios.post(
          endpoint,
          {
            model,
            messages: [
              { role: 'system', content: SYSTEM },
              { role: 'user', content: query },
            ],
            max_tokens: 1500,
            temperature: 0.7,
          },
          {
            timeout: 90000,
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          },
        );
        jawaban = String(data?.choices?.[0]?.message?.content || '').trim();
      } else {
        // Fallback gratis: Pollinations (GET text/plain)
        const { data } = await axios.get(POLLINATIONS_URL + encodeURIComponent(query), {
          timeout: 90000,
          responseType: 'text',
        });
        jawaban = String(data || '').trim();
      }
      if (!jawaban) throw new Error('respon kosong');
      // Potong agar tidak melebihi batas pesan WhatsApp
      await reply(jawaban.slice(0, 4000));
    } catch (e) {
      console.error('[ai]', e.message);
      await reply('❌ AI sedang bermasalah (rate-limit / API error). Tunggu sebentar lalu coba lagi.');
    }
  },
};
