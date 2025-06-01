io.on('connection', (socket) => {
  // Add player balance tracking
  socket.on('placeBet', (data) => {
    const player = players[data.username];
    if (player && player.balance >= data.amount) {
      player.balance -= data.amount;
      io.emit('balanceUpdate', {
        username: data.username,
        balance: player.balance
      });
    }
  });

  // Enhanced admin controls
  socket.on('adminAction', (data) => {
    if (players[data.username]?.isAdmin) {
      if (data.action === 'setResult') {
        // Process wins/losses
        Object.values(players).forEach(player => {
          if (!player.isAdmin) {
            // Your existing win/loss logic here
          }
        });
      } else if (data.action === 'adjustBalance') {
        players[data.targetUser].balance += data.amount;
      }
    }
  });
});
