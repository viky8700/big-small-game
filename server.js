const express = require('express');
const socketio = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 10000;

// Player database
const players = {};
const gameHistory = [];
let currentRound = 1;

app.use(express.static('public'));
app.use(express.json());

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/game', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// Player login API
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!players[username]) {
    // New player
    const hashedPassword = await bcrypt.hash(password, 10);
    players[username] = {
      password: hashedPassword,
      balance: 2000,
      bets: []
    };
    return res.json({ success: true, newUser: true });
  } else {
    // Existing player
    const match = await bcrypt.compare(password, players[username].password);
    if (match) {
      return res.json({ success: true, balance: players[username].balance });
    }
  }
  res.json({ success: false });
});

const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const io = socketio(server);

// Game state
let gameState = {
  phase: 'betting', // betting|results
  timer: 60,
  currentResult: null
};

// Socket.io logic
io.on('connection', (socket) => {
  socket.on('placeBet', (data) => {
    const player = players[data.username];
    if (player && player.balance >= data.amount) {
      player.balance -= data.amount;
      player.bets.push({
        amount: data.amount,
        choice: data.choice,
        round: currentRound
      });
      io.emit('balanceUpdate', { 
        username: data.username, 
        balance: player.balance 
      });
    }
  });

  socket.on('setResult', (result) => {
    gameState.currentResult = result;
    gameState.phase = 'results';
    gameHistory.push(result);
    
    // Calculate winnings
    Object.keys(players).forEach(username => {
      const player = players[username];
      player.bets.forEach(bet => {
        if (bet.round === currentRound && bet.choice === result.toLowerCase()) {
          player.balance += bet.amount * 2; // 1:1 payout
        }
      });
    });

    io.emit('resultSet', { 
      result,
      history: gameHistory 
    });

    // Start new round after 1 minute
    setTimeout(() => {
      currentRound++;
      gameState.phase = 'betting';
      gameState.timer = 60;
      io.emit('newRound', { 
        round: currentRound,
        timer: 60 
      });
    }, 60000);
  });
});

// Game timer
setInterval(() => {
  if (gameState.phase === 'betting') {
    gameState.timer--;
    io.emit('timerUpdate', gameState.timer);
  }
}, 1000);
