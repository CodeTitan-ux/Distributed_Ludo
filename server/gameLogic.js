// Ludo paths: 
// The central paths have 52 cells (0-51).
// Bases are -1. 
// Home run paths are 52-56.
// Home is 57.

// Safe spots on the 52-cell path
const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];

// Each color has a different starting position offset on the absolute board
const START_OFFSETS = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

const hasValidMoves = (player, diceValue) => {
  for (let i = 0; i < 4; i++) {
    const pos = player.tokens[i];
    if (pos === -1 && diceValue === 6) return true; // Can enter board
    if (pos >= 0 && pos < 57) {
      if (pos + diceValue <= 57) return true; // Can move
    }
  }
  return false;
};

const getValidMoveIndices = (player, diceValue) => {
  const indices = [];
  for (let i = 0; i < 4; i++) {
    const pos = player.tokens[i];
    if (pos === -1 && diceValue === 6) {
      indices.push(i);
    } else if (pos >= 0 && pos < 57) {
      if (pos + diceValue <= 57) {
        indices.push(i);
      }
    }
  }
  return indices;
};

const getAbsolutePosition = (color, relativePos) => {
  if (relativePos < 0 || relativePos >= 52) return null; // Home run path doesn't map to absolute 52-cell ring
  return (START_OFFSETS[color] + relativePos) % 52;
};

const handleCapture = (game, movingPlayer, absoluteDest) => {
  if (SAFE_SPOTS.includes(absoluteDest)) return []; 
  
  const capturedInfo = [];
  game.players.forEach(opponent => {
    if (opponent.id === movingPlayer.id) return;
    
    opponent.tokens.forEach((pos, tokenIndex) => {
      if (pos >= 0 && pos < 52) {
        const oppAbsolutePos = getAbsolutePosition(opponent.color, pos);
        if (oppAbsolutePos === absoluteDest) {
          capturedInfo.push({
            playerId: opponent.id,
            tokenIndex: tokenIndex,
            startPos: pos
          });
        }
      }
    });
  });
  return capturedInfo;
};

// The old moveToken function is removed, as logic is handled by validateMove and evaluatePostMove orchestrator in gameManager

const getBotMove = (game, player, diceValue) => {
  let validChoices = [];
  for (let i = 0; i < 4; i++) {
    const pos = player.tokens[i];
    if (pos === -1 && diceValue === 6) {
      validChoices.push({ index: i, priority: 3, progress: -1 });
    } else if (pos >= 0 && pos + diceValue <= 57) {
      const newPos = pos + diceValue;
      let priority = 1;
      
      // Capture check
      if (newPos < 52) {
        const absoluteDest = getAbsolutePosition(player.color, newPos);
        if (!SAFE_SPOTS.includes(absoluteDest)) {
           const opponentThere = game.players.some(opp => 
             opp.id !== player.id && opp.tokens.some(t => t >= 0 && t < 52 && getAbsolutePosition(opp.color, t) === absoluteDest)
           );
           if (opponentThere) priority = 4; // High priority: capture
        }
      }
      
      // Home check
      if (newPos === 57) priority = 5; // Highest priority: reach home
      
      validChoices.push({ index: i, priority, progress: pos });
    }
  }

  if (validChoices.length === 0) return null;

  // Add randomization to simulate human-like dynamic decisions
  validChoices.forEach(c => {
    c.fuzz = Math.random();
  });

  // Sort by highest priority, then fuzz randomness for equal-priority moves
  validChoices.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    // 25% chance to deviate from strictly picking the furthest token
    if (b.fuzz > 0.75) return b.fuzz - a.fuzz;
    return b.progress - a.progress; // Usually push the furthest piece
  });
  
  return validChoices[0].index;
};

const validateMove = (player, tokenIndex, diceValue) => {
  const pos = player.tokens[tokenIndex];
  if (pos === -1 && diceValue !== 6) return { valid: false, message: 'Need a 6 to enter board' };
  if (pos >= 0 && pos + diceValue > 57) return { valid: false, message: 'Need exact roll to enter home' };
  if (pos === 57) return { valid: false, message: 'Token already at home' };
  return { valid: true };
};

const evaluatePostMove = (game, player, tokenIndex) => {
  const newPos = player.tokens[tokenIndex];
  let gotBonus = false;
  let capturedTokens = [];

  // Check Capture if on main ring
  if (newPos >= 0 && newPos < 52) {
    const absoluteDest = getAbsolutePosition(player.color, newPos);
    capturedTokens = handleCapture(game, player, absoluteDest);
    if (capturedTokens.length > 0) {
      gotBonus = true;
      // Note: tokens are NOT set to -1 here; gameManager handles reverse-hop
    }
  } else if (newPos === 57) {
    gotBonus = true; 
  }

  // Check Win Condition
  const hasWon = player.tokens.every(pos => pos === 57);

  return { success: true, gotBonus, winner: hasWon, capturedTokens };
};

module.exports = {
  hasValidMoves,
  getValidMoveIndices,
  getAbsolutePosition,
  getBotMove,
  validateMove,
  evaluatePostMove
};
