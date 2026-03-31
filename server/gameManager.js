const crypto = require('crypto');

const createGame = (roomId, players) => {
  // Ludo standard setup
  return {
    roomId,
    players: players.map(p => ({
      ...p,
      tokens: [-1, -1, -1, -1], // -1 indicates inside base home
      score: 0,
      activeTokens: 0,
      lastRoll: p.lastRoll || 6
    })),
    currentTurnIndex: 0,
    lastDiceRoll: null,
    status: 'PLAYING',
    winner: null,
    rankings: [], // Sequential order of finishers
    isMoving: false,
    
    getState() {
      return {
        roomId: this.roomId,
        players: this.players,
        currentTurnIndex: this.currentTurnIndex,
        lastDiceRoll: this.lastDiceRoll,
        status: this.status,
        winner: this.winner,
        rankings: this.rankings
      };
    }
  };
};

const executeReverseMove = (io, roomId, game, capturedPlayer, tokenIndex, startPos) => {
  let currentStep = startPos;
  const reverseInterval = setInterval(() => {
    currentStep--;
    
    if (currentStep <= -1) {
      clearInterval(reverseInterval);
      capturedPlayer.tokens[tokenIndex] = -1;
      io.to(roomId).emit('game_state_update', game.getState());
    } else {
      capturedPlayer.tokens[tokenIndex] = currentStep;
      io.to(roomId).emit('game_state_update', game.getState());
      io.to(roomId).emit('play_sound', 'hop');
    }
  }, 60); // High-speed snap-back animation
};

const finalizeMove = (io, roomId, game, player, tokenIndex, diceValue) => {
  const gameLogic = require('./gameLogic');
  const result = gameLogic.evaluatePostMove(game, player, tokenIndex);

  if (result.capturedTokens && result.capturedTokens.length > 0) {
    io.to(roomId).emit('play_sound', 'capture');
    result.capturedTokens.forEach(cap => {
      const capturedPlayer = game.players.find(p => p.id === cap.playerId);
      if (capturedPlayer) {
        executeReverseMove(io, roomId, game, capturedPlayer, cap.tokenIndex, cap.startPos);
      }
    });
  }

  if (!result.gotBonus && diceValue !== 6) {
    game.currentTurnIndex = (game.currentTurnIndex + 1) % game.players.length;
  }
  
  if (result.winner && !game.rankings.includes(player.id)) {
    game.rankings.push(player.id);
    io.to(roomId).emit('play_sound', 'win');
    
    // Check if the game should finish
    // Classic Ludo: Finish when all but one player have reached home
    if (game.rankings.length >= game.players.length - 1) {
      game.status = 'FINISHED';
      game.winner = game.players.find(p => p.id === game.rankings[0]).name;
    }
  }

  game.isMoving = false;
  game.lastDiceRoll = null;
  io.to(roomId).emit('game_state_update', game.getState());
  if (game.status === 'PLAYING') {
    triggerBotTurnIfNeeded(io, game);
  }
};

const executeTokenMove = (io, roomId, game, player, tokenIndex, diceValue) => {
  const startPos = player.tokens[tokenIndex];

  if (startPos === -1 && diceValue === 6) {
    player.tokens[tokenIndex] = 0;
    finalizeMove(io, roomId, game, player, tokenIndex, diceValue);
    return;
  }

  let currentStep = 0;
  const hopInterval = setInterval(() => {
    currentStep++;
    player.tokens[tokenIndex] = startPos + currentStep;
    io.to(roomId).emit('game_state_update', game.getState());
    io.to(roomId).emit('play_sound', 'hop');

    if (currentStep === diceValue) {
      clearInterval(hopInterval);
      finalizeMove(io, roomId, game, player, tokenIndex, diceValue);
    }
  }, 250); // Synchronized with CSS transition
};

const triggerBotTurnIfNeeded = (io, game) => {
  if (game.status !== 'PLAYING') return;
  const gameLogic = require('./gameLogic');
  const currentPlayer = game.players[game.currentTurnIndex];
  
  if (currentPlayer.isBot) {
    setTimeout(() => {
      if (game.status !== 'PLAYING' || game.lastDiceRoll !== null) return;

      io.to(game.roomId).emit('dice_rolling', currentPlayer.id);

      // Wait for the synchronous 3D dice animation spin on all clients
      setTimeout(() => {
        // Re-verify after timeout
        if (game.lastDiceRoll !== null) return;

        const diceValue = crypto.randomInt(1, 7);
        game.lastDiceRoll = diceValue;
        currentPlayer.lastRoll = diceValue;
        
        const hasValidMove = gameLogic.hasValidMoves(currentPlayer, diceValue);
        io.to(game.roomId).emit('game_state_update', game.getState());
        
        if (!hasValidMove) {
          setTimeout(() => {
            if (diceValue !== 6) {
              game.currentTurnIndex = (game.currentTurnIndex + 1) % game.players.length;
            }
            game.lastDiceRoll = null;
            io.to(game.roomId).emit('game_state_update', game.getState());
            triggerBotTurnIfNeeded(io, game);
          }, 1500);
        } else {
          setTimeout(() => {
            const moveIndex = gameLogic.getBotMove(game, currentPlayer, diceValue);
            if (moveIndex !== null) {
              executeTokenMove(io, game.roomId, game, currentPlayer, moveIndex, diceValue);
            }
          }, 1500);
        }
      }, 600);
    }, 1500);
  }
};

const handleGameEvents = (io, socket, rooms) => {
  const gameLogic = require('./gameLogic');

  socket.on('toggle_pause', (roomId) => {
    const room = rooms.get(roomId);
    if (!room || !room.gameInstance) return;
    const game = room.gameInstance;

    if (game.status === 'PLAYING') {
      game.status = 'PAUSED';
    } else if (game.status === 'PAUSED') {
      game.status = 'PLAYING';
      triggerBotTurnIfNeeded(io, game);
    }
    io.to(roomId).emit('game_state_update', game.getState());
  });

  socket.on('roll_dice', (roomId) => {
    const room = rooms.get(roomId);
    if (!room || !room.gameInstance) return;

    const game = room.gameInstance;
    if (game.status === 'PAUSED') return socket.emit('error', 'Game is paused!');
    
    // Validate turn
    const currentPlayer = game.players[game.currentTurnIndex];
    if (currentPlayer.socketId !== socket.id) {
      return socket.emit('error', 'Not your turn!');
    }

    if (game.lastDiceRoll !== null) {
      return socket.emit('error', 'Dice already rolled.');
    }

    io.to(roomId).emit('dice_rolling', currentPlayer.id);

    // Wait for the synchronous 3D dice animation spin
    setTimeout(() => {
      if (game.lastDiceRoll !== null) return;

      const diceValue = crypto.randomInt(1, 7);
      game.lastDiceRoll = diceValue;
      currentPlayer.lastRoll = diceValue;
      
      const validIndices = gameLogic.getValidMoveIndices(currentPlayer, diceValue);
      io.to(roomId).emit('game_state_update', game.getState());
      
      if (validIndices.length === 0) {
        setTimeout(() => {
          if (diceValue !== 6) {
            game.currentTurnIndex = (game.currentTurnIndex + 1) % game.players.length;
          }
          game.lastDiceRoll = null;
          io.to(roomId).emit('game_state_update', game.getState());
          triggerBotTurnIfNeeded(io, game);
        }, 1500);
      } else if (validIndices.length === 1 && !currentPlayer.isBot) {
        // Auto-move for human if only one option
        setTimeout(() => {
          if (game.lastDiceRoll !== null && !game.isMoving) {
            game.isMoving = true;
            executeTokenMove(io, roomId, game, currentPlayer, validIndices[0], diceValue);
          }
        }, 1000);
      }
    }, 600);
  });

  socket.on('move_token', ({ roomId, tokenIndex }) => {
    const room = rooms.get(roomId);
    if (!room || !room.gameInstance) return;

    const game = room.gameInstance;
    if (game.status === 'PAUSED') return socket.emit('error', 'Game is paused!');
    const currentPlayer = game.players[game.currentTurnIndex];

    if (currentPlayer.socketId !== socket.id) {
      return socket.emit('error', 'Not your turn!');
    }

    if (game.lastDiceRoll === null) {
      return socket.emit('error', 'Roll the dice first!');
    }

    if (game.isMoving) return; // Prevent multiple simultaneous moves

    const validation = gameLogic.validateMove(currentPlayer, tokenIndex, game.lastDiceRoll);
    if (!validation.valid) {
       return socket.emit('error', validation.message);
    }
    
    // Valid move, orchestrate animation
    game.isMoving = true;
    executeTokenMove(io, roomId, game, currentPlayer, tokenIndex, game.lastDiceRoll);
  });
};

module.exports = {
  createGame,
  handleGameEvents,
  triggerBotTurnIfNeeded
};
