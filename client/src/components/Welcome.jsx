import React from 'react';
import './Welcome.css';

const Welcome = ({ onSelectMode, sessionId }) => {
  const [showRules, setShowRules] = React.useState(false);
  const [showAbout, setShowAbout] = React.useState(false);

  return (
    <div className="welcome-wrapper">
      <div className="welcome-utility-btns">
        <button className="util-btn" onClick={() => setShowRules(true)}>📜 Rules</button>
        <button className="util-btn" onClick={() => setShowAbout(true)}>🤝 About Us</button>
      </div>

      <div className="welcome-container">
        <h3 className="welcome-banner">Welcome to <span className="ludo-text">Ludo</span> <span className="legends-text">Legends</span></h3>
        <p>Select a game mode to continue</p>
      
      <div className="mode-selection">
        <button 
          className="mode-btn single-btn" 
          onClick={() => onSelectMode('single')}
        >
          <div className="icon-3d">
            <div className="token-3d blue-3d"></div>
            <div className="bot-3d">AI</div>
          </div>
          <h3>Single Player</h3>
          <p>Play against smart CPU opponents</p>
        </button>

        <button 
          className="mode-btn multi-btn" 
          onClick={() => onSelectMode('multi')}
        >
          <div className="icon-3d">
            <div className="token-stack">
              <div className="token-3d red-3d"></div>
              <div className="token-3d green-3d"></div>
              <div className="token-3d yellow-3d"></div>
            </div>
          </div>
          <h3>Multiplayer</h3>
          <p>Play online with friends</p>
        </button>
      </div>

      <div className="session-debugger">
        <span className="session-badge">Device ID: {sessionId ? sessionId.split('-').slice(-1)[0] : '...'}</span>
        <button className="reset-identity-btn" onClick={() => {
          sessionStorage.removeItem('ludo_sessionId');
          window.location.reload();
        }}>🔄 New Identity</button>
      </div>

      {showRules && (
        <div className="modal-overlay" onClick={() => setShowRules(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowRules(false)}>&times;</button>
            <h3>Ludo Legends Rulebook</h3>
            <div className="rules-scrollable">
              <section>
                <h4>🎲 Dice Mechanics</h4>
                <ul>
                  <li>Roll a <strong>6</strong> to bring a token out of the base and onto the starting square.</li>
                  <li>Rolling a 6 grants an <strong>Extra Turn</strong>.</li>
                  <li>You can roll up to two 6s in a row; a third 6 is ignored, and the turn ends.</li>
                </ul>
              </section>
              <section>
                <h4>🏃 Movement & Combat</h4>
                <ul>
                  <li>Tokens move clockwise along the board path based on your roll.</li>
                  <li><strong>Capture:</strong> If you land on a cell occupied by a single opponent, their token is <strong>eliminated</strong> and sent back to base!</li>
                  <li><strong>Safe Zones (★):</strong> Tokens on star-marked squares or the colored starting squares cannot be captured.</li>
                </ul>
              </section>
              <section>
                <h4>🏁 The Home Run</h4>
                <ul>
                  <li>Once a piece completes the full circuit, it enters its colored Home Run path.</li>
                  <li>You must roll the <strong>exact number</strong> required to land in the center Home.</li>
                  <li>Reach Home with all <strong>4 tokens</strong> to claim the title of <strong>Ludo Legend!</strong></li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}

      {showAbout && (
        <div className="modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowAbout(false)}>&times;</button>
            <h3>About Ludo Legends</h3>
            <p>A premium distributed multiplayer experience designed for high-speed kinetic gameplay and professional-grade competition.</p>
            <p>Built with React, Node.js, and Socket.io for real-time precision.</p>
          </div>
        </div>
      )}
    </div>
  </div>
);
};

export default Welcome;
