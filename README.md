# Bounty Royale

A 3D stick-figure melee .io game that runs in the browser. Real-time multiplayer,
instant guest join, 3 classes with different shapes and abilities, health-bar combat,
size-based growth, and varied igloo hiding spots. Free-to-play.

## Files
- `server.js` — the authoritative game server (Node + WebSocket). Runs the match and serves the page.
- `public/index.html` — the whole game client (Three.js). No build step.
- `package.json` — dependencies (express, ws).

## Run locally
1. Install Node.js 18+.
2. In this folder run: `npm install` then `npm start`.
3. Open http://localhost:3000 in your browser. Open it in two tabs to see multiplayer.

## Deploy online
See DEPLOY.md for click-by-click instructions (no coding).

## Tweak the game
Settings live at the top of `server.js`: `CLASSES`, `igloos`, `BND`.
