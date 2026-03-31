import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import { soundEngine } from '../utils/SoundEngine';

const SERVER_URL = 'http://localhost:3001';

export const useGameSocket = () => {
  const socketRef = useRef(null);
  const [gameState, setGameState] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [rollingPlayerId, setRollingPlayerId] = useState(null);

  const [sessionId] = useState(() => {
    let sid = sessionStorage.getItem('ludo_sessionId');
    if (!sid) {
      sid = `sess-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      sessionStorage.setItem('ludo_sessionId', sid);
    }
    return sid;
  });

  useEffect(() => {
    socketRef.current = io(SERVER_URL);
    
    socketRef.current.on('connect', () => {
      const lastRoomId = sessionStorage.getItem('ludo_lastRoomId');
      if (lastRoomId) {
        socketRef.current.emit('rejoin_room', { roomId: lastRoomId, sessionId });
      }
    });
    
    socketRef.current.on('room_update', (data) => {
      setRoomState(data);
    });
    
    socketRef.current.on('room_list_update', (roomList) => {
      setRooms(roomList);
    });

    socketRef.current.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      // 30 second auto-expiry
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== msg.id));
      }, 30000);
    });

    socketRef.current.on('game_state_update', (state) => {
      setGameState(state);
    });

    socketRef.current.on('dice_rolling', (playerId) => {
      soundEngine.playRoll();
      setRollingPlayerId(playerId);
      setTimeout(() => setRollingPlayerId(null), 600);
    });

    socketRef.current.on('play_sound', (sound) => {
      if (sound === 'hop') soundEngine.playHop();
      if (sound === 'capture') soundEngine.playCapture();
      if (sound === 'win') soundEngine.playWin();
    });

    socketRef.current.on('room_deleted', () => {
      setGameState(null);
      setRoomState(null);
      setError('Room was deleted by the host.');
      setTimeout(() => setError(''), 3000);
    });

    socketRef.current.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const joinRoom = (roomId, playerName, preferredColor) => {
    sessionStorage.setItem('ludo_lastRoomId', roomId);
    socketRef.current.emit('join_room', { roomId, playerName, preferredColor, sessionId });
  };

  const sendMessage = (roomId, text, targetId = 'all') => {
    socketRef.current.emit('send_message', { roomId, text, targetId });
  };

  const startGame = (roomId) => {
    socketRef.current.emit('start_game', roomId);
  };

  const rollDice = (roomId) => {
    socketRef.current.emit('roll_dice', roomId);
  };

  const moveToken = (roomId, tokenIndex) => {
    socketRef.current.emit('move_token', { roomId, tokenIndex });
  };

  const addBot = (roomId) => {
    socketRef.current.emit('add_bot', roomId);
  };

  const removeBot = (roomId, botId) => {
    socketRef.current.emit('remove_bot', { roomId, botId });
  };

  const leaveRoom = (roomId) => {
    sessionStorage.removeItem('ludo_lastRoomId');
    socketRef.current.emit('leave_room', { roomId, sessionId });
    setGameState(null);
    setRoomState(null);
  };

  const deleteRoom = (roomId) => {
    sessionStorage.removeItem('ludo_lastRoomId');
    socketRef.current.emit('delete_room', { roomId, sessionId });
  };

  const togglePause = (roomId) => {
    socketRef.current.emit('toggle_pause', roomId);
  };

  return {
    socketId: sessionId,
    gameState,
    roomState,
    rooms,
    messages,
    error,
    joinRoom,
    sendMessage,
    startGame,
    addBot,
    removeBot,
    leaveRoom,
    deleteRoom,
    togglePause,
    rollDice,
    moveToken,
    rollingPlayerId
  };
};
