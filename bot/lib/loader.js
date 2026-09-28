// Plugin loader: memuat semua bot/plugins/**/*.js dan memvalidasi kontrak plugin.
//
// KONTRAK PLUGIN (wajib):
// export default {
//   name: 'ping', alias: ['p'], desc: '...', category: 'main', // main|downloader|muslim|maker|tools|sticker|ai|group
//   cooldown: 3, ownerOnly: false, adminOnly: false, groupOnly: false, privateOnly: false,
//   async run(ctx) {}
// }
// ctx = { sock, msg, command, args, text, sender, senderNumber, chat, isGroup, isOwner, reply, helpers }
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { warn, info } from './logger.js';

export const VALID_CATEGORIES = ['main', 'downloader', 'muslim', 'maker', 'tools', 'sticker', 'ai', 'group'];

const commandMap = new Map(); // nama command/alias (lowercase) -> plugin
const plugins = []; // daftar plugin valid

function validatePlugin(file, mod) {
  const p = mod?.default;
  if (!p || typeof p !== 'object') return { ok: false, reason: 'tidak ada default export objek' };
  if (!p.name || typeof p.name !== 'string') return { ok: false, reason: 'field "name" wajib (string)' };
  if (typeof p.run !== 'function') return { ok: false, reason: 'field "run" wajib (async function)' };
  return { ok: true, plugin: p };
}

function collectJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJsFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

export async function loadPlugins(pluginsDir) {
  const dir = pluginsDir || new URL('../plugins', import.meta.url).pathname;
  commandMap.clear();
  plugins.length = 0;

  if (!fs.existsSync(dir)) {
    warn(`Direktori plugin tidak ditemukan: ${dir}`);
    return { plugins, getCommand };
  }

  const files = collectJsFiles(dir);
  for (const file of files) {
    try {
      const mod = await import(pathToFileURL(file).href);
      const { ok, reason, plugin } = validatePlugin(file, mod);
      if (!ok) {
        warn(`Plugin dilewati ${path.relative(dir, file)}: ${reason}`);
        continue;
      }
      const name = plugin.name.toLowerCase();
      if (commandMap.has(name)) {
        warn(`Plugin dilewati ${path.relative(dir, file)}: nama command "${name}" sudah dipakai`);
        continue;
      }
      plugin.name = name;
      plugin.alias = Array.isArray(plugin.alias) ? plugin.alias.map((a) => String(a).toLowerCase()) : [];
      if (!VALID_CATEGORIES.includes(plugin.category)) plugin.category = 'tools';
      if (typeof plugin.cooldown !== 'number' || plugin.cooldown < 0) plugin.cooldown = 3;

      plugins.push(plugin);
      commandMap.set(name, plugin);
      for (const alias of plugin.alias) {
        if (commandMap.has(alias)) {
          warn(`Alias "${alias}" dari plugin "${name}" bentrok — dilewati`);
          continue;
        }
        commandMap.set(alias, plugin);
      }
      info(`Plugin dimuat: ${name} (${plugin.category})`);
    } catch (err) {
      warn(`Gagal memuat plugin ${path.relative(dir, file)}: ${err.message}`);
    }
  }
  info(`Total ${plugins.length} plugin dimuat`);
  return { plugins, getCommand };
}

export function getCommand(name) {
  if (!name) return undefined;
  return commandMap.get(String(name).toLowerCase());
}

export function getPlugins() {
  return [...plugins];
}

export function getPluginsByCategory() {
  const map = {};
  for (const p of plugins) {
    if (!map[p.category]) map[p.category] = [];
    map[p.category].push(p);
  }
  return map;
}

export default { loadPlugins, getCommand, getPlugins, getPluginsByCategory, VALID_CATEGORIES };
