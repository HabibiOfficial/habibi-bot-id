// Koneksi WhatsApp via Baileys v7: auth multi-file, pairing code / QR,
// auto-reconnect dengan backoff, dan handler messages.upsert -> plugin.
import fs from 'node:fs';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  getContentType,
  isJidGroup,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  normalizeMessageContent,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';

import { config } from '../config.js';
import { info, warn, error } from './logger.js';
import { loadPlugins, getCommand } from './loader.js';
import { canRun } from './antispam.js';
import { createHelpers } from './helpers.js';

// Direktori session: <root bot>/session (relatif terhadap file ini).
// "root bot/" = folder bot/ itu sendiri; saat dijalankan via PM2 dengan cwd bot/,
// path ini juga sama dengan ./session.
const SESSION_DIR = new URL('../session', import.meta.url).pathname;

// Backoff reconnect: 2s -> 5s -> 10s -> 20s -> 30s -> maks 60s.
const BACKOFFS = [2000, 5000, 10_000, 20_000, 30_000, 60_000];
const LOGGED_OUT_CODES = new Set([DisconnectReason.loggedOut, 403]);

let sock = null;
let reconnectAttempts = 0;
let pairingRequested = false;
let stopped = false;

const baileysLogger = pino({ level: process.env.BAILEYS_LOG_LEVEL || 'warn' });

// ---------------------------------------------------------------------------
// Ekstraksi teks dari berbagai tipe pesan
// ---------------------------------------------------------------------------
function extractText(msg) {
  const content = normalizeMessageContent(msg.message);
  if (!content) return null;
  const type = getContentType(content);
  switch (type) {
    case 'conversation':
      return content.conversation || null;
    case 'extendedTextMessage':
      return content.extendedTextMessage?.text || null;
    case 'imageMessage':
      return content.imageMessage?.caption || null;
    case 'videoMessage':
      return content.videoMessage?.caption || null;
    case 'buttonsResponseMessage':
      return content.buttonsResponseMessage?.selectedButtonId || null;
    case 'listResponseMessage':
      return content.listResponseMessage?.singleSelectReply?.selectedRowId || null;
    case 'interactiveResponseMessage': {
      const paramsJson = content.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
      if (!paramsJson) return null;
      try {
        const j = JSON.parse(paramsJson);
        return j.id || j.selectedRowId || j.selected_option || null;
      } catch {
        return null;
      }
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Handler satu pesan -> plugin
// ---------------------------------------------------------------------------
async function handleMessage(s, msg) {
  const text = extractText(msg);
  if (!text) return;
  if (!text.startsWith(config.PREFIX)) return;

  const body = text.slice(config.PREFIX.length).trim();
  if (!body) return;
  const [rawCmd, ...args] = body.split(/\s+/);
  const command = rawCmd.toLowerCase();
  const plugin = getCommand(command);
  if (!plugin) return; // bukan command yang dikenal: abaikan

  const chat = msg.key.remoteJid;
  const isGroup = isJidGroup(chat);
  const senderJid = isGroup ? msg.key.participant || chat : chat;
  // Baileys v7 bisa memakai LID; utamakan nomor telepon bila tersedia.
  const senderPn = msg.key.participantPn || msg.key.senderPn || senderJid;
  const sender = jidNormalizedUser(senderPn);
  const senderNumber = sender.split('@')[0];
  const isOwner = senderNumber === config.OWNER_NUMBER;

  const helpers = createHelpers(s);
  const replyFn = (t) => helpers.reply(chat, t, msg);
  const ctx = {
    sock: s,
    msg,
    command,
    args,
    text: args.join(' '),
    sender,
    senderNumber,
    chat,
    isGroup,
    isOwner,
    reply: replyFn,
    helpers,
  };

  // ---- Hak akses ----
  if (plugin.ownerOnly && !isOwner) {
    await replyFn('⛔ Perintah ini khusus owner bot.');
    return;
  }
  if (plugin.groupOnly && !isGroup) {
    await replyFn('👥 Perintah ini hanya bisa dipakai di dalam grup.');
    return;
  }
  if (plugin.privateOnly && isGroup) {
    await replyFn('💬 Perintah ini hanya bisa dipakai di chat pribadi.');
    return;
  }
  if (plugin.adminOnly && !isOwner) {
    try {
      const meta = await s.groupMetadata(chat);
      const me = meta.participants.find(
        (p) => jidNormalizedUser(p.id) === sender || (p.phoneNumber && jidNormalizedUser(p.phoneNumber) === sender),
      );
      const isAdmin = !!me && (me.admin === 'admin' || me.admin === 'superadmin');
      if (!isAdmin) {
        await replyFn('🛡️ Perintah ini khusus admin grup.');
        return;
      }
    } catch (e) {
      warn(`Gagal membaca metadata grup: ${e.message}`);
      await replyFn('⚠️ Tidak bisa memverifikasi admin grup saat ini, coba lagi nanti.');
      return;
    }
  }

  // ---- Anti-spam: cooldown + rate limit ----
  const check = canRun(sender, plugin.name, plugin.cooldown ?? 3);
  if (!check.ok) {
    if (check.rateLimited && check.warn) {
      await replyFn('🐢 Terlalu banyak perintah! Santai dulu ya, tunggu beberapa detik.');
    }
    return; // cooldown biasa: abaikan diam-diam
  }

  // ---- Jalankan plugin ----
  try {
    await plugin.run(ctx);
  } catch (err) {
    error(`Error pada plugin "${plugin.name}": ${err.message}`);
    try {
      await replyFn('Ups, ada kesalahan saat menjalankan perintah. Coba lagi nanti ya 🙏');
    } catch {
      /* abaikan */
    }
  }
}

// ---------------------------------------------------------------------------
// Disconnect & reconnect
// ---------------------------------------------------------------------------
async function handleClose(lastDisconnect) {
  const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
  if (LOGGED_OUT_CODES.has(statusCode)) {
    error(
      `Sesi telah logout/terputus permanen (kode ${statusCode}). Menghapus folder session...`,
    );
    fs.rmSync(SESSION_DIR, { recursive: true, force: true });
    info('Silakan jalankan ulang bot dan lakukan pairing ulang (kode pairing / QR).');
    stopped = true; // JANGAN loop reconnect
    return;
  }
  if (stopped) return;
  const delay = BACKOFFS[Math.min(reconnectAttempts, BACKOFFS.length - 1)];
  reconnectAttempts += 1;
  warn(`Koneksi terputus (kode ${statusCode ?? 'unknown'}). Mencoba menghubungkan ulang dalam ${delay / 1000} detik...`);
  setTimeout(() => {
    if (!stopped) start().catch((e) => error(`Gagal reconnect: ${e.message}`));
  }, delay);
}

// ---------------------------------------------------------------------------
// Start / stop
// ---------------------------------------------------------------------------
export async function start() {
  if (stopped) return;

  // Validasi pairing: BOT_NUMBER wajib bila memakai pairing code.
  if (config.PAIR_METHOD === 'pairing' && !config.BOT_NUMBER) {
    error(
      'BOT_NUMBER belum diisi. Isi BOT_NUMBER di file .env dengan nomor WhatsApp bot ' +
        '(format internasional tanpa +, contoh: 6281234567890), lalu jalankan ulang bot.',
    );
    process.exit(1); // keluar graceful, bukan crash
  }

  await loadPlugins();

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch (e) {
    warn(`Gagal mengambil versi Baileys terbaru: ${e.message} (lanjut tanpa version pin)`);
  }

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
    },
    ...(version ? { version } : {}),
    logger: baileysLogger,
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Mode QR: tampilkan QR di terminal.
    if (qr && config.PAIR_METHOD === 'qr' && !state.creds.registered) {
      console.log('\n📱 Pindai QR berikut dari WhatsApp: Pengaturan > Perangkat tertaut > Tautkan perangkat\n');
      qrcode.generate(qr, { small: true });
    }

    // Mode pairing: minta kode pairing 8 digit setelah socket siap.
    if (
      connection === 'connecting' &&
      !state.creds.registered &&
      config.PAIR_METHOD === 'pairing' &&
      !pairingRequested
    ) {
      pairingRequested = true;
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(config.BOT_NUMBER);
          const pretty = code?.match(/.{1,4}/g)?.join('-') || code;
          console.log(`\n${'='.repeat(48)}`);
          console.log(`   KODE PAIRING:  ${pretty}`);
          console.log(`${'='.repeat(48)}`);
          console.log('\nCara menautkan:');
          console.log('1. Buka WhatsApp di HP');
          console.log('2. Pengaturan > Perangkat tertaut');
          console.log('3. Pilih "Tautkan dengan nomor telepon"');
          console.log('4. Masukkan 8 digit kode di atas\n');
        } catch (err) {
          pairingRequested = false;
          error(`Gagal meminta kode pairing: ${err.message}`);
        }
      }, 3000);
    }

    if (connection === 'open') {
      reconnectAttempts = 0;
      pairingRequested = false;
      const me = sock.user?.id ? jidNormalizedUser(sock.user.id).split('@')[0] : 'unknown';
      info(`✅ ${config.BOT_NAME} terhubung sebagai ${me}`);
    }

    if (connection === 'close') {
      await handleClose(lastDisconnect);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      try {
        if (!m.message) continue;
        if (m.key.remoteJid === 'status@broadcast') continue; // abaikan status
        if (m.key.fromMe) continue; // abaikan pesan dari bot sendiri
        await handleMessage(sock, m);
      } catch (err) {
        error(`Gagal memproses pesan: ${err.message}`);
      }
    }
  });

  return sock;
}

export async function stop() {
  stopped = true;
  if (sock) {
    try {
      await sock.end(undefined);
    } catch {
      try {
        sock.ws?.close();
      } catch {
        /* abaikan */
      }
    }
    sock = null;
  }
}

export function getSocket() {
  return sock;
}

export default { start, stop, getSocket };
