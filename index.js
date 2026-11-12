
const mineflayer = require('mineflayer');

const CONFIG = {
  host: '9a3smp.mcsh.gg',
  port: 25565,
  username: 'Bot_AFK_247_6',
  version: false,
  reconnectDelay: 30000
};

let bot = null;
let reconnectTimer = null;
let stopped = false;

function connect() {
  if (stopped || bot) return;

  console.log('[Bot 6] Đang kết nối...');

  const current = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    version: CONFIG.version || undefined,
    viewDistance: 'tiny',
    checkTimeoutInterval: 60000
  });

  bot = current;

  current.once('spawn', () => {
    console.log('[Bot 6] Đã vào server!');
  });

  current.on('kicked', reason => {
    console.log('[Bot 6] Bị kick:', JSON.stringify(reason));
  });

  current.on('error', err => {
    console.log('[Bot 6] Lỗi:', err.message);
  });

  current.once('end', () => {
    if (bot !== current) return;

    bot = null;
    console.log('[Bot 6] Mất kết nối.');

    if (!stopped && !reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, CONFIG.reconnectDelay);
    }
  });
}

function shutdown() {
  stopped = true;
  clearTimeout(reconnectTimer);

  if (bot) {
    bot.quit();
    bot = null;
  }

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

connect();
