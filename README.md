# TAG Multiplayer Game

Realtime browser-based TAG game with room creation, player-count selection, multiple maps, shared round timer, rematches, and Socket.IO multiplayer sync.

## Run Locally

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

## Project Structure

- `server.js` - Express and Socket.IO game server
- `public/index.html` - game screens and lobby markup
- `public/style.css` - UI and canvas styling
- `public/game.js` - client-side input, rendering, and multiplayer state
