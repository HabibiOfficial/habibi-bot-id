// Helper pengiriman pesan Baileys v7.
// CATATAN: tombol native flow (interactiveMessage) dibuat sesuai format resmi WhatsApp,
// tetapi tampilannya WAJIB diverifikasi di HP asli — tidak dijamin tampil di semua client
// (WhatsApp Web/Desktop kadang menampilkannya berbeda atau tidak sama sekali).
// JANGAN gunakan buttonsMessage legacy — sudah tidak didukung client modern.
import {
  downloadMediaMessage,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
} from '@whiskeysockets/baileys';

/** Kirim teks dengan quote. */
export async function reply(sock, chat, text, msg) {
  await sock.sendMessage(chat, { text }, { quoted: msg });
}

/** Ubah array tombol sederhana menjadi nativeFlowMessage buttons. */
export function buildFlowButtons(buttons) {
  return (buttons || []).map((b) => {
    if (b?.type === 'url') {
      return { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: b.text, url: b.url }) };
    }
    if (b?.type === 'copy') {
      return { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: b.text, copy_code: b.code }) };
    }
    if (b?.type === 'call') {
      return { name: 'cta_call', buttonParamsJson: JSON.stringify({ display_text: b.text, phone_number: b.number }) };
    }
    // default: quick_reply
    return { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id }) };
  });
}

/**
 * Kirim tombol interaktif native flow via sock.relayMessage.
 * buttons: [{id, text}] quick_reply | {type:'url', text, url} | {type:'copy', text, code} | {type:'call', text, number}
 * image: Buffer gambar opsional untuk header.
 */
export async function sendButtons(sock, chat, { text, footer, image, buttons }, quoted) {
  const interactiveMessage = {
    body: { text: text || '' },
    footer: { text: footer || '' },
    nativeFlowMessage: { buttons: buildFlowButtons(buttons) },
  };
  if (image) {
    const media = await prepareWAMessageMedia({ image }, { upload: sock.waUploadToServer });
    interactiveMessage.header = {
      title: '',
      hasMediaAttachment: false,
      imageMessage: media.imageMessage,
    };
  }
  // generateWAMessageFromContent mengurus messageId + quoted (contextInfo) dengan benar.
  const waMsg = generateWAMessageFromContent(
    chat,
    { interactiveMessage },
    { userJid: sock.user?.id, ...(quoted ? { quoted } : {}) },
  );
  await sock.relayMessage(chat, waMsg.message, { messageId: waMsg.key.id });
}

/**
 * Kirim list interaktif native flow (single_select) via sock.relayMessage.
 * sections: [{ title, rows: [{ title, description, id }] }]
 */
export async function sendList(sock, chat, { title, text, footer, buttonText, sections }) {
  const interactiveMessage = {
    body: { text: text || '' },
    footer: { text: footer || '' },
    nativeFlowMessage: {
      buttons: [
        {
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: buttonText || 'Pilih',
            sections: (sections || []).map((s) => ({
              title: s.title,
              rows: (s.rows || []).map((r) => ({
                title: r.title,
                description: r.description || '',
                id: r.id,
              })),
            })),
          }),
        },
      ],
    },
  };
  if (title) {
    interactiveMessage.header = { title, hasMediaAttachment: false };
  }
  const waMsg = generateWAMessageFromContent(chat, { interactiveMessage }, { userJid: sock.user?.id });
  await sock.relayMessage(chat, waMsg.message, { messageId: waMsg.key.id });
}

/** Kirim buffer webp sebagai stiker. */
export async function sendSticker(sock, chat, buffer, msg) {
  await sock.sendMessage(chat, { sticker: buffer }, { quoted: msg });
}

/**
 * Download konten media dari pesan menjadi Buffer.
 * Terima WAMessage penuh, atau objek message content mentah (dibungkus otomatis).
 */
export async function downloadMedia(msg) {
  const waMsg = msg?.message ? msg : { key: { remoteJid: '', id: '' }, message: msg };
  return downloadMediaMessage(waMsg, 'buffer', {});
}

/**
 * Versi helpers yang sudah terikat ke satu socket — dipakai untuk ctx.helpers di plugin.
 * reply(chat, text, msg), sendButtons(chat, opts, quoted), sendList(chat, opts),
 * sendSticker(chat, buffer, msg), downloadMedia(msg).
 */
export function createHelpers(sock) {
  return {
    reply: (chat, text, msg) => reply(sock, chat, text, msg),
    sendButtons: (chat, opts, quoted) => sendButtons(sock, chat, opts, quoted),
    sendList: (chat, opts) => sendList(sock, chat, opts),
    sendSticker: (chat, buffer, msg) => sendSticker(sock, chat, buffer, msg),
    downloadMedia: (msg) => downloadMedia(msg),
  };
}

export default { reply, sendButtons, sendList, sendSticker, downloadMedia, createHelpers, buildFlowButtons };
