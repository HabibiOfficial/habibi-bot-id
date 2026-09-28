// Plugin ping: mengukur kecepatan respon bot.
export default {
  name: 'ping',
  alias: ['p'],
  desc: 'Cek kecepatan respon bot',
  category: 'main',
  cooldown: 3,
  ownerOnly: false,
  adminOnly: false,
  groupOnly: false,
  privateOnly: false,
  async run(ctx) {
    const start = Date.now();
    await ctx.reply('⏳ Mengukur kecepatan...');
    const latency = Date.now() - start;
    const msgAge = Math.max(0, Math.round((Date.now() - Number(ctx.msg.messageTimestamp) * 1000) / 1000));
    await ctx.reply(`🏓 *Pong!*\n⚡ Kecepatan respon: *${latency} ms*\n📨 Umur pesan: ${msgAge} dtk`);
  },
};
