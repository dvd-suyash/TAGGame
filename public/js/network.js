import { state } from './state.js';
import { ui } from './ui.js';
import * as constants from './constants.js';
import { setMapButtonsState, refreshMapButtons, updateMapSelectionUI, setActiveScreen, updateLobbySummaries, updateRoomModeUI, updateSelectedMapLabel, scrollSelectedMapIntoView, getBaseMapCards, getBaseCarouselMetrics, recenterMapCarouselIfNeeded, setupInfiniteMapCarousel, syncMapSelectionToViewport, showError, updateSelectedSizeLabel, showRoundBanner, hideRoundBanner, updateRoleDisplay, updateTimerDisplay, showGameOverScreen, hideGameOverScreen } from './ui.js';
import { getMapDefinition, buildPlatformFromLayout, initPlatforms, getPlatformMotionOffset, updatePlatforms, getPlatformTopEdge, getPlatformSurfaceYAtX, getPlatformOverlap, shouldIgnoreConnectedSeamCollision, resolveSolidPlatformCollisions } from './map.js';
import { rotatePoint, approach } from './utils.js';
import { upsertPlayerState, initializePlayers, updateRemotePlayers, updatePlayer, checkCollisions } from './physics.js';
import { draw, drawArenaBackground, drawBunkerArenaBackground, drawCathedralArenaBackground, drawCathedralWindow, drawCathedralColumns, drawCathedralFloorGlow, drawMazeArenaBackground, drawCourtyardArenaBackground, drawSimpleCourtyardSilhouettes, drawSimpleCourtyardFloorBands, drawCourtyardPalace, drawCourtyardDome, drawCourtyardArcadeRow, drawCourtyardPlanters, drawCourtyardFloorPattern, drawMapEllipses, drawMapStumps, drawPlatforms, drawPlayers, drawPlayerTrail, drawPlayerBody, drawPlayerLabel, roundRect } from './render.js';
import { startGame, gameLoop } from './main.js';

export const socket = io();

// Socket event listeners
socket.on('roomCreated', (data) => {
    state.currentRoomCode = data.roomCode;
    state.selectedMaxPlayers = data.maxPlayers;
    state.selectedRoundDuration = data.roundDuration || state.selectedRoundDuration;
    state.selectedMapId = data.mapId || state.selectedMapId;
    state.currentMapId = state.selectedMapId;
    updateMapSelectionUI();
    updateLobbySummaries();
    updateRoomModeUI();
    setActiveScreen('roomScreen');
    document.getElementById('roomCode').textContent = data.roomCode;
    document.getElementById('roomCodeDisplay').classList.remove('hidden');
    document.getElementById('createRoomBtn').disabled = true;
    setMapButtonsState(true);
});

socket.on('joined', (data) => {
    state.myPlayerId = socket.id;
    state.myPlayerNumber = data.playerNumber;
    state.currentRoomCode = data.roomCode;
    state.selectedMaxPlayers = data.maxPlayers || state.selectedMaxPlayers;
    state.selectedRoundDuration = data.roundDuration || state.selectedRoundDuration;
    state.selectedMapId = data.mapId || state.selectedMapId;
    state.currentMapId = state.selectedMapId;
    updateMapSelectionUI();
    updateLobbySummaries();
    updateRoomModeUI();
    setActiveScreen('roomScreen');
    
    // Initialize state.players
    initializePlayers(data.players, true);

    document.getElementById('createRoomBtn').disabled = true;
    document.getElementById('joinRoomBtn').disabled = true;
    document.getElementById('roomCodeInput').disabled = true;
    setMapButtonsState(true);
    document.getElementById('roomCode').textContent = data.roomCode;
    document.getElementById('roomCodeDisplay').classList.remove('hidden');
    
    showError(`Joined room ${data.roomCode} as Player ${data.playerNumber}`);
});

socket.on('roomStatus', (data) => {
    state.currentRoomCode = data.roomCode;
    state.selectedMaxPlayers = data.maxPlayers || state.selectedMaxPlayers;
    state.selectedRoundDuration = data.roundDuration || state.selectedRoundDuration;
    state.selectedMapId = data.mapId || state.selectedMapId;
    updateMapSelectionUI();
    updateLobbySummaries();

    const mapName = data.mapName || getMapDefinition(state.selectedMapId).name;
    document.getElementById('roomStatusText').textContent = `${data.playersJoined} / ${data.maxPlayers} joined • ${mapName} • ${state.selectedRoundDuration}s round`;
    document.getElementById('waitingText').textContent = data.playersNeeded === 0
        ? 'Starting match...'
        : `Waiting for ${data.playersNeeded} more player${data.playersNeeded === 1 ? '' : 's'}...`;
});

socket.on('gameStart', (playerData) => {
    state.gameStarted = true;
    state.gameOver = false;
    state.roundActive = false;
    state.roundMotionStartTime = null;
    state.supportedPlatformId = null;
    hideGameOverScreen();
    initializePlayers(playerData.players, true);
    state.timeRemaining = playerData.timeRemaining;
    state.selectedRoundDuration = playerData.roundDuration || state.selectedRoundDuration;
    state.currentMapId = playerData.mapId || state.currentMapId;
    state.selectedMapId = state.currentMapId;
    updateMapSelectionUI();
    updateLobbySummaries();
    updateTimerDisplay();
    showRoundBanner(`GET READY ${playerData.readySeconds || 3}`);
    
    initPlatforms();
    startGame();
});

socket.on('playerMoved', (playerData) => {
    upsertPlayerState(playerData, false);
});

socket.on('tagOccurred', (data) => {
    data.players.forEach(player => upsertPlayerState(player, true));
    updateRoleDisplay();
});

socket.on('roundCountdown', (secondsRemaining) => {
    state.roundActive = false;
    showRoundBanner(`GET READY ${secondsRemaining}`);
});

socket.on('roundLive', () => {
    state.roundActive = true;
    state.roundMotionStartTime = performance.now();
    hideRoundBanner();
});

socket.on('timerUpdate', (secondsRemaining) => {
    state.timeRemaining = secondsRemaining;
    updateTimerDisplay();
});

socket.on('state.gameOver', (data) => {
    state.gameStarted = false;
    state.gameOver = true;
    state.roundActive = false;
    state.roundMotionStartTime = null;
    state.supportedPlatformId = null;
    state.timeRemaining = 0;
    updateTimerDisplay();

    hideRoundBanner();
    data.players.forEach(player => upsertPlayerState(player, true));
    updateRoleDisplay();
    state.keys = {};
    state.jumpBufferTime = 0;
    state.coyoteTime = 0;
    showGameOverScreen(data.loserId);
});

socket.on('playerLeft', () => {
    showError('Other player left the game');
    setTimeout(() => {
        location.reload();
    }, 2000);
});

socket.on('error', (message) => {
    showError(message);
});

