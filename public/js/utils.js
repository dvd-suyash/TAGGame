import { state } from './state.js';
import { ui } from './ui.js';
import * as constants from './constants.js';
import { socket } from './network.js';
import { setMapButtonsState, refreshMapButtons, updateMapSelectionUI, setActiveScreen, updateLobbySummaries, updateRoomModeUI, updateSelectedMapLabel, scrollSelectedMapIntoView, getBaseMapCards, getBaseCarouselMetrics, recenterMapCarouselIfNeeded, setupInfiniteMapCarousel, syncMapSelectionToViewport, showError, updateSelectedSizeLabel, showRoundBanner, hideRoundBanner, updateRoleDisplay, updateTimerDisplay, showGameOverScreen, hideGameOverScreen } from './ui.js';
import { getMapDefinition, buildPlatformFromLayout, initPlatforms, getPlatformMotionOffset, updatePlatforms, getPlatformTopEdge, getPlatformSurfaceYAtX, getPlatformOverlap, shouldIgnoreConnectedSeamCollision, resolveSolidPlatformCollisions } from './map.js';
import { upsertPlayerState, initializePlayers, updateRemotePlayers, updatePlayer, checkCollisions } from './physics.js';
import { draw, drawArenaBackground, drawBunkerArenaBackground, drawCathedralArenaBackground, drawCathedralWindow, drawCathedralColumns, drawCathedralFloorGlow, drawMazeArenaBackground, drawCourtyardArenaBackground, drawSimpleCourtyardSilhouettes, drawSimpleCourtyardFloorBands, drawCourtyardPalace, drawCourtyardDome, drawCourtyardArcadeRow, drawCourtyardPlanters, drawCourtyardFloorPattern, drawMapEllipses, drawMapStumps, drawPlatforms, drawPlayers, drawPlayerTrail, drawPlayerBody, drawPlayerLabel, roundRect } from './render.js';
import { startGame, gameLoop } from './main.js';

export function rotatePoint(x, y, angleRadians) {
    const cos = Math.cos(angleRadians);
    const sin = Math.sin(angleRadians);

    return {
        x: x * cos - y * sin,
        y: x * sin + y * cos
    };
}

export function approach(current, target, maxDelta) {
    if (current < target) {
        return Math.min(current + maxDelta, target);
    }
    return Math.max(current - maxDelta, target);
}

