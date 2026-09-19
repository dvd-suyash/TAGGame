import { state } from './state.js';
import { getMapDefinition } from './map.js';

export const ui = {
    canvas: document.getElementById('gameCanvas'),
    ctx: document.getElementById('gameCanvas').getContext('2d'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    roundBanner: document.getElementById('roundBanner')
};
if(ui.canvas) {
    ui.canvas.width = 1400;
    ui.canvas.height = 700;
}

export function setActiveScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.toggle('active', screen.id === screenId);
    });
}

export function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (!errorDiv) return;
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 3000);
}

export function showRoundBanner(text) {
    if (!ui.roundBanner) return;
    ui.roundBanner.textContent = text;
    ui.roundBanner.classList.remove('hidden');
}

export function hideRoundBanner() {
    if (!ui.roundBanner) return;
    ui.roundBanner.classList.add('hidden');
}

export function updateRoleDisplay() {
    const myPlayer = state.players[state.myPlayerId];
    if (myPlayer) {
        const roleSpan = document.getElementById('playerRole');
        if (roleSpan) {
            roleSpan.textContent = myPlayer.isIt ? 'CHASER (IT)' : 'RUNNER';
            roleSpan.style.color = myPlayer.isIt ? '#ff4d29' : '#3cd6c5';
        }
    }
}

export function updateTimerDisplay() {
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) timeDisplay.textContent = state.timeRemaining;
}

export function showGameOverScreen(loserId) {
    const loser = state.players[loserId];
    const iLost = loserId === state.myPlayerId;
    const loserLabel = loser
        ? (loserId === state.myPlayerId ? 'YOU' : `PLAYER ${loser.number}`)
        : 'UNKNOWN';
        
    const resultTitle = iLost ? 'TAGGED OUT.' : 'SURVIVED.';
    const subtext = iLost ? 'TIME RAN OUT' : `${loserLabel} WAS IT`;
    const message = iLost
        ? 'You failed to pass the tag.'
        : 'You successfully evaded the tag.';

    document.getElementById('gameOverTitle').textContent = resultTitle;
    document.getElementById('gameOverPlayer').textContent = subtext;
    document.getElementById('gameOverMessage').textContent = message;
    
    const screen = document.getElementById('gameOverScreen');
    screen.classList.remove('hidden');
    
    // Apply cinematic styling based on outcome
    screen.classList.remove('outcome-winner', 'outcome-loser');
    screen.classList.add(iLost ? 'outcome-loser' : 'outcome-winner');
}

export function hideGameOverScreen() {
    const screen = document.getElementById('gameOverScreen');
    if (screen) screen.classList.add('hidden');
    if (ui.playAgainBtn) {
        ui.playAgainBtn.disabled = false;
        ui.playAgainBtn.textContent = 'BACK TO LOBBY';
    }
}

export function renderLobbyUI(isHost) {
    // Show/hide host controls
    const hostMapSelector = document.getElementById('hostMapSelector');
    const hostSizeSelector = document.getElementById('hostSizeSelector');
    const btnStartGame = document.getElementById('btnStartGame');
    const waitingForHostStatus = document.getElementById('waitingForHostStatus');
    
    if (isHost) {
        if(hostMapSelector) hostMapSelector.classList.remove('hidden');
        if(hostSizeSelector) hostSizeSelector.classList.remove('hidden');
        if(btnStartGame) btnStartGame.classList.remove('hidden');
        if(waitingForHostStatus) waitingForHostStatus.classList.add('hidden');
    } else {
        if(hostMapSelector) hostMapSelector.classList.add('hidden');
        if(hostSizeSelector) hostSizeSelector.classList.add('hidden');
        if(btnStartGame) btnStartGame.classList.add('hidden');
        if(waitingForHostStatus) waitingForHostStatus.classList.remove('hidden');
    }

    // Room Code
    const displayRoomCode = document.getElementById('displayRoomCode');
    if (displayRoomCode) displayRoomCode.textContent = state.currentRoomCode || '----';

    // Map Info
    const map = getMapDefinition(state.selectedMapId);
    if (map) {
        const displayMapName = document.getElementById('displayMapName');
        const displayMapDesc = document.getElementById('displayMapDesc');
        if (displayMapName) displayMapName.textContent = map.name;
        if (displayMapDesc) displayMapDesc.textContent = map.description || 'A Tag Arena';
    }

    // Size Info
    const displayMaxPlayers = document.getElementById('displayMaxPlayers');
    if (displayMaxPlayers) {
        displayMaxPlayers.textContent = `${state.selectedMaxPlayers || 4} PLAYERS`;
    }

    // Roster
    const lobbyPlayerList = document.getElementById('lobbyPlayerList');
    if (lobbyPlayerList) {
        lobbyPlayerList.innerHTML = '';
        const playerIds = Object.keys(state.players);
        for (let i = 0; i < (state.selectedMaxPlayers || 4); i++) {
            const id = playerIds[i];
            const p = id ? state.players[id] : null;
            const item = document.createElement('div');
            item.className = 'player-item';
            
            if (p) {
                item.innerHTML = `<div class="player-avatar"></div> Player ${p.number} ${id === state.myPlayerId ? '(You)' : ''}`;
                item.style.opacity = '1';
            } else {
                item.innerHTML = `<div class="player-avatar" style="background: var(--surface-hover)"></div> Waiting...`;
                item.style.opacity = '0.5';
            }
            lobbyPlayerList.appendChild(item);
        }
    }
}
