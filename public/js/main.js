import { state } from './state.js';
import { ui } from './ui.js';
import * as constants from './constants.js';
import { socket } from './network.js';
import { setMapButtonsState, refreshMapButtons, updateMapSelectionUI, setActiveScreen, updateLobbySummaries, updateRoomModeUI, updateSelectedMapLabel, scrollSelectedMapIntoView, getBaseMapCards, getBaseCarouselMetrics, recenterMapCarouselIfNeeded, setupInfiniteMapCarousel, syncMapSelectionToViewport, showError, updateSelectedSizeLabel, showRoundBanner, hideRoundBanner, updateRoleDisplay, updateTimerDisplay, showGameOverScreen, hideGameOverScreen } from './ui.js';
import { getMapDefinition, buildPlatformFromLayout, initPlatforms, getPlatformMotionOffset, updatePlatforms, getPlatformTopEdge, getPlatformSurfaceYAtX, getPlatformOverlap, shouldIgnoreConnectedSeamCollision, resolveSolidPlatformCollisions } from './map.js';
import { rotatePoint, approach } from './utils.js';
import { upsertPlayerState, initializePlayers, updateRemotePlayers, updatePlayer, checkCollisions } from './physics.js';
import { draw, drawArenaBackground, drawBunkerArenaBackground, drawCathedralArenaBackground, drawCathedralWindow, drawCathedralColumns, drawCathedralFloorGlow, drawMazeArenaBackground, drawCourtyardArenaBackground, drawSimpleCourtyardSilhouettes, drawSimpleCourtyardFloorBands, drawCourtyardPalace, drawCourtyardDome, drawCourtyardArcadeRow, drawCourtyardPlanters, drawCourtyardFloorPattern, drawMapEllipses, drawMapStumps, drawPlatforms, drawPlayers, drawPlayerTrail, drawPlayerBody, drawPlayerLabel, roundRect } from './render.js';



// Initialize History API for browser back button
history.replaceState({ screenId: 'playerCountScreen' }, "", "#playerCountScreen");

window.addEventListener('popstate', (event) => {
    if (event.state && event.state.screenId) {
        setActiveScreen(event.state.screenId, false);
    } else {
        setActiveScreen('playerCountScreen', false);
    }
});

// Menu screen handlers
refreshMapButtons();
// setupInfiniteMapCarousel(); removed

ui.playerCountButtons.forEach(button => {
    button.addEventListener('click', () => {
        state.selectedMaxPlayers = Number(button.dataset.playerCount);
        updateSelectedSizeLabel();
        updateLobbySummaries();
        setActiveScreen('mapScreen');
        requestAnimationFrame(() => {
            scrollSelectedMapIntoView('smooth');
            // syncMapSelectionToViewport(); removed
        });
    });
});

if (ui.mapCarousel) {
    ui.mapCarousel.addEventListener('click', (event) => {
        const button = event.target.closest('.map-stage-card');
        if (!button) {
            return;
        }
        state.selectedMapId = button.dataset.mapId;
        updateMapSelectionUI();
        updateLobbySummaries();
        scrollSelectedMapIntoView('smooth');
        setActiveScreen('modeScreen');
    });

    ui.mapCarousel.addEventListener('wheel', (event) => {
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
            event.preventDefault();
            ui.mapCarousel.scrollBy({ left: event.deltaY, behavior: 'smooth' });
        }
    }, { passive: false });

    // Auto-select on scroll removed
}


document.getElementById('backToPlayerCountBtn')?.addEventListener('click', () => {
    setActiveScreen('playerCountScreen');
});
document.getElementById('backToMapBtn')?.addEventListener('click', () => {
    setActiveScreen('mapScreen');
});
document.getElementById('backToModeBtn')?.addEventListener('click', () => {
    setActiveScreen('modeScreen');
});

ui.chooseCreateBtn.addEventListener('click', () => {
    state.selectedLobbyMode = 'create';
    updateRoomModeUI();
    updateLobbySummaries();
    setActiveScreen('roomScreen');
});

ui.chooseJoinBtn.addEventListener('click', () => {
    state.selectedLobbyMode = 'join';
    updateRoomModeUI();
    updateLobbySummaries();
    setActiveScreen('roomScreen');
    requestAnimationFrame(() => {
        document.getElementById('roomCodeInput').focus();
    });
});

document.getElementById('createRoomBtn').addEventListener('click', () => {
    if (!state.selectedMaxPlayers) {
        showError('Choose the room size first');
        return;
    }

    socket.emit('createRoom', {
        maxPlayers: state.selectedMaxPlayers,
        mapId: state.selectedMapId
    });
});

document.getElementById('joinRoomBtn').addEventListener('click', () => {
    const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    if (roomCode) {
        socket.emit('joinRoom', roomCode);
    } else {
        showError('Please enter a room code');
    }
});

ui.playAgainBtn.addEventListener('click', () => {
    ui.playAgainBtn.disabled = true;
    ui.playAgainBtn.textContent = 'RESTARTING...';
    socket.emit('playAgain');
});

updateMapSelectionUI();
updateLobbySummaries();

export function startGame() {
    setActiveScreen('gameScreen');
    
    updateRoleDisplay();
    updateTimerDisplay();
    state.lastFrameTime = null;
    state.keys = {};
    state.jumpBufferTime = 0;
    state.coyoteTime = 0;
    ui.playAgainBtn.disabled = false;
    ui.playAgainBtn.textContent = 'PLAY AGAIN';

    requestAnimationFrame(gameLoop);
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && !state.keys[e.key]) {
        state.jumpBufferTime = constants.JUMP_BUFFER_SECONDS;
    }
    state.keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp') {
        const player = state.players[state.myPlayerId];
        if (player && player.velocityY < 0) {
            player.velocityY *= 0.5;
        }
    }
    state.keys[e.key] = false;
});

export function gameLoop(timestamp) {
    if (!state.gameStarted || state.gameOver) return;

    if (typeof timestamp !== 'number') {
        requestAnimationFrame(gameLoop);
        return;
    }

    if (state.lastFrameTime === null) {
        state.lastFrameTime = timestamp;
    }

    const deltaTime = Math.min((timestamp - state.lastFrameTime) / 1000, 0.05);
    state.lastFrameTime = timestamp;

    updatePlatforms(timestamp);
    updateRemotePlayers(deltaTime);
    if (state.roundActive) {
        updatePlayer(deltaTime);
        checkCollisions();
    }
    draw();
    
    requestAnimationFrame(gameLoop);
}

