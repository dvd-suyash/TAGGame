import { state } from './state.js';
import * as constants from './constants.js';
import { socket } from './network.js';
import { getMapDefinition, buildPlatformFromLayout, initPlatforms, getPlatformMotionOffset, updatePlatforms, getPlatformTopEdge, getPlatformSurfaceYAtX, getPlatformOverlap, shouldIgnoreConnectedSeamCollision, resolveSolidPlatformCollisions } from './map.js';
import { rotatePoint, approach } from './utils.js';
import { upsertPlayerState, initializePlayers, updateRemotePlayers, updatePlayer, checkCollisions } from './physics.js';
import { draw, drawArenaBackground, drawBunkerArenaBackground, drawCathedralArenaBackground, drawCathedralWindow, drawCathedralColumns, drawCathedralFloorGlow, drawMazeArenaBackground, drawCourtyardArenaBackground, drawSimpleCourtyardSilhouettes, drawSimpleCourtyardFloorBands, drawCourtyardPalace, drawCourtyardDome, drawCourtyardArcadeRow, drawCourtyardPlanters, drawCourtyardFloorPattern, drawMapEllipses, drawMapStumps, drawPlatforms, drawPlayers, drawPlayerTrail, drawPlayerBody, drawPlayerLabel, roundRect } from './render.js';
import { startGame, gameLoop } from './main.js';

export const ui = {
    canvas: document.getElementById('gameCanvas'),
    ctx: document.getElementById('gameCanvas').getContext('2d'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    playerCountButtons: document.querySelectorAll('.player-count-btn'),
    mapCarousel: document.getElementById('mapCarousel'),
    chooseCreateBtn: document.getElementById('chooseCreateBtn'),
    chooseJoinBtn: document.getElementById('chooseJoinBtn'),
    createRoomPanel: document.getElementById('createRoomPanel'),
    joinRoomPanel: document.getElementById('joinRoomPanel'),
    roundBanner: document.getElementById('roundBanner')
};
ui.canvas.width = 1400;
ui.canvas.height = 700;

export function setMapButtonsState(disabled) {
    state.mapButtons.forEach(button => {
        button.disabled = disabled;
    });
}

export function refreshMapButtons() {
    state.mapButtons = Array.from(document.querySelectorAll('.map-stage-card'));
}

export function updateMapSelectionUI() {
    state.mapButtons.forEach(button => {
        const isSelected = button.dataset.mapId === state.selectedMapId;
        button.classList.toggle('active', isSelected);
    });
}

export function setActiveScreen(screenId, pushToHistory = true) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.toggle('active', screen.id === screenId);
    });
    
    if (pushToHistory) {
        history.pushState({ screenId }, "", "#" + screenId);
    }
});
}

export function updateLobbySummaries() {
    const map = getMapDefinition(state.selectedMapId);
    const sizeText = state.selectedMaxPlayers
        ? `${state.selectedMaxPlayers} player${state.selectedMaxPlayers === 1 ? '' : 's'}`
        : 'Match size pending';
    const mapText = map ? map.name : 'Map pending';
    const summaryText = `${sizeText} • ${mapText} • ${state.selectedRoundDuration}s round`;

    const mapCountSummary = document.getElementById('mapCountSummary');
    const modeSummary = document.getElementById('modeSummary');
    const roomSetupSummary = document.getElementById('roomSetupSummary');

    if (mapCountSummary) {
        mapCountSummary.textContent = `${sizeText} locked • ${state.selectedRoundDuration}s rounds`;
    }
    if (modeSummary) {
        modeSummary.textContent = summaryText;
    }
    if (roomSetupSummary) {
        roomSetupSummary.textContent = summaryText;
    }
}

export function updateRoomModeUI() {
    const isJoin = state.selectedLobbyMode === 'join';
    const roomEyebrow = document.getElementById('roomEyebrow');
    const roomSubtitle = document.getElementById('roomSubtitle');
    const roomActionLabel = document.getElementById('roomActionLabel');

    ui.createRoomPanel.classList.toggle('hidden', isJoin);
    ui.joinRoomPanel.classList.toggle('hidden', !isJoin);

    if (roomEyebrow) {
        roomEyebrow.textContent = isJoin ? 'Join Match' : 'Host Match';
    }
    if (roomSubtitle) {
        roomSubtitle.textContent = isJoin
            ? 'Enter the room code below. The host settings will override your local preview once you join.'
            : 'Create the room with the selected player count and map. The match will start automatically when the room fills.';
    }
    if (roomActionLabel) {
        roomActionLabel.textContent = isJoin ? 'Enter Code' : 'Create Room';
    }
}

export function updateSelectedMapLabel() {
    updateLobbySummaries();
}

export function scrollSelectedMapIntoView(behavior = 'smooth') {
    const baseCards = state.mapButtons.filter(button => !button.classList.contains('map-stage-clone'));
    const selectedCard = baseCards.find(button => button.dataset.mapId === state.selectedMapId);
    if (selectedCard) {
        selectedCard.scrollIntoView({ behavior, inline: 'center', block: 'nearest' });
    }
}

export function getBaseMapCards() {
    return state.mapButtons.filter(button => !button.classList.contains('map-stage-clone'));
}

export function getBaseCarouselMetrics() {
    const baseCards = getBaseMapCards();
    if (!baseCards.length) {
        return null;
    }

    const first = baseCards[0];
    const last = baseCards[baseCards.length - 1];
    const carouselStyle = window.getComputedStyle(ui.mapCarousel);
    const paddingLeft = Number.parseFloat(carouselStyle.paddingLeft) || 0;

    return {
        first,
        last,
        paddingLeft,
        sectionWidth: (last.offsetLeft + last.offsetWidth) - first.offsetLeft
    };
}

export function recenterMapCarouselIfNeeded() {
    if (!ui.mapCarousel || state.isRecenteringMapCarousel) {
        return;
    }

    const metrics = getBaseCarouselMetrics();
    if (!metrics) {
        return;
    }

    const leftEdge = metrics.first.offsetLeft - metrics.paddingLeft;
    const lowerBound = leftEdge - metrics.sectionWidth * 0.45;
    const upperBound = leftEdge + metrics.sectionWidth * 1.45;

    if (ui.mapCarousel.scrollLeft >= lowerBound && ui.mapCarousel.scrollLeft <= upperBound) {
        return;
    }

    state.isRecenteringMapCarousel = true;

    if (ui.mapCarousel.scrollLeft < lowerBound) {
        ui.mapCarousel.scrollLeft += metrics.sectionWidth;
    } else if (ui.mapCarousel.scrollLeft > upperBound) {
        ui.mapCarousel.scrollLeft -= metrics.sectionWidth;
    }

    requestAnimationFrame(() => {
        state.isRecenteringMapCarousel = false;
    });
}

export function setupInfiniteMapCarousel() {
    if (!ui.mapCarousel || ui.mapCarousel.dataset.infiniteReady === 'true') {
        refreshMapButtons();
        return;
    }

    const originals = Array.from(ui.mapCarousel.querySelectorAll('.map-stage-card'));
    const prefix = originals.map(card => {
        const clone = card.cloneNode(true);
        clone.classList.add('map-stage-clone');
        return clone;
    });
    const suffix = originals.map(card => {
        const clone = card.cloneNode(true);
        clone.classList.add('map-stage-clone');
        return clone;
    });

    prefix.reverse().forEach(clone => {
        ui.mapCarousel.insertBefore(clone, ui.mapCarousel.firstChild);
    });
    suffix.forEach(clone => {
        ui.mapCarousel.appendChild(clone);
    });

    ui.mapCarousel.dataset.infiniteReady = 'true';
    refreshMapButtons();

    requestAnimationFrame(() => {
        const metrics = getBaseCarouselMetrics();
        if (!metrics) {
            return;
        }
        ui.mapCarousel.scrollLeft = metrics.first.offsetLeft - metrics.paddingLeft;
        scrollSelectedMapIntoView('auto');
        syncMapSelectionToViewport();
    });
}

export function syncMapSelectionToViewport() {
    if (!ui.mapCarousel) {
        return;
    }

    recenterMapCarouselIfNeeded();

    const carouselRect = ui.mapCarousel.getBoundingClientRect();
    const carouselCenter = carouselRect.left + carouselRect.width / 2;
    let nearestCard = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    state.mapButtons.forEach(button => {
        const buttonRect = button.getBoundingClientRect();
        const buttonCenter = buttonRect.left + buttonRect.width / 2;
        const distance = Math.abs(buttonCenter - carouselCenter);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestCard = button;
        }
    });

    if (nearestCard) {
        state.selectedMapId = nearestCard.dataset.mapId;
        updateMapSelectionUI();
        updateLobbySummaries();
    }
}

export function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 3000);
}

export function updateSelectedSizeLabel() {
    updateLobbySummaries();
}

export function showRoundBanner(text) {
    ui.roundBanner.textContent = text;
    ui.roundBanner.classList.remove('hidden');
}

export function hideRoundBanner() {
    ui.roundBanner.classList.add('hidden');
}

export function updateRoleDisplay() {
    const myPlayer = state.players[state.myPlayerId];
    if (myPlayer) {
        const roleSpan = document.getElementById('playerRole');
        roleSpan.textContent = myPlayer.isIt ? 'CHASER (IT)' : 'RUNNER';
        roleSpan.style.color = myPlayer.isIt ? '#ff6b6b' : '#4ecdc4';
    }
}

export function updateTimerDisplay() {
    document.getElementById('timeDisplay').textContent = state.timeRemaining;
}

export function showGameOverScreen(loserId) {
    const loser = state.players[loserId];
    const iLost = loserId === state.myPlayerId;
    const loserLabel = loser
        ? (loserId === state.myPlayerId ? 'YOU' : `PLAYER ${loser.number}`)
        : 'UNKNOWN';
    const resultTitle = iLost ? 'LOSER' : 'WINNER';
    const message = iLost
        ? 'Time ran out while you were it.'
        : `${loserLabel} was it when time ran out.`;

    document.getElementById('gameOverTitle').textContent = resultTitle;
    document.getElementById('gameOverPlayer').textContent = iLost ? 'YOU' : loserLabel;
    document.getElementById('gameOverMessage').textContent = message;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

export function hideGameOverScreen() {
    document.getElementById('gameOverScreen').classList.add('hidden');
    ui.playAgainBtn.disabled = false;
    ui.playAgainBtn.textContent = 'PLAY AGAIN';
}

