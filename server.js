{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "express-session": "^1.17.3"
  }
}const express = require('express');
const socketio = require('socket.io');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Game state
let gameState = {
  phase: 'betting',
  currentResult: null,
  round: 7,
  timer: 60,
  bets: {
    big: { total: 2450, players: 12 },
    small: { total: 1780, players: 8 }
  },
  activePlayers: 20,
  history: [
    { round: 6, result: 'BIG', change: '+200' },
    { round: 5, result: 'SMALL', change: '-100' },
    { round: 4, result: 'BIG', change: '+350' }
  ]
};

app.use(express.static('public'));

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const io = socketio(server);

io.on('connection', (socket) => {
  // Send current game state
  socket.emit('gameUpdate', gameState);
  
  // Handle player bets
  socket.on('placeBet', (data) => {
    gameState.bets[data.choice].total += data.amount;
    gameState.bets[data.choice].players++;
    gameState.activePlayers++;
    
    // Add to admin log
    const logEntry = {
      player: `Player${Math.floor(Math.random() * 100)}`,
      amount: data.amount,
      choice: data.choice,
      time: `${Math.floor(Math.random() * 60)}s ago`
    };
    
    io.emit('betPlaced', logEntry);
  });
  
  // Admin controls
  socket.on('setResult', (result) => {
    gameState.currentResult = result;
    gameState.phase = 'results';
    gameState.history.unshift({
      round: gameState.round,
      result: result,
      change: result === 'BIG' ? '+200' : '-100'
    });
    
    io.emit('resultSet', result);
    
    // Start new round after 5 seconds
    setTimeout(() => {
      gameState.phase = 'betting';
      gameState.round++;
      gameState.timer = 60;
      gameState.bets = { big: { total: 0, players: 0 }, small: { total: 0, players: 0 }};
      gameState.activePlayers = 0;
      io.emit('newRound', gameState);
    }, 5000);
  });
});

// Game timer
setInterval(() => {
  if (gameState.phase === 'betting') {
    gameState.timer--;
    io.emit('timerUpdate', gameState.timer);
    
    if (gameState.timer <= 0) {
      gameState.timer = 60;
    }
  }
}, 1000);
