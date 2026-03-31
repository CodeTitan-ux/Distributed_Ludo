import React, { useState } from 'react';
import './GameBoard.css';
import './VictoryEffects.css';
import { soundEngine } from '../utils/SoundEngine';

// 52 absolute path coordinates
const ABSOLUTE_PATH = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0]
];

const SAFE_LOCATIONS = [
  '6,1', '2,6', '1,8', '6,12', '8,13', '12,8', '13,6', '8,2'
];

const START_OFFSETS = { red: 0, green: 13, yellow: 26, blue: 39 };

const HOME_RUNS = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
};

const getBoardCellCoord = (color, pos) => {
  if (pos === -1) return `base-${color}`;
  if (pos === 57) return `home`;
  
  if (pos >= 0 && pos < 52) {
    const absPos = (START_OFFSETS[color] + pos) % 52;
    const [r, c] = ABSOLUTE_PATH[absPos];
    return `${r},${c}`;
  }
  
  // Home run
  if (pos >= 52 && pos <= 56) {
    const idx = pos - 52;
    const [r, c] = HOME_RUNS[color][idx];
    return `${r},${c}`;
  }
  return null;
};

const GameBoard = ({ socketId, gameState, rollDice, moveToken, togglePause, leaveRoom, sendMessage, messages, rollingPlayerId, isSinglePlayer }) => {
  const [expandedChats, setExpandedChats] = useState([]);
  const { players, currentTurnIndex, lastDiceRoll, winner } = gameState;
  const currentTurnPlayer = players[currentTurnIndex];
  const isMyTurn = currentTurnPlayer.id === socketId && gameState.status === 'PLAYING';
  const myPlayer = players.find((p) => p.id === socketId) || players[0];
  const [isMuted, setIsMuted] = useState(soundEngine.muted);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatTarget, setChatTarget] = useState('all'); // 'all' or specific socketId

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(gameState.roomId, chatInput.trim(), chatTarget);
    setChatInput('');
    // Reset textarea height
    const textarea = document.getElementById('chat-textarea');
    if (textarea) textarea.style.height = '38px';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputResize = (e) => {
    setChatInput(e.target.value);
    e.target.style.height = '38px'; // Reset to auto-calculate height properly
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const toggleTarget = () => {
    const others = players.filter(p => p.id !== socketId);
    if (others.length === 0) return;

    const targets = ['all', ...others.map(p => p.id)];
    const currentIndex = targets.indexOf(chatTarget);
    const nextIndex = (currentIndex + 1) % targets.length;
    setChatTarget(targets[nextIndex]);
  };

  const getTargetColor = () => {
    if (chatTarget === 'all') return 'all'; // Special pseudo-color for 'all' mode
    return players.find(p => p.id === chatTarget)?.color;
  };

  const getTargetName = () => {
    if (chatTarget === 'all') return 'All';
    return players.find(p => p.id === chatTarget)?.name || 'Direct';
  };

  const toggleChat = (color) => {
    setExpandedChats(prev => 
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  const handleRoll = () => {
    rollDice(gameState.roomId);
  };

  // Group tokens by cell coordinate
  const tokensByCell = {};
  players.forEach((player) => {
    player.tokens.forEach((pos, idx) => {
      const coordId = getBoardCellCoord(player.color, pos);
      if (!tokensByCell[coordId]) tokensByCell[coordId] = [];
      tokensByCell[coordId].push({
        color: player.color, 
        playerId: player.id,
        tokenIndex: idx,
        id: idx,
        isClickable: isMyTurn && player.id === socketId
      });
    });
  });

  const renderToken = (token, index, total, isAbsolute = false) => {
    let offsetStyle = {};
    if (!isAbsolute && total > 1) {
      // Slight stack offset when multiple on same non-absolute square (e.g. Home)
      offsetStyle = { transform: `translate(${index * 4}px, -${index * 4}px)` };
    }
    const isMovable = isMyTurn && token.color === myPlayer.color && !rollingPlayerId;

    return (
      <div 
        className={`token-piece bg-${token.color} ${isMovable ? 'glow' : ''}`}
        style={offsetStyle}
        onClick={isMovable ? () => moveToken(gameState.roomId, token.id) : undefined}
        title={`Token ${token.id}`}
      ></div>
    );
  };

  const renderAbsoluteTokens = () => {
    return Object.entries(tokensByCell).map(([cellKey, tokensInCell]) => {
      // Home and bases handled conventionally
      if (cellKey === 'home' || cellKey.startsWith('base')) return null;
      
      const [r, c] = cellKey.split(',').map(Number);
      
      return tokensInCell.map((t, index) => {
        const topPercent = (r / 15) * 100;
        const leftPercent = (c / 15) * 100;

        // Grouping stack offsets
        const offset = tokensInCell.length > 1 ? index * 6 : 0;
        
        const style = {
          position: 'absolute',
          top: `${topPercent}%`,
          left: `${leftPercent}%`,
          width: `${100/15}%`,
          height: `${100/15}%`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transform: `translate(${offset}px, -${offset}px)`,
          transition: 'top 0.25s linear, left 0.25s linear, transform 0.25s',
          zIndex: 40 + index
        };

        return (
          <div key={`abs-${t.color}-${t.id}`} style={style} className="token-absolute-wrapper">
             {renderToken(t, index, tokensInCell.length, true)}
          </div>
        );
      });
    });
  };

  const renderDicePipFace = (value) => {
    return Array(value).fill(0).map((_, i) => <div key={i} className="pip" />);
  };

  const renderChatBox = (color) => {
    if (isSinglePlayer) return null;
    const player = players.find(p => p.color === color);
    if (!player) return null;

    const playerMessages = messages.filter(m => m.senderId === player.id);
    const isMyPlayer = player.id === socketId;
    const isExpanded = expandedChats.includes(color);
    
    // Only show for my player or if there's activity
    if (playerMessages.length === 0 && !isMyPlayer && !isExpanded) return null;

    return (
      <div className={`chat-box-area chat-pos-${color} ${isExpanded ? 'expanded' : 'collapsed'}`}>
        {/* Toggle Icon */}
        <button 
          className={`chat-toggle-btn ${color} ${playerMessages.length > 0 ? 'has-new' : ''}`}
          onClick={() => toggleChat(color)}
          title="Toggle Chat"
        >
          {isExpanded ? '✕' : '💬'}
        </button>

        {isExpanded && (
          <div className="chat-content-shell bounce-in">
            <div className={`chat-box-header ${color}`}>MATCH CHAT</div>
            <div className="message-container">
              {playerMessages.map(msg => (
                <div key={msg.id} className="chat-message-bubble">
                  {msg.text}
                </div>
              ))}
            </div>
            
            {isMyPlayer && (
              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <textarea 
                  id="chat-textarea"
                  className="chat-textarea"
                  placeholder={chatTarget === 'all' ? "Chat..." : `To ${getTargetName()}...`} 
                  value={chatInput}
                  onChange={handleInputResize}
                  onKeyDown={handleKeyDown}
                  maxLength={200}
                  rows={1}
                />
                <div className="chat-actions-row">
                  <button 
                    type="button" 
                    className={`chat-target-btn ${getTargetColor()}`}
                    onClick={toggleTarget}
                    title={`Targeting: ${getTargetName()}`}
                  >
                    {chatTarget === 'all' ? '👥' : '👤'}
                  </button>
                  <button type="submit" className={`chat-send-btn ${color}`}>SEND</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPlayerPanel = (color) => {
    const player = players.find(p => p.color === color);
    if (!player) return null;
    
    const isCurrentTurn = currentTurnPlayer.color === color;
    
    return (
      <div className={`player-panel panel-${color} ${isCurrentTurn ? 'active-panel' : ''}`}>
        <div className="panel-avatar">{player.name}</div>
        
        <div className="dice-container-3d" style={{ 
              opacity: isCurrentTurn ? 1 : 0,
              pointerEvents: isCurrentTurn ? 'auto' : 'none',
              transform: isCurrentTurn ? 'scale(1)' : 'scale(0.5)',
              transition: 'all 0.3s'
            }}>
          <div 
            className={`dice-cube ${rollingPlayerId === player.id ? 'rolling' : `show-${player.lastRoll}`}`}
            onClick={isCurrentTurn && isMyTurn && !lastDiceRoll && !rollingPlayerId ? handleRoll : undefined}
          >
            <div className="dice-face front face-1">{renderDicePipFace(1)}</div>
            <div className="dice-face back face-6">{renderDicePipFace(6)}</div>
            <div className="dice-face right face-3">{renderDicePipFace(3)}</div>
            <div className="dice-face left face-4">{renderDicePipFace(4)}</div>
            <div className="dice-face top face-2">{renderDicePipFace(2)}</div>
            <div className="dice-face bottom face-5">{renderDicePipFace(5)}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderBase = (color, gridArea) => {
    const baseTokens = tokensByCell[`base-${color}`] || [];
    const isCurrentTurn = currentTurnPlayer.color === color;
    return (
      <div className={`ludo-base base-${color} ${isCurrentTurn ? 'active-base' : ''}`} style={{ gridArea }}>
        <div className="base-inner">
          {[0, 1, 2, 3].map(slot => {
             const t = baseTokens[slot];
             return (
               <div key={slot} className="base-slot">
                  {t && renderToken(t, 0, 1)}
               </div>
             );
          })}
        </div>
      </div>
    );
  };

  const renderGridCells = () => {
    const cells = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        // Skip bases and center
        if ((r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c < 6) || (r > 8 && c > 8)) continue;
        if (r >= 6 && r <= 8 && c >= 6 && c <= 8) continue;
        
        const coordId = `${r},${c}`;
        const isSafe = SAFE_LOCATIONS.includes(coordId);
        
        let colorClass = '';
        if (r === 7 && c >= 1 && c <= 5) colorClass = 'cell-red';
        if (c === 7 && r >= 1 && r <= 5) colorClass = 'cell-green';
        if (r === 7 && c >= 9 && c <= 13) colorClass = 'cell-yellow';
        if (c === 7 && r >= 9 && r <= 13) colorClass = 'cell-blue';
        
        // Start safe zones
        if (coordId === '6,1') colorClass = 'cell-red';
        if (coordId === '1,8') colorClass = 'cell-green';
        if (coordId === '8,13') colorClass = 'cell-yellow';
        if (coordId === '13,6') colorClass = 'cell-blue';

        cells.push(
          <div 
          key={`cell-${r}-${c}`} 
          className={`ludo-cell ${colorClass} ${isSafe ? 'safe-star' : ''}`}
          style={{ gridArea: `${r+1} / ${c+1} / ${r+2} / ${c+2}` }}
        >
          {isSafe && <span className="star">★</span>}
          {/* Tokens are now rendered absolutely over the board */}
        </div>);
      }
    }
    return cells;
  };

  const VictoryOverlay = () => {
    if (gameState.status !== 'FINISHED') return null;

    // Calculate full rankings (including those who didn't finish)
    const finishedIds = gameState.rankings;
    const remainingIds = players
      .filter(p => !finishedIds.includes(p.id))
      .map(p => p.id);
    
    const fullRankIds = [...finishedIds, ...remainingIds];

    const getOrdinal = (n) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const getMedal = (index) => {
      if (index === 0) return '🥇';
      if (index === 1) return '🥈';
      if (index === 2) return '🥉';
      return '🎖️';
    };

    return (
      <div className="victory-overlay">
        <div className="victory-card">
          <div className="victory-glow"></div>
          <div className="trophy-container">🏆</div>
          <h2 className="victory-title">Ludo Legends Champion!</h2>
          <p className="victory-subtitle">The battle has ended. Honor the victors!</p>
          
          <div className="leaderboard-premium">
            {fullRankIds.map((pid, index) => {
              const p = players.find(player => player.id === pid);
              if (!p) return null;
              const isWinner = index === 0;
              
              return (
                <div key={pid} className={`leaderboard-item rank-${index + 1} ${isWinner ? 'winner-item' : ''}`}>
                  <div className="rank-medal">{getMedal(index)}</div>
                  <div className="player-info">
                    <span className="rank-text">{getOrdinal(index + 1)} Place</span>
                    <span className="player-name">{p.name} {p.id === socketId ? '(You)' : ''}</span>
                  </div>
                  <div className="player-indicator" style={{ background: p.color }}></div>
                </div>
              );
            })}
          </div>

          <button className="return-home-btn" onClick={() => leaveRoom(gameState.roomId)}>
            RETURN TO LOBBY
          </button>
        </div>
      </div>
    );
  };

  const ExitConfirmModal = () => {
    if (!showExitConfirm) return null;
    const isHost = players[0]?.id === socketId;

    return (
      <div className="confirm-modal-overlay">
        <div className="confirm-modal">
          <h2>Exit Game?</h2>
          {isHost && !isSinglePlayer ? (
            <p>As the <strong>Host</strong>, leaving will delete this room and remove all other players. Are you sure?</p>
          ) : (
            <p>Are you sure you want to leave the current match? You will lose your progress.</p>
          )}
          <div className="confirm-btns">
            <button className="btn-no" onClick={() => setShowExitConfirm(false)}>No, Stay</button>
            <button className="btn-yes" onClick={() => leaveRoom(gameState.roomId)}>Yes, Exit</button>
          </div>
        </div>
      </div>
    );
  };

  // The winner logic is now handled by VictoryOverlay in the main return
  // Old simple screen removed


  return (
    <div className="game-board-container">
      <div className="game-status-panel">
        <h3>Room: {gameState.roomId}</h3>
        <div className={`turn-alert ${isMyTurn ? 'my-turn glow-pulse' : ''}`}>
          {isMyTurn ? "Your Turn!" : `${currentTurnPlayer.name}'s Turn`}
        </div>

        <div className="legend">
          <p>Your Color: <strong className={`text-${myPlayer.color}`}>{myPlayer.color.toUpperCase()}</strong></p>
        </div>
      </div>

      <div className="game-controls" style={{ display: 'flex', gap: '15px', justifyContent: 'center', width: '100%', maxWidth: '700px', marginBottom: '10px' }}>
        <button 
          className="action-btn" 
          style={{ background: '#64748b', padding: '8px 16px', fontSize: '1rem' }} 
          onClick={() => setIsMuted(soundEngine.toggleMute())}
        >
          {isMuted ? '🔇 Unmute' : '🔊 Mute'}
        </button>
        <button 
          className="action-btn" 
          style={{ background: gameState.status === 'PAUSED' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '8px 16px', fontSize: '1rem' }} 
          onClick={() => togglePause(gameState.roomId)}
        >
          {gameState.status === 'PAUSED' ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button 
          className="action-btn" 
          style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', padding: '8px 16px', fontSize: '1rem'  }} 
          onClick={() => setShowExitConfirm(true)}
        >
          ⏏ Leave Game
        </button>
      </div>

      <VictoryOverlay />
      <ExitConfirmModal />

      <div className="board-wrapper">
        {renderPlayerPanel('red')}
        {renderPlayerPanel('green')}
        {renderPlayerPanel('blue')}
        {renderPlayerPanel('yellow')}

        {/* Independent Chat Layer */}
        {renderChatBox('red')}
        {renderChatBox('green')}
        {renderChatBox('blue')}
        {renderChatBox('yellow')}

        <div className="ludo-grid" style={{ position: 'relative' }}>
          {gameState.status === 'PAUSED' && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', WebkitBackdropFilter: 'blur(5px)', backdropFilter: 'blur(5px)',
              zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center',
              borderRadius: '12px'
            }}>
              <h2 style={{ fontSize: '3rem', color: '#f59e0b', textShadow: '0 0 20px #f59e0b', margin: 0, animation: 'txtPulse 2s infinite alternate' }}>GAME PAUSED</h2>
            </div>
          )}

          {renderBase('red', '1 / 1 / 7 / 7')}
          {renderBase('green', '1 / 10 / 7 / 16')}
          {renderBase('blue', '10 / 1 / 16 / 7')}
          {renderBase('yellow', '10 / 10 / 16 / 16')}

          {/* Center Home Triangle Graphic Area */}
          <div className="home-center" style={{ gridArea: '7 / 7 / 10 / 10' }}>
             {['red', 'green', 'yellow', 'blue'].map(c => {
                const finishedTokens = (tokensByCell['home'] || []).filter(t => t.color === c);
                if (finishedTokens.length === 0) return null;
                
                let style = { position: 'absolute', width: '33.33%', height: '33.33%', display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center' };
                if (c === 'red') { style.left = '5%'; style.top = '33.33%'; }
                if (c === 'green') { style.top = '5%'; style.left = '33.33%'; }
                if (c === 'yellow') { style.right = '5%'; style.top = '33.33%'; }
                if (c === 'blue') { style.bottom = '5%'; style.left = '33.33%'; }

                return (
                  <div key={`home-${c}`} style={style}>
                    {finishedTokens.map((t, i) => (
                      <div key={i} style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                         {renderToken(t, i, finishedTokens.length, true)}
                      </div>
                    ))}
                  </div>
                );
             })}
          </div>

          {renderGridCells()}
          <div className="tokens-absolute-container">
            {renderAbsoluteTokens()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
