import { state } from './state.js';
import { ui, setActiveScreen, showError, showRoundBanner, hideRoundBanner, updateRoleDisplay, updateTimerDisplay, showGameOverScreen, hideGameOverScreen, renderLobbyUI } from './ui.js';
import * as constants from './constants.js';
import { socket } from './network.js';
import { getMapDefinition, initPlatforms, updatePlatforms } from './map.js';
import { initializePlayers, updateRemotePlayers, updatePlayer, checkCollisions, updateBots, initBotAI, recordPlayerInputs } from './physics.js';
import { draw } from './render.js';


// --- History API for Browser Back Button ---
window.history.replaceState({ screenId: 'homeScreen' }, "", "#homeScreen");
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.screenId) {
        setActiveScreen(e.state.screenId, false);
        if (e.state.screenId === 'homeScreen') {
            socket.emit('leaveRoom');
            state.roundActive = false;
            state.gameStarted = false;
            hideGameOverScreen();
            
            // Re-enable join inputs
            document.getElementById('playerName').disabled = false;
            document.getElementById('roomCode').disabled = false;
            document.getElementById('btnHost').disabled = false;
            document.getElementById('btnJoin').disabled = false;
        }
    }
});
// -------------------------------------------


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
        try {
            state.selectedMaxPlayers = 4;
            state.selectedMapId = 'map1';
            socket.emit('createRoom', { maxPlayers: 4, mapId: 'map1', roundDuration: 75 });
        } catch(e) {
            import('./ui.js').then(module => module.showError(e.toString()));
        }
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


// --- Socket Events ---
socket.on('roomCreated', (roomCode) => {
    try {
        state.currentRoomCode = roomCode;
        state.isHost = true;
        setActiveScreen('lobbyScreen');
        renderLobbyUI(true);
    } catch(e) {
        showError(e.toString());
    }
});

socket.on('roomJoined', (data) => {
    state.myPlayerId = socket.id;
    state.myPlayerNumber = data.playerNumber;
    state.currentRoomCode = data.roomCode;
    state.selectedMaxPlayers = data.maxPlayers;
    state.selectedMapId = data.mapId;
    state.isHost = false; 
    
    // Check if we are host based on player array
    if(data.players && data.players[0] && data.players[0].id === socket.id) {
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
    state.players = {};
    players.forEach(p => {
        state.players[p.id] = p;
    });
    if(players[0] && players[0].id === socket.id) {
        state.isHost = true;
    }
    if (document.getElementById('lobbyScreen').classList.contains('active')) {
        renderLobbyUI(state.isHost);
    }
});

socket.on('error', (message) => {
    showError(message);
});

// -- Game Events --
socket.on('gameStart', (playerData) => {
    state.currentMapId = playerData.mapId || state.selectedMapId;
    state.gameStarted = true;
    state.gameOver = false;
    state.roundActive = false;
    state.roundMotionStartTime = null;
    
    initializePlayers(playerData.players || Object.values(state.players));
    initPlatforms(state.currentMapId);
    
    setActiveScreen('gameScreen');
    hideGameOverScreen();
    showRoundBanner("GET READY");
    
    if (!state.animationFrameId) {
        state.lastFrameTime = performance.now();
        gameLoop(state.lastFrameTime);
    }
});

socket.on('roundCountdown', (secondsRemaining) => {
    state.roundActive = false;
    if (secondsRemaining > 0) {
        showRoundBanner(secondsRemaining.toString());
    } else {
        showRoundBanner("GO!");
        setTimeout(() => hideRoundBanner(), 1000);
    }
});

socket.on('roundLive', () => {
    state.roundActive = true;
    state.roundMotionStartTime = performance.now();
    hideRoundBanner();
});

socket.on('tagOccurred', (data) => {
    data.players.forEach(player => {
        if (state.players[player.id]) {
            Object.assign(state.players[player.id], player);
        }
    });
    updateRoleDisplay();
});

socket.on('timerUpdate', (secondsRemaining) => {
    state.timeRemaining = secondsRemaining;
    updateTimerDisplay();
});

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
        if (targetPlayer) {
            if (targetPlayer.id === socket.id) {
                // We are the local player, server only updates our 'isIt' state
                targetPlayer.isIt = pisIt;
            } else if (state.isHost && targetPlayer.isBot) {
                // We are the host running the bot physics. Only sync 'isIt' from server.
                targetPlayer.isIt = pisIt;
            } else {
                // Remote player (or bot viewed by non-host)
                targetPlayer.targetX = px;
                targetPlayer.targetY = py;
                targetPlayer.velocityX = pvx;
                targetPlayer.velocityY = pvy;
                targetPlayer.isIt = pisIt;
            }
        }
    }
});

socket.on('gameOver', (data) => {
    state.gameStarted = false;
    state.gameOver = true;
    state.roundActive = false;
    state.timeRemaining = 0;
    updateTimerDisplay();
    hideRoundBanner();
    showGameOverScreen(data.loser || data.loserId);
});

socket.on('playerLeft', () => {
    showError('Other player left the game');
    setTimeout(() => {
        location.reload();
    }, 2000);
});

// --- Key Listeners ---
window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName && e.target.tagName.toLowerCase() === 'input') return;
    const key = e.key.toLowerCase();
    
    if (key === 'arrowleft' || key === 'a') state.keys['ArrowLeft'] = true;
    if (key === 'arrowright' || key === 'd') state.keys['ArrowRight'] = true;
    if (key === 'arrowdown' || key === 's') state.keys['ArrowDown'] = true;
    
    if (key === 'arrowup' || key === 'w' || key === ' ') {
        state.jumpBufferTime = 0.1; // allows bunny hopping if held
        state.keys['ArrowUp'] = true;
    }
});
window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') state.keys['ArrowLeft'] = false;
    if (key === 'arrowright' || key === 'd') state.keys['ArrowRight'] = false;
    if (key === 'arrowdown' || key === 's') state.keys['ArrowDown'] = false;
    if (key === 'arrowup' || key === 'w' || key === ' ') state.keys['ArrowUp'] = false;
});

// --- Game Loop ---
export function gameLoop(currentTime) {
    state.animationFrameId = requestAnimationFrame(gameLoop);
    if (!state.gameStarted) return;
    const deltaTime = (currentTime - state.lastFrameTime) / 1000;
    state.lastFrameTime = currentTime;
    if (deltaTime > 0.1) return;
    
    if (state.roundActive) {
        updatePlatforms(currentTime);
        recordPlayerInputs(deltaTime);
        updateBots(deltaTime);
        updatePlayer(deltaTime);
        checkCollisions();
    }
    updateRemotePlayers(deltaTime);
    draw();
}
