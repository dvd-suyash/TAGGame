const fs = require('fs');

// 1. Update server.js
let serverCode = fs.readFileSync('server.js', 'utf8');

// Add world update loop
const updateWorldCode = `
// Network optimization: 20Hz world update loop
setInterval(() => {
    for (const roomCode in rooms) {
        const room = rooms[roomCode];
        if (!room || room.players.length === 0) continue;

        // Pack players into Float32Array: [playerNumber, x, y, velocityX, velocityY, isIt]
        const buffer = new Float32Array(room.players.length * 6);
        for (let i = 0; i < room.players.length; i++) {
            const p = room.players[i];
            buffer[i * 6 + 0] = p.number;
            buffer[i * 6 + 1] = p.x;
            buffer[i * 6 + 2] = p.y;
            buffer[i * 6 + 3] = p.velocityX;
            buffer[i * 6 + 4] = p.velocityY;
            buffer[i * 6 + 5] = p.isIt ? 1 : 0;
        }
        io.to(roomCode).emit('tick', buffer.buffer);
    }
}, 50);
`;

// Insert the interval right before io.on('connection')
serverCode = serverCode.replace("io.on('connection', (socket) => {", updateWorldCode + "\nio.on('connection', (socket) => {");

// Remove the instant broadcast from playerMove
serverCode = serverCode.replace("socket.to(socket.roomCode).emit('playerMoved', player);", "// Broadcast moved to 20Hz tick");

fs.writeFileSync('server.js', serverCode);

// 2. Update public/js/network.js
let networkCode = fs.readFileSync('public/js/network.js', 'utf8');

// Add the 'tick' listener
const tickListener = `
    socket.on('tick', (buffer) => {
        if (!state.roundActive) return;
        const view = new Float32Array(buffer);
        for (let i = 0; i < view.length; i += 6) {
            const pNumber = view[i];
            const px = view[i + 1];
            const py = view[i + 2];
            const pvx = view[i + 3];
            const pvy = view[i + 4];
            const pisIt = view[i + 5] === 1;

            const targetPlayer = Object.values(state.players).find(p => p.number === pNumber);
            if (targetPlayer && targetPlayer.id !== state.myPlayerId) {
                targetPlayer.targetX = px;
                targetPlayer.targetY = py;
                targetPlayer.velocityX = pvx;
                targetPlayer.velocityY = pvy;
                targetPlayer.isIt = pisIt;
            }
        }
    });
`;

networkCode = networkCode.replace("socket.on('playerMoved', (playerData) => {", tickListener + "\n    socket.on('playerMoved', (playerData) => { // keep legacy just in case");
fs.writeFileSync('public/js/network.js', networkCode);

// 3. Update public/js/physics.js for interpolation and throttling
let physicsCode = fs.readFileSync('public/js/physics.js', 'utf8');

// Add interpolation logic inside updateRemotePlayers
physicsCode = physicsCode.replace(
    "export function updateRemotePlayers(deltaTime) {",
    `let lastEmitTime = 0;
export function updateRemotePlayers(deltaTime) {
    for (const id in state.players) {
        if (id === state.myPlayerId) continue;
        const p = state.players[id];
        if (p.targetX !== undefined) {
            p.x += (p.targetX - p.x) * 10 * deltaTime;
            p.y += (p.targetY - p.y) * 10 * deltaTime;
        }
    }`
);

// Throttle playerMove emit
physicsCode = physicsCode.replace(
    "socket.emit('playerMove', {",
    `const now = Date.now();
    if (now - lastEmitTime > 50) {
        lastEmitTime = now;
        socket.emit('playerMove', {`
);

// close the bracket for the throttle check
physicsCode = physicsCode.replace(
    "velocityY: player.velocityY\n    });",
    "velocityY: player.velocityY\n    });\n    }"
);

fs.writeFileSync('public/js/physics.js', physicsCode);
console.log('Patched network code!');
