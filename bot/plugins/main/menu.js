// Plugin menu utama Habibi Bot ID.
import fs from 'node:fs';
import { config } from '../../config.js';
import { getPluginsByCategory, VALID_CATEGORIES } from '../../lib/loader.js';

const CATEGORY_LABEL = {
  main: '🏠 Utama',
  downloader: '📥 Downloader',
  muslim: '🕌 Muslim',
  maker: '🎨 Maker',
  tools: '🛠️ Tools',
  sticker: '🌟 Stiker',
  ai: '🤖 AI',
  group: '👥 Grup',
};

function bannerBuffer() {
  try {
    return fs.readFileSync(new URL('../../media/menu.jpg', import.meta.url));
  } catch {
    return null;
  }
}

export default {
  name: 'menu',
  alias: ['help', 'm'],
  desc: 'Menampilkan menu bot',
  category: 'main',
  cooldown: 3,
  ownerOnly: false,
  adminOnly: false,
  groupOnly: false,
  privateOnly: false,
  async run(ctx) {
    const { helpers, chat, msg, args } = ctx;
    const prefix = config.PREFIX;
    const byCategory = getPluginsByCategory();
    const totalCmd = Object.values(byCategory).reduce((n, arr) => n + arr.length, 0);

    // .menu <kategori> -> daftar command kategori tersebut (list interaktif)
    const catArg = (args[0] || '').toLowerCase();
    if (catArg) {
      if (!VALID_CATEGORIES.includes(catArg)) {
        const daftar = VALID_CATEGORIES.map((c) => `• ${prefix}menu ${c}`).join('\n');
        await ctx.reply(`❌ Kategori tidak dikenal.\n\nKategori yang tersedia:\n${daftar}`);
        return;
      }
      const list = byCategory[catArg] || [];
      if (!list.length) {
        await ctx.reply(`📭 Belum ada perintah di kategori *${CATEGORY_LABEL[catArg]}*.`);
        return;
      }
      await helpers.sendList(chat, {
        title: `${config.BOT_NAME}`,
        text: `📋 *${CATEGORY_LABEL[catArg]}* — ${list.length} perintah\n\nKetuk salah satu untuk menjalankannya.`,
        footer: `${config.BOT_NAME} • ${config.DEVELOPER}`,
        buttonText: 'Lihat Perintah',
        sections: [
          {
            title: CATEGORY_LABEL[catArg],
            rows: list.map((p) => ({
              title: `${prefix}${p.name}`,
              description: (p.desc || 'Tanpa deskripsi').slice(0, 72),
              id: `${prefix}${p.name}`,
            })),
          },
        ],
      });
      return;
    }

    // Menu utama: banner + tombol kategori (quick_reply native flow)
    const caption =
      `✨ *${config.BOT_NAME}* ✨\n` +
      `🤖 Bot WhatsApp multi-fitur\n\n` +
      `📌 Prefix: *${prefix}*\n` +
      `📦 Total perintah: *${totalCmd}*\n` +
      `👑 Owner: ${config.OWNER_NUMBER}\n\n` +
      `Pilih kategori di bawah ini 👇`;

    const buttons = VALID_CATEGORIES.filter((c) => (byCategory[c] || []).length > 0).map((c) => ({
      id: `${prefix}menu ${c}`,
      text: CATEGORY_LABEL[c],
    }));

    const image = bannerBuffer();
    if (image) {
      await helpers.sendButtons(
        chat,
        {
          text: caption,
          footer: `${config.BOT_NAME} • ${config.DEVELOPER}`,
          image,
          buttons,
        },
        msg,
      );
    } else {
      await helpers.sendButtons(chat, {
        text: caption,
        footer: `${config.BOT_NAME} • ${config.DEVELOPER}`,
        buttons,
      }, msg);
    }
  },
};
