<p align="center">
  <img src="client/public/favicon.png" alt="Ludo Legends Banner" width="120" />
</p>

<h1 align="center">LUDO LEGENDS</h1>

<p align="center">
  <em>A distributed, real-time multiplayer Ludo experience built for competitive play.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Node.js-Express%205-339933?logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socket.io" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/License-ISC-blue" alt="License" />
</p>

---

## Table of Contents

- [Project Overview](#-project-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation Guide](#-installation-guide)
- [Running the Project](#-running-the-project)
- [Technical Architecture](#-technical-architecture)
- [Game Rules](#-game-rules)
- [Future Roadmap](#-future-roadmap)
- [Contributing](#-contributing)
- [Credits](#-credits)

---

## ◈ Project Overview

**Ludo Legends** is a premium, distributed multiplayer board game that brings the classic Ludo experience into the browser with real-time networking, animated token movement, intelligent CPU opponents, and a rich immersive UI.

Players connect from different devices or browsers and compete on a shared 15x15 virtual board. The server orchestrates all game logic — dice rolls, token movement, captures, and victory conditions — ensuring a fair, cheat-resistant, and synchronized experience for every participant.

Whether you're playing solo against the CPU or battling friends across the network, every match is rendered with smooth hop-by-hop animations, 3D CSS dice, procedural audio feedback, and a polished lobby system.

---

## ◈ Features

### ◇ Gameplay

| Feature | Description |
|---|---|
| **Single Player Mode** | Play against 1–3 smart CPU bots with priority-based AI |
| **Multiplayer Mode** | Host or join rooms; play with 2–4 players across devices |
| **Standard Ludo Rules** | 52-cell circular path, 4 tokens per player, safe zones, home runs |
| **Token Capture** | Land on an opponent's token to send it back to base (reverse-hop animation) |
| **Bonus Turns** | Roll a 6, capture a token, or reach Home to earn an extra turn |
| **Exact Home Entry** | Tokens must roll the exact number to enter the center Home |
| **Auto-Move** | When only one valid move exists, it is automatically executed for human players |
| **Pause / Resume** | Host can pause the game; a cinematic blur overlay appears for all players |

### ◇ User Interface & Experience

| Feature | Description |
|---|---|
| **3D CSS Dice** | Fully animated, perspective-rendered cube with pip faces |
| **Hop-by-Hop Animation** | Tokens move cell-by-cell with 250ms steps synchronized to sound |
| **Reverse Capture Animation** | Captured tokens retrace their path back to base at high speed |
| **Procedural Sound Engine** | Web Audio API generates dice rolls, hops, captures, and victory fanfares — no audio files needed |
| **Mute Control** | Toggle all sounds on or off mid-game |
| **In-Game Chat** | Send messages to all players or direct-message a specific opponent |
| **Victory Leaderboard** | Full rankings overlay with medals (Gold, Silver, Bronze) at game end |
| **Color Preference** | Choose your preferred banner color (Red, Blue, Green, Yellow) when joining |

### ◇ Fairness & Transparency

| Feature | Description |
|---|---|
| **Server-Side Dice** | All rolls use Node.js `crypto.randomInt()` — cryptographically secure and tamper-proof |
| **Server-Authoritative Logic** | Move validation, capture detection, and win conditions are computed entirely on the server |
| **Turn Enforcement** | Only the current player's socket can trigger a dice roll or token move |
| **Anti-Double-Roll Guard** | The server blocks duplicate rolls within the same turn |
| **Session Persistence** | Players receive a stable `sessionId` stored in `sessionStorage`, surviving page reloads |
| **5-Second Reconnect Grace** | On disconnect, the server waits 5 seconds before removing a player, allowing seamless reconnection |
| **Navigation Protection** | During active gameplay, the browser back button, F5, and Ctrl+R are intercepted to prevent accidental disconnects |

### ◇ Distribution & Networking

| Feature | Description |
|---|---|
| **Room-Based Architecture** | Each match is isolated in its own room with independent game state |
| **Live Room Discovery** | The Multiplayer Hub shows all active waiting rooms with real-time occupancy indicators |
| **Host Controls** | The room creator (host) has exclusive authority to start the game, delete the room, or add/remove bots |
| **Bot Management** | Add or remove CPU bots from the lobby before the game starts |
| **Graceful Exit Handling** | If the host leaves, the room is terminated; if a non-host leaves, the game adapts and continues |

---

## ◈ Tech Stack

### Client

| Technology | Purpose |
|---|---|
| **React 19** | Component-based UI with hooks (`useState`, `useEffect`, `useRef`) |
| **Vite 8** | Lightning-fast HMR dev server and optimized production builds |
| **Socket.IO Client 4.8** | Bi-directional real-time event communication with the server |
| **Web Audio API** | Procedural sound generation (dice, hops, captures, victory) |
| **CSS3** | Grid layout, 3D transforms, perspective rendering, animations, glassmorphism |

### Server

| Technology | Purpose |
|---|---|
| **Node.js + Express 5** | HTTP server foundation |
| **Socket.IO 4.8** | WebSocket-based real-time event handling with room support |
| **Node `crypto` Module** | `crypto.randomInt()` for cryptographically fair dice rolls |
| **CORS** | Cross-origin resource sharing for distributed client access |

---

## ◈ Project Structure

```
ludo-distributed-game/
├── client/                          # React frontend (Vite)
│   ├── public/
│   │   ├── favicon.png              # Game favicon
│   │   └── icons.svg                # SVG icon set
│   ├── src/
│   │   ├── assets/                  # Static images (hero.png)
│   │   ├── components/
│   │   │   ├── Welcome.jsx          # Landing page — mode selection, rules, about
│   │   │   ├── Welcome.css
│   │   │   ├── Room.jsx             # Lobby — join/host rooms, player cards, bot mgmt
│   │   │   ├── Room.css
│   │   │   ├── GameBoard.jsx        # Main game — board rendering, dice, chat, victory
│   │   │   ├── GameBoard.css
│   │   │   └── VictoryEffects.css   # Victory overlay animations
│   │   ├── hooks/
│   │   │   └── useGameSocket.js     # Central Socket.IO hook — manages all server events
│   │   ├── utils/
│   │   │   └── SoundEngine.js       # Web Audio API procedural sound generator
│   │   ├── App.jsx                  # Root component — navigation, state orchestration
│   │   ├── App.css
│   │   ├── index.css                # Global styles and design tokens
│   │   └── main.jsx                 # React DOM entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                          # Node.js backend
│   ├── server.js                    # Express + Socket.IO bootstrap (port 3001)
│   ├── roomManager.js               # Room lifecycle — join, leave, rejoin, chat, delete
│   ├── gameManager.js               # Game orchestration — dice, moves, animations, bots
│   ├── gameLogic.js                 # Pure game rules — validation, captures, AI, win
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## ◈ Installation Guide

### Prerequisites

- **Node.js** v18 or higher — [Download](https://nodejs.org/)
- **npm** (included with Node.js)
- A modern web browser (Chrome, Firefox, Edge, Safari)

### Step 1 — Clone the Repository

```bash
git clone https://github.com/CodeTitan-ux/Distributed_Ludo.git
cd Distributed_Ludo
```

### Step 2 — Install Server Dependencies

```bash
cd server
npm install
```

### Step 3 — Install Client Dependencies

```bash
cd ../client
npm install
```

---

## ◈ Running the Project

### Start the Game Server

Open a terminal and run:

```bash
cd server
node server.js
```

The server will start on **port 3001** (or the value of `PORT` in your environment).

```
Ludo game server running on port 3001
```

### Start the Client Dev Server

In a **second terminal**, run:

```bash
cd client
npm run dev
```

Vite will launch on [http://localhost:5173](http://localhost:5173) (default).

### Play Across Devices

To play multiplayer across devices on the same network:

1. Find your machine's local IP address (e.g., `192.168.x.x`).
2. Update the `SERVER_URL` in `client/src/hooks/useGameSocket.js`:
   ```javascript
   const SERVER_URL = 'http://192.168.x.x:3001';
   ```
3. Start both server and client.
4. Open `http://192.168.x.x:5173` on each device's browser.
5. One player creates a room; others join using the same Room ID.

### Production Build

```bash
cd client
npm run build
```

The optimized output is generated in `client/dist/`.

---

## ◈ Technical Architecture

### High-Level Diagram

```
┌─────────────────────┐         WebSocket (Socket.IO)         ┌──────────────────────┐
│                     │ ◄──────────────────────────────────► │                      │
│   React Client      │         Bi-directional Events         │   Node.js Server     │
│   (Vite + React 19) │                                       │   (Express + Socket) │
│                     │                                       │                      │
│  ┌───────────────┐  │   join_room / room_update             │  ┌────────────────┐  │
│  │  Welcome.jsx  │  │   start_game / game_state_update      │  │ roomManager.js │  │
│  │  Room.jsx     │──│── roll_dice / dice_rolling ──────────│──│ gameManager.js │  │
│  │  GameBoard.jsx│  │   move_token / play_sound             │  │ gameLogic.js   │  │
│  └───────────────┘  │   send_message / receive_message      │  └────────────────┘  │
│                     │                                       │                      │
│  ┌───────────────┐  │                                       │  ┌────────────────┐  │
│  │useGameSocket  │  │                                       │  │ crypto.randomInt│  │
│  │SoundEngine    │  │                                       │  │ (Fair Dice)    │  │
│  └───────────────┘  │                                       │  └────────────────┘  │
└─────────────────────┘                                       └──────────────────────┘
```

### Data Flow

1. **Connection** — Client connects via `Socket.IO`. The hook `useGameSocket` manages all real-time events.
2. **Session Identity** — A unique `sessionId` is generated per browser tab and stored in `sessionStorage`. This ID is used for all server communication instead of the volatile `socket.id`.
3. **Room Lifecycle** — `roomManager.js` handles `join_room`, `rejoin_room`, `leave_room`, `delete_room`, `add_bot`, `remove_bot`, and `send_message` events. Room state is broadcast to all participants.
4. **Game Start** — When the host emits `start_game`, `gameManager.createGame()` initializes each player with 4 tokens at position `-1` (base) and begins the turn cycle.
5. **Dice Roll** — On `roll_dice`, the server emits `dice_rolling` (triggering the 3D spin animation), waits 600ms, generates a `crypto.randomInt(1, 7)` value, and broadcasts the updated state.
6. **Token Movement** — A validated move triggers `executeTokenMove()`, which emits incremental state updates every 250ms (hop-by-hop). After all hops, `evaluatePostMove()` checks for captures and wins.
7. **Capture Mechanics** — If a token lands on an occupied non-safe cell, `handleCapture()` returns the victim's data. `executeReverseMove()` animates the captured token back to base at 60ms per step.
8. **Bot AI** — `getBotMove()` uses a priority scoring system: Home entry (5) > Capture (4) > Enter board (3) > Standard move (1), with a 25% randomization factor for human-like unpredictability.
9. **Victory** — When a player's 4 tokens reach position `57`, they are added to `rankings[]`. The game ends when all but one player has finished.

### Core Server Modules

| Module | Responsibility |
|---|---|
| `server.js` | Bootstrap Express, initialize Socket.IO with CORS, delegate to `roomManager` |
| `roomManager.js` | Room CRUD, player join/leave/rejoin, bot management, chat relay, disconnect grace period |
| `gameManager.js` | Game instance creation, dice rolling with animation sync, token movement orchestration, bot turn scheduling |
| `gameLogic.js` | Pure game rules: move validation, absolute position mapping, safe zone checks, capture detection, win condition, bot AI |

### Core Client Modules

| Module | Responsibility |
|---|---|
| `App.jsx` | Root component; manages navigation state (`playMode`), renders Welcome / Room / GameBoard; protects against accidental page unloads |
| `Welcome.jsx` | Mode selection (Single / Multi), rules modal, about modal, session identity display |
| `Room.jsx` | Multiplayer Hub with live room list, join form, lobby view with player cards and bot management |
| `GameBoard.jsx` | 15x15 CSS Grid board, absolute token positioning, 3D dice rendering, in-game chat, pause overlay, victory leaderboard |
| `useGameSocket.js` | Custom React hook encapsulating all Socket.IO events and emitters; manages `gameState`, `roomState`, `messages`, and `rollingPlayerId` |
| `SoundEngine.js` | Singleton class using the Web Audio API to synthesize dice, hop, capture, and victory sounds procedurally via oscillators |

---

## ◈ Game Rules

<table>
<tr><td width="30"><strong>1</strong></td><td><strong>Entering the Board</strong> — Roll a <strong>6</strong> to move a token from base onto the starting square (position 0).</td></tr>
<tr><td><strong>2</strong></td><td><strong>Movement</strong> — Tokens travel clockwise around the 52-cell ring based on the dice value.</td></tr>
<tr><td><strong>3</strong></td><td><strong>Bonus Turn</strong> — Rolling a 6, capturing an opponent, or reaching Home grants an extra turn.</td></tr>
<tr><td><strong>4</strong></td><td><strong>Capture</strong> — Landing on a cell occupied by an opponent sends their token back to base. Tokens on <strong>safe zones (★)</strong> cannot be captured.</td></tr>
<tr><td><strong>5</strong></td><td><strong>Home Run</strong> — After completing the full circuit, tokens enter a color-specific 5-cell home run path.</td></tr>
<tr><td><strong>6</strong></td><td><strong>Exact Entry</strong> — A token must roll the exact number to land on the center Home (position 57).</td></tr>
<tr><td><strong>7</strong></td><td><strong>Victory</strong> — The first player to move all 4 tokens to Home is crowned <strong>Ludo Legend</strong>.</td></tr>
</table>

**Safe Zones** are located at 8 positions on the board, marked with a ★ star. Tokens resting on these cells are immune to capture.

---

## ◈ Future Roadmap

- **Spectator Mode** — Allow non-players to watch live matches in real-time
- **Persistent Leaderboards** — Database-backed player rankings across sessions
- **Custom Rule Variants** — Configurable house rules (e.g., triple-six penalty, team mode)
- **Match Replays** — Record and replay completed games move-by-move
- **Mobile-First Redesign** — Touch-optimized layout for smartphones and tablets
- **Deployment Pipeline** — Docker containerization with cloud hosting support

---

## ◈ Contributing

Contributions are welcome. To get started:

1. **Fork** the repository.
2. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit** your changes with clear, descriptive messages.
4. **Push** to your fork and open a **Pull Request** against `main`.

Please ensure your code follows the existing project conventions and includes appropriate comments for any new game logic.

---

## ◈ Credits

**Ludo Legends** is an open-source project developed by [CodeTitan-ux](https://github.com/CodeTitan-ux).

Built with React, Node.js, Socket.IO, and the Web Audio API.

---

<p align="center">
  <em>Roll the dice. Claim the throne. Become a <strong>Legend</strong>.</em>
</p>
