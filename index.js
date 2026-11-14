const mineflayer = require('mineflayer');
const http = require('http');

let bot = null;
let status = 'connecting';
let moveTimer = null;

function connect() {
  const current = mineflayer.createBot({
    host: '9a3smp.mcsh.gg',
    port: 25565,
    username: 'Bot_6',
    version: false
  });

  bot = current;

  current.once('spawn', () => {
    status = 'connected';
    console.log('Bot 6 connected');

    setTimeout(() => {
      if (bot === current) {
        current.chat('/server pvp');
        console.log('Switching to PvP...');
      }
    }, 2000);

    let direction = false;

    moveTimer = setInterval(() => {
      if (bot !== current || !current.entity) return;

      direction = !direction;

      current.setControlState('forward', direction);
      current.setControlState('back', !direction);
    }, 5000);
  });

  current.on('end', () => {
    if (bot !== current) return;

    clearInterval(moveTimer);
    moveTimer = null;
    bot = null;
    status = 'disconnected';

    console.log('Bot 6 disconnected');
  });

  current.on('error', err => {
    console.log('Bot 6 error:', err.message);
  });
}

connect();
