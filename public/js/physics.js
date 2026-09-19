import { state } from './state.js';
import { ui } from './ui.js';
import * as constants from './constants.js';
import { socket } from './network.js';
import { setMapButtonsState, refreshMapButtons, updateMapSelectionUI, setActiveScreen, updateLobbySummaries, updateRoomModeUI, updateSelectedMapLabel, scrollSelectedMapIntoView, getBaseMapCards, getBaseCarouselMetrics, recenterMapCarouselIfNeeded, setupInfiniteMapCarousel, syncMapSelectionToViewport, showError, updateSelectedSizeLabel, showRoundBanner, hideRoundBanner, updateRoleDisplay, updateTimerDisplay, showGameOverScreen, hideGameOverScreen } from './ui.js';
import { getMapDefinition, buildPlatformFromLayout, initPlatforms, getPlatformMotionOffset, updatePlatforms, getPlatformTopEdge, getPlatformSurfaceYAtX, getPlatformOverlap, shouldIgnoreConnectedSeamCollision, resolveSolidPlatformCollisions } from './map.js';
import { rotatePoint, approach } from './utils.js';
import { draw, drawArenaBackground, drawBunkerArenaBackground, drawCathedralArenaBackground, drawCathedralWindow, drawCathedralColumns, drawCathedralFloorGlow, drawMazeArenaBackground, drawCourtyardArenaBackground, drawSimpleCourtyardSilhouettes, drawSimpleCourtyardFloorBands, drawCourtyardPalace, drawCourtyardDome, drawCourtyardArcadeRow, drawCourtyardPlanters, drawCourtyardFloorPattern, drawMapEllipses, drawMapStumps, drawPlatforms, drawPlayers, drawPlayerTrail, drawPlayerBody, drawPlayerLabel, roundRect } from './render.js';
import { startGame, gameLoop } from './main.js';

export function upsertPlayerState(playerData, snap = false) {
    const existing = state.players[playerData.id];

    if (!existing) {
        state.players[playerData.id] = {
            ...playerData,
            targetX: playerData.x,
            targetY: playerData.y,
            renderX: playerData.x,
            renderY: playerData.y
        };
        return;
    }

    const targetX = playerData.x;
    const targetY = playerData.y;
    Object.assign(existing, playerData);
    existing.targetX = targetX;
    existing.targetY = targetY;

    if (snap || playerData.id === state.myPlayerId) {
        existing.renderX = targetX;
        existing.renderY = targetY;
    } else {
        existing.renderX = existing.renderX ?? targetX;
        existing.renderY = existing.renderY ?? targetY;
    }
}

export function initializePlayers(playerList, snap = true) {
    const nextIds = new Set(playerList.map(player => player.id));
    Object.keys(state.players).forEach(playerId => {
        if (!nextIds.has(playerId)) {
            delete state.players[playerId];
        }
    });
    playerList.forEach(player => upsertPlayerState(player, snap));
}

let lastEmitTime = 0;
export function updateRemotePlayers(deltaTime) {
    for (const id in state.players) {
        if (id === state.myPlayerId) continue;
        const p = state.players[id];
        if (p.targetX !== undefined) {
            p.x += (p.targetX - p.x) * 10 * deltaTime;
            p.y += (p.targetY - p.y) * 10 * deltaTime;
        }
    }
    const interpolationAmount = Math.min(deltaTime / constants.REMOTE_INTERPOLATION_SECONDS, 1);

    Object.values(state.players).forEach(player => {
        if (player.id === state.myPlayerId) {
            player.renderX = player.x;
            player.renderY = player.y;
            return;
        }

        player.renderX = player.renderX ?? player.x;
        player.renderY = player.renderY ?? player.y;
        player.targetX = player.targetX ?? player.x;
        player.targetY = player.targetY ?? player.y;
        if (Math.abs(player.targetX - player.renderX) > 180 || Math.abs(player.targetY - player.renderY) > 180) {
            player.renderX = player.targetX;
            player.renderY = player.targetY;
            return;
        }
        player.renderX += (player.targetX - player.renderX) * interpolationAmount;
        player.renderY += (player.targetY - player.renderY) * interpolationAmount;
    });
}

export function updatePlayer(deltaTime) {
    const player = state.players[state.myPlayerId];
    if (!player) return;
    const wasGrounded = state.coyoteTime > 0;
    const supportingPlatform = state.supportedPlatformId !== null
        ? state.platforms.find(platform => platform.id === state.supportedPlatformId)
        : null;

    if (supportingPlatform) {
        player.x += supportingPlatform.deltaX;
        player.y += supportingPlatform.deltaY;
        if (player.x < constants.MAP_BOUNDS.left) player.x = constants.MAP_BOUNDS.left;
        if (player.x > constants.MAP_BOUNDS.right - constants.PLAYER_SIZE) player.x = constants.MAP_BOUNDS.right - constants.PLAYER_SIZE;
    }

    const targetVelocityX = state.keys['ArrowLeft']
        ? -constants.MOVE_SPEED
        : state.keys['ArrowRight']
            ? constants.MOVE_SPEED
            : 0;
    
    if (targetVelocityX !== 0) {
        const acceleration = wasGrounded ? constants.GROUND_ACCELERATION : constants.AIR_ACCELERATION;
        player.velocityX = approach(player.velocityX, targetVelocityX, acceleration * deltaTime);
    } else {
        const friction = wasGrounded ? constants.GROUND_FRICTION : constants.AIR_FRICTION;
        player.velocityX = approach(player.velocityX, 0, friction * deltaTime);
    }
    
    // Apply gravity
    player.velocityY += constants.GRAVITY * deltaTime;
    const moveX = player.velocityX * deltaTime;
    const moveY = player.velocityY * deltaTime;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(moveX), Math.abs(moveY)) / 4));
    const stepX = moveX / steps;
    const stepY = moveY / steps;
    let onGround = false;
    let supportPlatform = null;

    // Resolve movement in small steps so thin state.platforms behave like solid objects.
    for (let i = 0; i < steps; i++) {
        player.x += stepX;
        resolveSolidPlatformCollisions(player);

        player.y += stepY;
        const collisionResult = resolveSolidPlatformCollisions(player);
        onGround = collisionResult.onGround || onGround;
        if (collisionResult.supportPlatform) {
            supportPlatform = collisionResult.supportPlatform;
        }

        if (player.x < constants.MAP_BOUNDS.left) player.x = constants.MAP_BOUNDS.left;
        if (player.x > constants.MAP_BOUNDS.right - constants.PLAYER_SIZE) player.x = constants.MAP_BOUNDS.right - constants.PLAYER_SIZE;
        if (player.y > constants.MAP_BOUNDS.bottom - constants.PLAYER_SIZE) {
            player.y = constants.MAP_BOUNDS.bottom - constants.PLAYER_SIZE;
            player.velocityY = 0;
        }
    }
    
    state.jumpBufferTime = Math.max(0, state.jumpBufferTime - deltaTime);
    state.coyoteTime = onGround ? constants.COYOTE_TIME_SECONDS : Math.max(0, state.coyoteTime - deltaTime);

    if (state.jumpBufferTime > 0 && (onGround || state.coyoteTime > 0)) {
        player.velocityY = constants.JUMP_STRENGTH;
        state.jumpBufferTime = 0;
        state.coyoteTime = 0;
        onGround = false;
        supportPlatform = null;
    }

    state.supportedPlatformId = onGround && supportPlatform ? supportPlatform.id : null;
    
    // Send position to server
    const now = Date.now();
    if (now - lastEmitTime > 50) {
        lastEmitTime = now;
        socket.emit('playerMove', {
        x: player.x,
        y: player.y,
        velocityX: player.velocityX,
        velocityY: player.velocityY
    });
    }
}

export function checkCollisions() {
    // Server-side tagging is authoritative.
}

