import { state } from './state.js';
import { ActionBot } from './bot-ai.js';
import { ui } from './ui.js';
import * as constants from './constants.js';
import { socket } from './network.js';
import { getMapDefinition, buildPlatformFromLayout, initPlatforms, getPlatformMotionOffset, updatePlatforms, getPlatformTopEdge, getPlatformSurfaceYAtX, getPlatformOverlap, shouldIgnoreConnectedSeamCollision, resolveSolidPlatformCollisions } from './map.js';
import { rotatePoint, approach } from './utils.js';
import { draw, drawArenaBackground, drawBunkerArenaBackground, drawCathedralArenaBackground, drawCathedralWindow, drawCathedralColumns, drawCathedralFloorGlow, drawMazeArenaBackground, drawCourtyardArenaBackground, drawSimpleCourtyardSilhouettes, drawSimpleCourtyardFloorBands, drawCourtyardPalace, drawCourtyardDome, drawCourtyardArcadeRow, drawCourtyardPlanters, drawCourtyardFloorPattern, drawMapEllipses, drawMapStumps, drawPlatforms, drawPlayers, drawPlayerTrail, drawPlayerBody, drawPlayerLabel, roundRect } from './render.js';

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
    const interpolationAmount = Math.min(deltaTime / constants.REMOTE_INTERPOLATION_SECONDS, 1);
    Object.values(state.players).forEach(player => {
        const isLocalEntity = player.id === state.myPlayerId || (state.isHost && player.isBot);
        if (isLocalEntity) {
            player.renderX = player.x;
            player.renderY = player.y;
            return;
        }
        if (player.targetX !== undefined) {
            player.x += (player.targetX - player.x) * 10 * deltaTime;
            player.y += (player.targetY - player.y) * 10 * deltaTime;
        }
        player.renderX = player.renderX ?? player.x;
        player.renderY = player.renderY ?? player.y;
        player.targetX = player.targetX ?? player.x;
        player.targetY = player.targetY ?? player.y;
        player.renderX += (player.targetX - player.renderX) * interpolationAmount;
        player.renderY += (player.targetY - player.renderY) * interpolationAmount;
    });
}


let actionBots = null;
let actionBots = {};

export function initBotAI() {
    actionBots = new PathRecorder();
    actionBots = {};
    console.log('[Bot AI] Pure Action Sensor initialized');
}

export function recordPlayerInputs(dt) {
    if (!actionBots) return;
    // actionBots.record(state.players);
}

export function updateBots(deltaTime) {
    if (!state.isHost) return;
    if (!actionBots) initBotAI();
    
    const bots = Object.values(state.players).filter(p => p.isBot);
    bots.forEach((bot, botIndex) => {
        if (!bot.aiState) bot.aiState = { jumpBufferTime: 0, coyoteTime: 0, lastX: bot.x };
        
        if (!actionBots[bot.id]) {
            actionBots[bot.id] = new ActionBot();
        }
        const brain = actionBots[bot.id];

        // Find nearest valid target (respecting IT roles)
        let target = null;
        let minDist = Infinity;
        Object.values(state.players).forEach(p => {
            if (p.id === bot.id) return;
            
            // If bot is IT, target runners. If bot is runner, target IT.
            if (bot.isIt && p.isIt) return;
            if (!bot.isIt && !p.isIt) return;
            
            const dx = p.x - bot.x;
            const dy = p.y - bot.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < minDist) {
                minDist = dist;
                target = p;
            }
        });

        if (target) {
            const input = brain.think(bot, target, deltaTime, bot.isIt);
            
                         let botKeys = { ArrowLeft: input.left, ArrowRight: input.right, ArrowUp: false };
                
                if (input.jump && bot.aiState.lastJump !== true) {
                    bot.aiState.jumpBufferTime = 0.1;
                }
                bot.aiState.lastJump = input.jump;
                
                // Apply physics
                const wasGrounded = bot.aiState.coyoteTime > 0;
                const targetVelocityX = botKeys.ArrowLeft ? -constants.MOVE_SPEED : botKeys.ArrowRight ? constants.MOVE_SPEED : 0;
                
                if (targetVelocityX !== 0) {
                    const acceleration = wasGrounded ? constants.GROUND_ACCELERATION : constants.AIR_ACCELERATION;
                    bot.velocityX = approach(bot.velocityX, targetVelocityX, acceleration * deltaTime);
                } else {
                    const friction = wasGrounded ? constants.GROUND_FRICTION : constants.AIR_FRICTION;
                    bot.velocityX = approach(bot.velocityX, 0, friction * deltaTime);
                }
                
                bot.velocityY += constants.GRAVITY * deltaTime;
                const moveX = bot.velocityX * deltaTime;
                const moveY = bot.velocityY * deltaTime;
                const steps = Math.max(1, Math.ceil(Math.max(Math.abs(moveX), Math.abs(moveY)) / 4));
                const stepX = moveX / steps;
                const stepY = moveY / steps;
                let onGround = false;

                for (let i = 0; i < steps; i++) {
                    bot.x += stepX;
                    resolveSolidPlatformCollisions(bot);

                    bot.y += stepY;
                    const collisionResult = resolveSolidPlatformCollisions(bot);
                    onGround = collisionResult.onGround || onGround;

                    if (bot.x < constants.MAP_BOUNDS.left) { bot.x = constants.MAP_BOUNDS.left; bot.velocityX = 0; }
                    if (bot.x > constants.MAP_BOUNDS.right - constants.PLAYER_SIZE) { bot.x = constants.MAP_BOUNDS.right - constants.PLAYER_SIZE; bot.velocityX = 0; }
                    if (bot.y > constants.MAP_BOUNDS.bottom - constants.PLAYER_SIZE) {
                        bot.y = constants.MAP_BOUNDS.bottom - constants.PLAYER_SIZE;
                        bot.velocityY = 0;
                        onGround = true;
                    }
                }
                
                bot.aiState.coyoteTime = onGround ? constants.COYOTE_TIME_SECONDS : Math.max(0, bot.aiState.coyoteTime - deltaTime);
                if (bot.aiState.jumpBufferTime > 0 && (onGround || bot.aiState.coyoteTime > 0)) {
                    bot.velocityY = constants.JUMP_STRENGTH;
                    bot.aiState.jumpBufferTime = 0;
                    bot.aiState.coyoteTime = 0;
                    onGround = false;
                }
            }
        }
        
        bot.aiState.jumpBufferTime = Math.max(0, bot.aiState.jumpBufferTime - deltaTime);
        
        const now = Date.now();
        if (!bot.aiState.lastEmitTime || now - bot.aiState.lastEmitTime > 50) {
            bot.aiState.lastEmitTime = now;
            socket.emit('botMove', {
                id: bot.id, x: bot.x, y: bot.y, velocityX: bot.velocityX, velocityY: bot.velocityY
            });
        }
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
            onGround = true;
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

