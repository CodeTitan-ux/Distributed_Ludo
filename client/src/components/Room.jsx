import React, { useState, useEffect } from 'react';
import './Room.css';

const Room = ({ socketId, roomState, rooms, joinRoom, startGame, addBot, removeBot, leaveRoom, deleteRoom, error, isSinglePlayer, goBack }) => {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [preferredColor, setPreferredColor] = useState('red');
  const [joinedRoomId, setJoinedRoomId] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    if (isSinglePlayer) {
      setRoomId(`SP-${Math.floor(Math.random()*10000)}`);
    } else {
      setRoomId('');
    }
  }, [isSinglePlayer]);

  // Watcher: Sync joinedRoomId with server roomState if we are in a match
  useEffect(() => {
    if (roomState && !joinedRoomId) {
      setJoinedRoomId(roomState.roomId);
    } else if (!roomState && joinedRoomId) {
      setJoinedRoomId(null);
    }
  }, [roomState, joinedRoomId]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (roomId && playerName) {
      joinRoom(roomId, playerName, preferredColor);
      setJoinedRoomId(roomId);
    }
  };

  const isHost = roomState?.players[0]?.id === socketId;

  const handleLeaveConfirm = () => {
    if (isHost) {
      deleteRoom(roomState.roomId);
    } else {
      leaveRoom(roomState.roomId);
    }
    setJoinedRoomId(null);
    setShowExitConfirm(false);
  };

  // 1. Room Joined View (Lobby) - Priority 1
  if (roomState) {
    return (
      <div className="room-container">
        <h2>{isSinglePlayer || roomState.roomId.startsWith('SP-') ? 'Single Player Match' : `Room: ${roomState.roomId}`}</h2>
        {error && <div className="error-banner">{error}</div>}
        
        <div className="players-list">
          <h3>Players ({roomState.players.length}/4)</h3>
          <ul className="player-cards">
            {roomState.players.map((p, idx) => (
              <li key={idx} className={`player-card ${p.isBot ? 'bot-card' : ''}`} style={{ borderLeft: `6px solid ${p.color}` }}>
                <div className="player-info">
                  {p.isBot ? (
                    <div className="bot-avatar-3d" style={{ background: `linear-gradient(135deg, ${p.color}, #1e293b)`, borderColor: p.color }}>
                       <div className="bot-chip">AI</div>
                    </div>
                  ) : (
                    <div className="user-avatar">{p.name.charAt(0).toUpperCase()}</div>
                  )}
                  <div className="player-details">
                    <span className="player-name">{p.name} {p.id === socketId && '(You)'}</span>
                    <span className="player-status">{p.isBot ? 'Ludo Legend AI' : 'Human Player'}</span>
                  </div>
                </div>
                {p.isBot && isHost && roomState.status === 'WAITING' && (
                  <button className="remove-bot-btn" onClick={() => removeBot(roomState.roomId, p.id)} title="Remove Bot">
                    &times;
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
          {roomState.players.length < 4 && roomState.status === 'WAITING' && (
            <button className="start-btn" style={{ background: 'linear-gradient(135deg, #a855f7, #7e22ce)' }} onClick={() => addBot(roomState.roomId)}>
              + Add CPU Bot
            </button>
          )}

          {roomState.players.length >= 2 && roomState.status === 'WAITING' && isHost && (
            <button className="start-btn" onClick={() => startGame(roomState.roomId)}>
              Start Game
            </button>
          )}

          <button 
            className="start-btn" 
            style={{ background: '#334155' }} 
            onClick={() => setShowExitConfirm(true)}
          >
            Leave Lobby
          </button>
        </div>
        {roomState.status === 'PLAYING' && <p>Game is starting...</p>}

        {showExitConfirm && (
          <div className="confirm-modal-overlay">
            <div className="confirm-modal">
              <h2>Leave Lobby?</h2>
              {isHost && !isSinglePlayer ? (
                <p>As the <strong>Host</strong>, leaving will delete this room and remove all other players. Are you sure?</p>
              ) : (
                <p>Are you sure you want to exit this {isSinglePlayer ? 'match' : 'lobby'}?{isSinglePlayer && ' You will lose your progress.'}</p>
              )}
              <div className="confirm-btns">
                <button className="btn-no" onClick={() => setShowExitConfirm(false)}>Stay</button>
                <button className="btn-yes" onClick={handleLeaveConfirm}>Yes, Leave</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Lobby List (for Multiplayer Hub) - Priority 2
  if (!isSinglePlayer && !joinedRoomId) {
    return (
      <div className="room-container lobby-hub-view">
        <div className="hub-header">
          <div className="hub-header-title">
            <h2>MULTIPLAYER HUB</h2>
          </div>
          <p className="subtitle">Discover active matches or forge a new legend.</p>
        </div>

        <div className="hub-layout">
          <div className="active-matches-pane">
            <div className="pane-header">
              <h3>Live Matches</h3>
              <span className="live-badge">LIVE</span>
            </div>
            
            {rooms.length === 0 ? (
              <div className="empty-matches-view">
                <div className="empty-icon">🎲</div>
                <p>No active matches yet.</p>
              </div>
            ) : (
              <div className="matches-grid">
                {rooms.map(room => (
                  <div key={room.roomId} className="match-card">
                    <div className="card-top">
                      <span className="match-id">#{room.roomId.split('-').pop()}</span>
                      <div className="occupancy-slots">
                        {[0, 1, 2, 3].map(i => (
                          <div 
                            key={i} 
                            className={`slot-pip ${room.playerColors?.[i] || ''}`} 
                            title={room.playerColors?.[i] ? `Occupied by ${room.playerColors[i]}` : 'Empty'}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="card-body">
                      <div className="player-count">
                        <strong>{room.players}</strong>/4 Players
                      </div>
                    </div>

                    <button 
                      className="premium-join-btn"
                      onClick={() => setRoomId(room.roomId)}
                    >
                      SELECT ARENA
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="hub-back-pane-footer">
              <button className="elite-btn secondary hub-bottom-back-btn" onClick={goBack}>
                ❮ BACK TO MENU
              </button>
            </div>
          </div>

          <div className="lobby-actions-pane">
             <div className="action-card create-card">
               <h4>HOST MATCH</h4>
               <button className="elite-btn primary" onClick={() => setRoomId(`Room-${Math.floor(Math.random()*10000)}`)}>
                 Create New Room
               </button>
             </div>

             <div className="action-card join-card">
                <h4>ENTER ROOM</h4>
                {error && <div className="hub-error">{error}</div>}
                <div className="hub-form">
                  <input 
                    type="text" 
                    placeholder="Enter Room ID" 
                    value={roomId} 
                    onChange={(e) => setRoomId(e.target.value)} 
                  />
                  <input 
                    type="text" 
                    placeholder="Commander Name" 
                    value={playerName} 
                    onChange={(e) => setPlayerName(e.target.value)} 
                  />
                  
                  <div className="hub-color-picker">
                    <p>Select Banner:</p>
                    <div className="hub-swatches">
                      {['red', 'blue', 'green', 'yellow'].map(color => (
                        <button
                          key={color}
                          type="button"
                          className={`hub-swatch ${color}-swatch ${preferredColor === color ? 'selected' : ''}`}
                          onClick={() => setPreferredColor(color)}
                        />
                      ))}
                    </div>
                  </div>

                  <button 
                    className="elite-btn join" 
                    onClick={handleJoin} 
                    disabled={!playerName || !roomId}
                  >
                    JOIN MATCH
                  </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="room-container join-form">
      <h2>{isSinglePlayer ? 'Single Player Setup' : 'Join Ludo Game'}</h2>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleJoin}>
        {!isSinglePlayer && (
          <input 
            type="text" 
            placeholder="Room ID" 
            value={roomId} 
            onChange={(e) => setRoomId(e.target.value)} 
            required 
          />
        )}
        <input 
          type="text" 
          placeholder="Your Name" 
          value={playerName} 
          onChange={(e) => setPlayerName(e.target.value)} 
          required 
        />

        <div className="color-picker-section">
          <p>Choose Your Color:</p>
          <div className="color-swatches">
            {['red', 'blue', 'green', 'yellow'].map(color => (
              <button
                key={color}
                type="button"
                className={`color-swatch ${color}-swatch ${preferredColor === color ? 'selected' : ''}`}
                onClick={() => setPreferredColor(color)}
                title={color}
              />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="elite-btn secondary" onClick={goBack} style={{ flex: 1 }}>
            Back
          </button>
          <button type="submit" className="elite-btn primary" style={{ flex: 1 }}>
            {isSinglePlayer ? 'Create Match' : 'Join Room'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Room;
