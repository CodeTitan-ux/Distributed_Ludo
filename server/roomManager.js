const gameManager = require('./gameManager');

const rooms = new Map(); // roomId -> { players: [{id, socketId, name, color}], status: 'WAITING' | 'PLAYING' }
const disconnectTimeouts = new Map(); // sessionId -> timeoutId

const handlePlayerLeave = (io, roomId, sessionId, isExplicitExit) => {
  const room = rooms.get(roomId);
  if (!room) return;

  const playerIndex = room.players.findIndex(p => p.id === sessionId);
  if (playerIndex === -1) return;

  const isHost = (playerIndex === 0);
  
  // Rule: If host exits, game terminates entirely
  if (isHost || (room.players.length === 1 && !room.players[0].isBot)) {
    if (room.status === 'PLAYING') {
      io.to(roomId).emit('error', 'Host has left. Game Terminated.');
      io.to(roomId).emit('room_deleted');
    }
    rooms.delete(roomId);
    broadcastRoomList(io);
  } else {
    // Non-host exits safely
    room.players.splice(playerIndex, 1);
    renumberBots(room);
    
    if (room.status === 'PLAYING' && room.gameInstance) {
      const gamePlayerIndex = room.gameInstance.players.findIndex(p => p.id === sessionId);
      if (gamePlayerIndex !== -1) {
        room.gameInstance.players.splice(gamePlayerIndex, 1);
        
        // Clamp turn index safely
        if (room.gameInstance.currentTurnIndex >= room.gameInstance.players.length) {
          room.gameInstance.currentTurnIndex = 0;
        }
      }
      
      // Default winner check (1 human remaining)
      const humansRemaining = room.gameInstance.players.filter(p => !p.isBot);
      if (humansRemaining.length === 1) {
        room.gameInstance.status = 'FINISHED';
        room.gameInstance.winner = humansRemaining[0].name;
        io.to(roomId).emit('play_sound', 'win');
      }
      
      io.to(roomId).emit('game_state_update', room.gameInstance.getState());
      if (room.gameInstance.status === 'PLAYING') {
        gameManager.triggerBotTurnIfNeeded(io, room.gameInstance);
      }
    }
    
    broadcastRoomUpdate(io, roomId, room);
    broadcastRoomList(io);
    io.to(roomId).emit('player_disconnect', sessionId);
  }
};

const renumberBots = (room) => {
  let botCount = 0;
  room.players.forEach(p => {
    if (p.isBot) {
      botCount++;
      p.name = `CPU Bot ${botCount}`;
    }
  });
};

const broadcastRoomUpdate = (io, roomId, room) => {
  io.to(roomId).emit('room_update', { roomId, players: room.players, status: room.status });
};

const broadcastRoomList = (io) => {
  const roomList = Array.from(rooms.entries())
    .filter(([id, room]) => room.status === 'WAITING')
    .map(([id, room]) => ({
      roomId: id,
      players: room.players.length,
      playerColors: room.players.map(p => p.color),
      status: room.status
    }));
  io.emit('room_list_update', roomList);
};

const handleConnection = (io, socket) => {
  // Send initial room list to the connecting client
  const initialRoomList = Array.from(rooms.entries())
    .filter(([id, room]) => room.status === 'WAITING')
    .map(([id, room]) => ({
      roomId: id,
      players: room.players.length,
      playerColors: room.players.map(p => p.color),
      status: room.status
    }));
  socket.emit('room_list_update', initialRoomList);

  socket.on('get_rooms', () => {
    broadcastRoomList(io);
  });

  socket.on('join_room', ({ roomId, playerName, preferredColor, sessionId }) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { players: [], status: 'WAITING', gameInstance: null });
    }
    
    const room = rooms.get(roomId);
    
    // Duplicate Check
    if (room.players.some(p => p.id === sessionId)) {
      socket.emit('error', 'You are already in this room');
      return;
    }
    if (room.players.some(p => p.name === playerName)) {
      socket.emit('error', 'Player name already taken in this room');
      return;
    }
    
    if (room.status === 'PLAYING') {
      socket.emit('error', 'Game already in progress');
      return;
    }

    if (room.players.length >= 4) {
      socket.emit('error', 'Room is full');
      return;
    }

    socket.join(roomId);
    socket.join(sessionId);

    const colors = ['red', 'blue', 'green', 'yellow'];
    const usedColors = room.players.map(p => p.color);
    
    let assignedColor;
    if (preferredColor && !usedColors.includes(preferredColor)) {
      assignedColor = preferredColor;
    } else {
      assignedColor = colors.find(c => !usedColors.includes(c));
    }

    room.players.push({
      id: sessionId,
      socketId: socket.id,
      name: playerName,
      color: assignedColor,
      isBot: false,
      lastRoll: 6
    });

    renumberBots(room);
    console.log(`${playerName} joined room ${roomId} as ${assignedColor}`);
    broadcastRoomUpdate(io, roomId, room);
    broadcastRoomList(io);
  });

  socket.on('rejoin_room', ({ roomId, sessionId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const player = room.players.find(p => p.id === sessionId);
    if (player) {
      player.socketId = socket.id;
      
      // CRITICAL: Sync socketId in gameInstance players too, as they are copies
      if (room.gameInstance) {
        const gamePlayer = room.gameInstance.players.find(p => p.id === sessionId);
        if (gamePlayer) {
          gamePlayer.socketId = socket.id;
        }
      }

      if (disconnectTimeouts.has(sessionId)) {
        clearTimeout(disconnectTimeouts.get(sessionId));
        disconnectTimeouts.delete(sessionId);
      }
      
      socket.join(roomId);
      socket.join(sessionId);
      
      socket.emit('room_update', { roomId, players: room.players, status: room.status });
      if (room.status === 'PLAYING' && room.gameInstance) {
        socket.emit('game_state_update', room.gameInstance.getState());
      }
    }
  });

  socket.on('add_bot', (roomId) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'WAITING') return;
    if (room.players.length >= 4) return;

    const colors = ['red', 'blue', 'green', 'yellow'];
    const usedColors = room.players.map(p => p.color);
    const assignedColor = colors.find(c => !usedColors.includes(c));

    room.players.push({
      id: `bot-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      name: `CPU Bot`, 
      color: assignedColor,
      isBot: true,
      lastRoll: 6
    });

    renumberBots(room);
    broadcastRoomUpdate(io, roomId, room);
    broadcastRoomList(io);
  });

  socket.on('remove_bot', ({ roomId, botId }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'WAITING') return;
    
    room.players = room.players.filter(p => p.id !== botId);
    renumberBots(room);
    broadcastRoomUpdate(io, roomId, room);
    broadcastRoomList(io);
  });

  socket.on('start_game', (roomId) => {
    const room = rooms.get(roomId);
    if (room && room.players.length >= 2) {
      room.status = 'PLAYING';
      room.gameInstance = gameManager.createGame(roomId, room.players);
      io.to(roomId).emit('game_state_update', room.gameInstance.getState());
      broadcastRoomUpdate(io, roomId, room);
      broadcastRoomList(io);
      gameManager.triggerBotTurnIfNeeded(io, room.gameInstance);
    }
  });

  socket.on('leave_room', ({ roomId, sessionId }) => {
    socket.leave(roomId);
    if (sessionId) socket.leave(sessionId);
    handlePlayerLeave(io, roomId, sessionId, true);
  });

  socket.on('delete_room', ({ roomId, sessionId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    // Only host (first player, assuming human) can delete
    if (room.players[0] && room.players[0].id === sessionId) {
      io.to(roomId).emit('room_deleted');
      rooms.delete(roomId);
      broadcastRoomList(io);
    } else {
      socket.emit('error', 'Only the host can delete the room');
    }
  });

  socket.on('send_message', ({ roomId, text, targetId = 'all' }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // Word count validation (max 200 words)
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > 200) {
      return socket.emit('error', 'Message too long! Max 200 words.');
    }

    const sender = room.players.find(p => p.socketId === socket.id);
    if (!sender) return;

    const payload = {
      id: `msg-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      senderId: sender.id,
      senderName: sender.name,
      text: text,
      timestamp: Date.now(),
      targetId: targetId
    };

    if (targetId === 'all') {
      io.to(roomId).emit('receive_message', payload);
    } else {
      // Send to recipient
      io.to(targetId).emit('receive_message', payload);
      // Send back to sender so they see it too
      socket.emit('receive_message', payload);
    }
  });

  // Delegate game actions to gameManager if game is active
  gameManager.handleGameEvents(io, socket, rooms);
};

const handleDisconnect = (io, socket) => {
  rooms.forEach((room, roomId) => {
    const player = room.players.find(p => p.socketId === socket.id);
    if (player && !player.isBot) {
      const sessionId = player.id;
      const timeoutId = setTimeout(() => {
        handlePlayerLeave(io, roomId, sessionId, false);
        disconnectTimeouts.delete(sessionId);
      }, 5000); // 5 seconds grace period for reload
      disconnectTimeouts.set(sessionId, timeoutId);
    }
  });
};

module.exports = {
  handleConnection,
  handleDisconnect
};
