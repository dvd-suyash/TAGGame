import { state } from './state.js';
import { ui } from './ui.js';
import * as constants from './constants.js';
import { socket } from './network.js';
import { rotatePoint, approach } from './utils.js';
import { upsertPlayerState, initializePlayers, updateRemotePlayers, updatePlayer, checkCollisions } from './physics.js';
import { draw, drawArenaBackground, drawBunkerArenaBackground, drawCathedralArenaBackground, drawCathedralWindow, drawCathedralColumns, drawCathedralFloorGlow, drawMazeArenaBackground, drawCourtyardArenaBackground, drawSimpleCourtyardSilhouettes, drawSimpleCourtyardFloorBands, drawCourtyardPalace, drawCourtyardDome, drawCourtyardArcadeRow, drawCourtyardPlanters, drawCourtyardFloorPattern, drawMapEllipses, drawMapStumps, drawPlatforms, drawPlayers, drawPlayerTrail, drawPlayerBody, drawPlayerLabel, roundRect } from './render.js';

export function getMapDefinition(mapId = state.currentMapId) {
    return constants.MAP_DEFINITIONS[mapId] || constants.MAP_DEFINITIONS.map1;
}

export function buildPlatformFromLayout(platform, index) {
    const width = platform.width;
    const height = platform.height;
    const angle = platform.angle || 0;
    const x = platform.x + constants.MAP_OFFSET_X;
    const y = platform.y + constants.MAP_OFFSET_Y;

    if (angle === 0 || !platform.rotationOrigin) {
        return {
            id: index,
            x,
            y,
            baseX: x,
            baseY: y,
            width,
            height,
            angle,
            seamGroup: platform.seamGroup,
            surfaceRatio: platform.surfaceRatio,
            motion: platform.motion,
            styleRole: platform.styleRole,
            deltaX: 0,
            deltaY: 0
        };
    }

    const angleRadians = angle * Math.PI / 180;
    let centerX;
    let centerY;

    if (platform.rotationOrigin === 'left-center') {
        centerX = x + Math.cos(angleRadians) * (width / 2);
        centerY = y + height / 2 + Math.sin(angleRadians) * (width / 2);
    } else if (platform.rotationOrigin === 'right-center') {
        centerX = x + width - Math.cos(angleRadians) * (width / 2);
        centerY = y + height / 2 - Math.sin(angleRadians) * (width / 2);
    } else {
        centerX = x + width / 2;
        centerY = y + height / 2;
    }

    return {
        id: index,
        x: centerX - width / 2,
        y: centerY - height / 2,
        baseX: centerX - width / 2,
        baseY: centerY - height / 2,
        width,
        height,
        angle,
        seamGroup: platform.seamGroup,
        surfaceRatio: platform.surfaceRatio,
        motion: platform.motion,
        styleRole: platform.styleRole,
        deltaX: 0,
        deltaY: 0
    };
}

export function initPlatforms() {
    state.platforms = getMapDefinition().platformLayout.map((platform, index) => buildPlatformFromLayout(platform, index));
}

export function getPlatformMotionOffset(platform, elapsedSeconds) {
    if (!platform.motion) {
        return { x: 0, y: 0 };
    }

    const period = Math.max(platform.motion.period || 1, 0.001);
    const phase = platform.motion.phase || 0;
    const wave = Math.sin((elapsedSeconds / period) * Math.PI * 2 + phase);
    const distance = platform.motion.distance || 0;
    const axis = platform.motion.axis || 'x';

    return {
        x: axis === 'x' ? wave * distance : 0,
        y: axis === 'y' ? wave * distance : 0
    };
}

export function updatePlatforms(currentTimestamp) {
    const canMovePlatforms = state.roundActive && state.roundMotionStartTime !== null;
    const elapsedSeconds = canMovePlatforms
        ? Math.max((currentTimestamp - state.roundMotionStartTime) / 1000, 0)
        : 0;

    state.platforms.forEach(platform => {
        const previousX = platform.x;
        const previousY = platform.y;
        const offset = canMovePlatforms ? getPlatformMotionOffset(platform, elapsedSeconds) : { x: 0, y: 0 };
        platform.x = platform.baseX + offset.x;
        platform.y = platform.baseY + offset.y;
        platform.deltaX = platform.x - previousX;
        platform.deltaY = platform.y - previousY;
    });
}

export function getPlatformTopEdge(platform) {
    const angleRadians = (platform.angle || 0) * Math.PI / 180;
    const halfWidth = platform.width / 2;
    const halfHeight = platform.height / 2;
    const centerX = platform.x + halfWidth;
    const centerY = platform.y + halfHeight;
    const start = rotatePoint(-halfWidth, -halfHeight, angleRadians);
    const end = rotatePoint(halfWidth, -halfHeight, angleRadians);

    return {
        start: {
            x: centerX + start.x,
            y: centerY + start.y
        },
        end: {
            x: centerX + end.x,
            y: centerY + end.y
        }
    };
}

export function getPlatformSurfaceYAtX(platform, x) {
    const topEdge = getPlatformTopEdge(platform);
    const minX = Math.min(topEdge.start.x, topEdge.end.x);
    const maxX = Math.max(topEdge.start.x, topEdge.end.x);

    if (x < minX || x > maxX) {
        return null;
    }

    if (Math.abs(topEdge.end.x - topEdge.start.x) < 0.001) {
        return Math.min(topEdge.start.y, topEdge.end.y);
    }

    const t = (x - topEdge.start.x) / (topEdge.end.x - topEdge.start.x);
    return topEdge.start.y + (topEdge.end.y - topEdge.start.y) * t;
}

export function getPlatformOverlap(player, platform) {
    const angleRadians = (platform.angle || 0) * Math.PI / 180;
    const playerCenterX = player.x + constants.PLAYER_SIZE / 2;
    const playerCenterY = player.y + constants.PLAYER_SIZE / 2;
    const platformCenterX = platform.x + platform.width / 2;
    const platformCenterY = platform.y + platform.height / 2;
    const relativeX = playerCenterX - platformCenterX;
    const relativeY = playerCenterY - platformCenterY;
    const localCenter = rotatePoint(relativeX, relativeY, -angleRadians);
    const halfPlayer = constants.PLAYER_SIZE / 2;
    const absCos = Math.abs(Math.cos(angleRadians));
    const absSin = Math.abs(Math.sin(angleRadians));
    const localHalfWidth = halfPlayer * absCos + halfPlayer * absSin;
    const localHalfHeight = halfPlayer * absSin + halfPlayer * absCos;
    const overlapX = platform.width / 2 + localHalfWidth - Math.abs(localCenter.x);
    const overlapY = platform.height / 2 + localHalfHeight - Math.abs(localCenter.y);

    if (overlapX <= 0 || overlapY <= 0) {
        return null;
    }

    const resolveOnX = overlapX < overlapY;
    const localResolution = resolveOnX
        ? { x: localCenter.x < 0 ? -overlapX : overlapX, y: 0 }
        : { x: 0, y: localCenter.y < 0 ? -overlapY : overlapY };

    return {
        localResolution,
        worldResolution: rotatePoint(localResolution.x, localResolution.y, angleRadians),
        resolveOnX
    };
}

export function shouldIgnoreConnectedSeamCollision(player, platform, overlap) {
    if (!overlap.resolveOnX || !platform.seamGroup) {
        return false;
    }

    const playerCenterX = player.x + constants.PLAYER_SIZE / 2;
    const playerBottom = player.y + constants.PLAYER_SIZE;
    const seamPlatforms = state.platforms.filter(item => item.seamGroup === platform.seamGroup);
    const supportYs = seamPlatforms
        .map(item => getPlatformSurfaceYAtX(item, playerCenterX))
        .filter(surfaceY => surfaceY !== null);

    if (!supportYs.length) {
        return false;
    }

    const nearestSurfaceY = Math.min(...supportYs);
    const nearConnectedTopSurface = playerBottom >= nearestSurfaceY - 12 && playerBottom <= nearestSurfaceY + 22;
    const notHittingFromBelow = player.velocityY >= -40;

    return nearConnectedTopSurface && notHittingFromBelow;
}

export function resolveSolidPlatformCollisions(player) {
    let onGround = false;
    let supportPlatform = null;

    for (let i = 0; i < 4; i++) {
        let resolvedCollision = false;

        for (const platform of state.platforms) {
            const overlap = getPlatformOverlap(player, platform);
            if (!overlap) {
                continue;
            }

            if (shouldIgnoreConnectedSeamCollision(player, platform, overlap)) {
                continue;
            }

            player.x += overlap.worldResolution.x;
            player.y += overlap.worldResolution.y;
            resolvedCollision = true;

            if (overlap.resolveOnX) {
                player.velocityX = 0;
            } else {
                if (overlap.localResolution.y < 0) {
                    onGround = true;
                    supportPlatform = platform;
                }
                player.velocityY = 0;
            }
        }

        if (!resolvedCollision) {
            break;
        }
    }

    return { onGround, supportPlatform };
}

