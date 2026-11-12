
const mineflayer = require('mineflayer');
const http = require('http');

let bot = null;
let retry = null;
let swingTimer = null;
let stopped = false;
let status = 'connecting';

function connect() {
  if (stopped || bot) return;

  status = 'connecting';

  const current = mineflayer.createBot({
    host: '9a3smp.mcsh.gg',
    port: 25565,
    username: 'Bot_AFK_247_6',
    viewDistance: 'tiny'
  });

  bot = current;

  current.once('spawn', () => {
    status = 'connected';
    console.log('Bot 6 connected');

    swingTimer = setInterval(() => {
      if (bot === current && current.entity) {
        try { current.swingArm('right'); } catch {}
      }
    }, 30000);
  });

  current.on('error', err => console.log(err.message));

  current.once('end', () => {
    if (bot !== current) return;

    bot = null;
    status = 'disconnected';
    clearInterval(swingTimer);

    if (!stopped) {
      retry = setTimeout(() => {
        retry = null;
        connect();
      }, 30000);
    }
  });
}

http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json'
  });

  res.end(JSON.stringify({
    bot: 'Bot 6',
    status
  }));
}).listen(process.env.PORT || 3000, '0.0.0.0');

function shutdown() {
  stopped = true;
  clearTimeout(retry);
  clearInterval(swingTimer);
  if (bot) bot.quit();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

connect();
