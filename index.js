current.once('spawn', () => {
  status = 'connected';
  console.log('Bot 6 connected');

  // Chuyển sang server PvP
  setTimeout(() => {
    if (bot === current) {
      current.chat('/server pvp');
      console.log('Switching to PvP...');
    }
  }, 2000);

  // Di chuyển liên tục
  let direction = false;

  moveTimer = setInterval(() => {
    if (bot !== current || !current.entity) return;

    direction = !direction;

    current.setControlState('forward', direction);
    current.setControlState('back', !direction);
  }, 5000);
});
