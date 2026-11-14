

const mineflayer = require('mineflayer');
const express = require('express');

const CONFIG = {
  host: process.env.MC_HOST || '9a3smp.mcsh.gg',
  port: Number(process.env.MC_PORT || 25565),
  username: process.env.MC_USERNAME || 'BotTreoServer',
  version: process.env.MC_VERSION || false,
  targetServer: process.env.MC_SERVER || 'pvp',
  password: process.env.BOT_PASSWORD || '',
  webhook: process.env.DISCORD_WEBHOOK_URL || '',
  antiAfk: process.env.ANTI_AFK !== 'false',
  reconnectDelay: 30000,
  maxReconnectDelay: 600000
};

let bot = null;
let reconnectTimer = null;
let afkTimer = null;
let reconnectDelay = CONFIG.reconnectDelay;
let stopping = false;
let loginSent = false;
let lastError = null;
let online = false;

const app = express();
app.get('/health', (_, res) => res.send('OK'));
app.get('/status', (_, res) => res.json({
  online,
  server: `${CONFIG.host}:${CONFIG.port}`,
  username: CONFIG.username,
  reconnectDelay,
  lastError
}));

app.listen(process.env.PORT || 3000, () =>
  console.log('[WEB] Health server ready')
);

function log(message) {
  console.log(`[BOT] ${message}`);
}

async function discord(message) {
  if (!CONFIG.webhook) return;

  try {
    await fetch(CONFIG.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });
  } catch (err) {
    log(`Discord error: ${err.message}`);
  }
}

function stopAfk() {
  if (afkTimer) clearTimeout(afkTimer);
  afkTimer = null;

  if (bot) {
    for (const key of [
      'forward', 'back', 'left', 'right',
      'jump', 'sprint', 'sneak'
    ]) {
      try {
        bot.setControlState(key, false);
      } catch {}
    }
  }
}

// Di chuyển nhẹ nhàng, ngẫu nhiên
function startAfk() {
  stopAfk();
  if (!CONFIG.antiAfk) return;

  function loop() {
    if (!bot || !bot.entity || !online) return;

    try {
      const actions = ['forward', 'back', 'left', 'right'];
      const action = actions[Math.floor(Math.random() * actions.length)];

      if (Math.random() < 0.7) {
        bot.setControlState(action, true);

        setTimeout(() => {
          if (bot) {
            try {
              bot.setControlState(action, false);
            } catch {}
          }
        }, 500 + Math.random() * 1000);
      }

      if (Math.random() < 0.3) {
        bot.look(
          Math.random() * Math.PI * 2,
          (Math.random() - 0.5) * 0.5,
          false
        );
      }

      if (Math.random() < 0.15) bot.swingArm('right');
    } catch (err) {
      log(`AFK error: ${err.message}`);
    }

    afkTimer = setTimeout(loop, 7000 + Math.random() * 5000);
  }

  afkTimer = setTimeout(loop, 3000);
}

function scheduleReconnect() {
  if (stopping || reconnectTimer) return;

  const delay = reconnectDelay * (0.8 + Math.random() * 0.4);
  log(`Reconnect sau ${Math.round(delay / 1000)} giây`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);

  reconnectDelay = Math.min(
    reconnectDelay * 2,
    CONFIG.maxReconnectDelay
  );
}

function disconnect(reason) {
  if (!bot) return;

  lastError = reason;
  online = false;
  log(`Disconnected: ${reason}`);

  discord(`🔴 Bot ${CONFIG.username} disconnected: ${reason}`);

  stopAfk();

  const oldBot = bot;
  bot = null;

  try {
    oldBot.removeAllListeners();
    oldBot.end();
  } catch {}

  scheduleReconnect();
}

function handleLogin(message) {
  if (!CONFIG.password || loginSent || !bot) return;

  const text = String(message).toLowerCase();

  if (/\/register|please register|not registered/.test(text)) {
    loginSent = true;
    setTimeout(() => {
      if (bot) bot.chat(`/register ${CONFIG.password} ${CONFIG.password}`);
    }, 1200);
  } else if (/\/login|please login|please authenticate/.test(text)) {
    loginSent = true;
    setTimeout(() => {
      if (bot) bot.chat(`/login ${CONFIG.password}`);
    }, 1200);
  }
}

function connect() {
  if (stopping || bot) return;

  log(`Connecting ${CONFIG.host}:${CONFIG.port}`);

  try {
    // Giữ hostname gốc để Velocity nhận diện domain
    bot = mineflayer.createBot({
      host: CONFIG.host,
      port: CONFIG.port,
      username: CONFIG.username,
      version: CONFIG.version,
      auth: 'offline',
      hideErrors: false,
      checkTimeoutInterval: 60000,
      viewDistance: 6
    });
  } catch (err) {
    bot = null;
    lastError = err.message;
    log(`Create bot error: ${err.message}`);
    scheduleReconnect();
    return;
  }

  const currentBot = bot;

  currentBot.once('login', () => {
    online = true;
    reconnectDelay = CONFIG.reconnectDelay;
    lastError = null;
    loginSent = false;

    log('Logged in successfully');
    discord(`🟢 ${CONFIG.username} đã kết nối proxy`);
  });

  currentBot.once('spawn', () => {
    log('Spawned');

    // Chuyển từ lobby sang PvP
    setTimeout(() => {
      if (bot !== currentBot) return;

      log(`Switching to ${CONFIG.targetServer}`);
      currentBot.chat(`/server ${CONFIG.targetServer}`);

      // Bắt đầu Anti-AFK sau khi chuyển server
      setTimeout(() => {
        if (bot === currentBot && online) startAfk();
      }, 5000);
    }, 2000);
  });

  currentBot.on('message', message => {
    handleLogin(message.toString());
  });

  currentBot.on('kicked', reason => {
    disconnect(`Kicked: ${reason}`);
  });

  currentBot.on('error', err => {
    disconnect(`Error: ${err.message}`);
  });

  currentBot.on('end', reason => {
    disconnect(`End: ${reason || 'unknown'}`);
  });
}

function shutdown() {
  stopping = true;
  clearTimeout(reconnectTimer);
  stopAfk();

  if (bot) {
    const oldBot = bot;
    bot = null;
    try {
      oldBot.end();
    } catch {}
  }

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('uncaughtException', err => {
  log(`Exception: ${err.message}`);
  lastError = err.message;
});

process.on('unhandledRejection', err => {
  log(`Rejection: ${err}`);
});

log(`Server: ${CONFIG.host}:${CONFIG.port}`);
log(`Username: ${CONFIG.username}`);
log(`Target: ${CONFIG.targetServer}`);
log(`Anti-AFK: ${CONFIG.antiAfk}`);
connect();
