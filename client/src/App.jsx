import React, { useState, useEffect } from 'react';
import { useGameSocket } from './hooks/useGameSocket';
import Welcome from './components/Welcome';
import Room from './components/Room';
import GameBoard from './components/GameBoard';
import './App.css';

function App() {
  const [playMode, setPlayMode] = useState(() => sessionStorage.getItem('ludo_playMode'));

  useEffect(() => {
    if (playMode) {
      sessionStorage.setItem('ludo_playMode', playMode);
    } else {
      sessionStorage.removeItem('ludo_playMode');
    }
  }, [playMode]);

  useEffect(() => {
    // Disable native browser back navigation to prevent accidental disconnects
    window.history.pushState(null, null, window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, null, window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const { 
    socketId, 
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
  } = useGameSocket();

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Force confirmation dialog ONLY during active gameplay
      if (gameState && gameState.status === 'PLAYING') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // "Completely disable" refresh shortcuts ONLY during active gameplay
      if (gameState && gameState.status === 'PLAYING') {
        const isRefresh = 
          e.key === 'F5' || 
          ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r');
        
        if (isRefresh) {
          e.preventDefault();
          console.warn('Reload disabled during active gameplay.');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="main-logo">
          <span className="ludo-text">LUDO</span> <span className="legends-text">LEGENDS</span>
        </h1>
      </header>
      
      <main className="App-main">
        {error && <div className="global-error">{error}</div>}
        
        {!playMode && !gameState && !roomState ? (
          <Welcome onSelectMode={setPlayMode} sessionId={socketId} />
        ) : !gameState ? (
          <Room 
            socketId={socketId}
            roomState={roomState}
            rooms={rooms}
            joinRoom={joinRoom}
            sendMessage={sendMessage}
            startGame={startGame}
            addBot={addBot}
            removeBot={removeBot}
            leaveRoom={leaveRoom}
            deleteRoom={deleteRoom}
            error={error}
            messages={messages}
            isSinglePlayer={playMode === 'single'}
            goBack={() => setPlayMode(null)}
          />
        ) : (
          <GameBoard 
            socketId={socketId}
            gameState={gameState}
            rollDice={rollDice}
            moveToken={moveToken}
            togglePause={togglePause}
            leaveRoom={leaveRoom}
            sendMessage={sendMessage}
            messages={messages}
            rollingPlayerId={rollingPlayerId}
            isSinglePlayer={playMode === 'single' || gameState.roomId.startsWith('SP-')}
          />
        )}
      </main>
    </div>
  );
}

export default App;
