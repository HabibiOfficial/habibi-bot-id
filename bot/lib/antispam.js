// Anti-spam: cooldown per user per command + rate limit global per user.
const cooldowns = new Map(); // `${userId}:${command}` -> timestamp (ms) terakhir sukses
const hits = new Map(); // userId -> [timestamp (ms)] command dalam 10 detik terakhir
const warnedAt = new Map(); // userId -> timestamp (ms) peringatan terakhir

const WINDOW_MS = 10_000;
const MAX_PER_WINDOW = 8; // maks 8 command per 10 detik per user
const WARN_COOLDOWN_MS = 60_000; // peringatan rate-limit dikirim ulang tiap 60 detik

/**
 * Cek apakah user boleh menjalankan command.
 * @returns {{ ok: boolean, waitSec: number, rateLimited?: boolean, warn?: boolean }}
 */
export function canRun(userId, commandName, cooldownSec = 3) {
  const now = Date.now();

  // 1) Rate limit global: maks 8 command / 10 detik per user.
  const recent = (hits.get(userId) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(userId, recent);
    const lastWarn = warnedAt.get(userId) || 0;
    let warn = false;
    if (now - lastWarn > WARN_COOLDOWN_MS) {
      warnedAt.set(userId, now);
      warn = true; // peringatan dikirim sekali per 60 detik
    }
    return { ok: false, waitSec: 0, rateLimited: true, warn };
  }

  // 2) Cooldown per user per command.
  const key = `${userId}:${commandName}`;
  const last = cooldowns.get(key) || 0;
  const elapsed = (now - last) / 1000;
  if (elapsed < cooldownSec) {
    return { ok: false, waitSec: Math.ceil(cooldownSec - elapsed) };
  }

  // Lolos: catat pemakaian.
  cooldowns.set(key, now);
  recent.push(now);
  hits.set(userId, recent);
  return { ok: true, waitSec: 0 };
}

export function resetUser(userId) {
  hits.delete(userId);
  warnedAt.delete(userId);
  for (const key of cooldowns.keys()) {
    if (key.startsWith(`${userId}:`)) cooldowns.delete(key);
  }
}

export default { canRun, resetUser };
