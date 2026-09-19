import { state } from './state.js';
import { ui, setActiveScreen, showError, showRoundBanner, hideRoundBanner, updateRoleDisplay, updateTimerDisplay, showGameOverScreen, hideGameOverScreen, renderLobbyUI } from './ui.js';
import * as constants from './constants.js';
import { socket } from './network.js';
import { getMapDefinition, initPlatforms, updatePlatforms } from './map.js';
import { initializePlayers, updateRemotePlayers, updatePlayer, checkCollisions } from './physics.js';
import { draw } from './render.js';

// Setup basic map definitions array for host to cycle through
const availableMaps = ['map1', 'map2', 'map3', 'map4', 'map5'];

// Check if we were already in a game
if (state.gameStarted) {
    setActiveScreen('gameScreen');
} else {
    setActiveScreen('homeScreen');
}

// --- Home Screen Actions ---
const btnHostMatch = document.getElementById('btnHostMatch');
if (btnHostMatch) {
    btnHostMatch.addEventListener('click', () => {
        state.selectedMaxPlayers = 4;
        state.selectedMapId = 'map1';
        socket.emit('createRoom', { maxPlayers: 4, mapId: 'map1', roundDuration: 75 });
    });
}

const btnJoinMatch = document.getElementById('btnJoinMatch');
const joinCodeInput = document.getElementById('joinCodeInput');
if (btnJoinMatch && joinCodeInput) {
    btnJoinMatch.addEventListener('click', () => {
        const code = joinCodeInput.value.trim().toUpperCase();
        if (code.length > 0) {
            socket.emit('joinRoom', code);
        } else {
            showError("Enter a room code.");
        }
    });
    joinCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btnJoinMatch.click();
    });
}

// --- Lobby Actions (Host Only) ---
const btnPrevMap = document.getElementById('btnPrevMap');
const btnNextMap = document.getElementById('btnNextMap');
if (btnPrevMap && btnNextMap) {
    btnPrevMap.addEventListener('click', () => {
        if (!state.isHost) return;
        let idx = availableMaps.indexOf(state.selectedMapId);
        idx = (idx - 1 + availableMaps.length) % availableMaps.length;
        state.selectedMapId = availableMaps[idx];
        renderLobbyUI(state.isHost);
        socket.emit('updateRoomSettings', { maxPlayers: state.selectedMaxPlayers, mapId: state.selectedMapId });
    });
    btnNextMap.addEventListener('click', () => {
        if (!state.isHost) return;
        let idx = availableMaps.indexOf(state.selectedMapId);
        idx = (idx + 1) % availableMaps.length;
        state.selectedMapId = availableMaps[idx];
        renderLobbyUI(state.isHost);
        socket.emit('updateRoomSettings', { maxPlayers: state.selectedMaxPlayers, mapId: state.selectedMapId });
    });
}

const btnSizeDown = document.getElementById('btnSizeDown');
const btnSizeUp = document.getElementById('btnSizeUp');
if (btnSizeDown && btnSizeUp) {
    btnSizeDown.addEventListener('click', () => {
        if (!state.isHost) return;
        if (state.selectedMaxPlayers > 2) {
            state.selectedMaxPlayers--;
            renderLobbyUI(state.isHost);
            socket.emit('updateRoomSettings', { maxPlayers: state.selectedMaxPlayers, mapId: state.selectedMapId });
        }
    });
    btnSizeUp.addEventListener('click', () => {
        if (!state.isHost) return;
        if (state.selectedMaxPlayers < 4) {
            state.selectedMaxPlayers++;
            renderLobbyUI(state.isHost);
            socket.emit('updateRoomSettings', { maxPlayers: state.selectedMaxPlayers, mapId: state.selectedMapId });
        }
    });
}

const btnStartGame = document.getElementById('btnStartGame');
if (btnStartGame) {
    btnStartGame.addEventListener('click', () => {
        if (state.isHost) {
            socket.emit('startGame');
        }
    });
}

if (ui.playAgainBtn) {
    ui.playAgainBtn.addEventListener('click', () => {
        setActiveScreen('lobbyScreen');
        hideGameOverScreen();
    });
}


// --- Socket Events specific to Lobby ---
socket.on('roomCreated', (roomCode) => {
    state.currentRoomCode = roomCode;
    state.isHost = true; // First person is host
    setActiveScreen('lobbyScreen');
    renderLobbyUI(true);
});

socket.on('roomJoined', (room) => {
    state.currentRoomCode = room.id;
    state.selectedMaxPlayers = room.maxPlayers;
    state.selectedMapId = room.mapId;
    state.isHost = false; 
    
    // Check if we are the host based on players list (if our ID is the first one, or if server sets it)
    // For simplicity, room creator is usually first in array.
    if(room.players[0] && room.players[0].id === state.myPlayerId) {
        state.isHost = true;
    }
    
    setActiveScreen('lobbyScreen');
    renderLobbyUI(state.isHost);
});

socket.on('roomSettingsUpdated', (settings) => {
    state.selectedMaxPlayers = settings.maxPlayers;
    state.selectedMapId = settings.mapId;
    renderLobbyUI(state.isHost);
});

socket.on('playerListUpdate', (players) => {
    // Rebuild state.players from the server list
    state.players = {};
    players.forEach(p => {
        state.players[p.id] = p;
    });
    
    // Determine if we are host (if we are the first player)
    if(players[0] && players[0].id === state.myPlayerId) {
        state.isHost = true;
    }
    
    if (document.getElementById('lobbyScreen').classList.contains('active')) {
        renderLobbyUI(state.isHost);
    }
});

socket.on('error', (message) => {
    showError(message);
});

socket.on('gameInit', (data) => {
    state.currentMapId = data.mapId;
    state.players = data.players;
    
    initPlatforms(state.currentMapId);
    initializePlayers(data.players);
    
    state.gameStarted = true;
    state.gameOver = false;
    state.roundActive = false;
    state.roundMotionStartTime = null;
    
    setActiveScreen('gameScreen');
    hideGameOverScreen();
    hideRoundBanner();
    
    if (!state.animationFrameId) {
        state.lastFrameTime = performance.now();
        gameLoop(state.lastFrameTime);
    }
});

socket.on('countdown', (count) => {
    if (count > 0) {
        showRoundBanner(count.toString());
    } else if (count === 0) {
        showRoundBanner("GO!");
        setTimeout(() => {
            hideRoundBanner();
        }, 1000);
    }
});

socket.on('roundStart', () => {
    state.roundActive = true;
    state.roundMotionStartTime = performance.now();
});

socket.on('roleUpdate', (playersData) => {
    state.players = playersData;
    updateRoleDisplay();
});

socket.on('timerUpdate', (timeLeft) => {
    state.timeRemaining = timeLeft;
    updateTimerDisplay();
});

socket.on('gameOver', (data) => {
    state.roundActive = false;
    state.gameOver = true;
    showGameOverScreen(data.loser);
});


// --- Key Listeners ---
window.addEventListener('keydown', (e) => {
    if (e.target.tagName.toLowerCase() === 'input') return; // Don't steal from inputs
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        state.keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        state.keys[e.key] = false;
    }
});

// --- Game Loop ---
export function gameLoop(currentTime) {
    state.animationFrameId = requestAnimationFrame(gameLoop);
    
    if (!state.gameStarted) return;
    
    const deltaTime = (currentTime - state.lastFrameTime) / 1000;
    state.lastFrameTime = currentTime;
    
    // Cap deltaTime to avoid massive jumps
    if (deltaTime > 0.1) return;
    
    if (state.roundActive) {
        updatePlatforms(currentTime);
        updatePlayer(deltaTime);
        checkCollisions();
    }
    
    updateRemotePlayers(deltaTime);
    draw();
}
