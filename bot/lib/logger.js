// Logger rapi berbasis pino: timestamp + level.
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label.toUpperCase() };
    },
  },
});

// info/warn/error/debug(pesan, objekOpsional)
export const info = (msg, obj) => (obj ? logger.info(obj, msg) : logger.info(msg));
export const warn = (msg, obj) => (obj ? logger.warn(obj, msg) : logger.warn(msg));
export const error = (msg, obj) => (obj ? logger.error(obj, msg) : logger.error(msg));
export const debug = (msg, obj) => (obj ? logger.debug(obj, msg) : logger.debug(msg));

// Logger mentah untuk kasus khusus (mis. diteruskan ke Baileys).
export const raw = logger;
export default { info, warn, error, debug, raw };
