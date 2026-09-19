/**
 * Bot AI v7 — Hybrid Shadow Tracker
 * =================================
 * As requested: "completely follow the user's character. fully."
 * 
 * - When CHASING (IT): The bot snaps to the player's historical path queue 
 *   and replays their exact physical coordinates at a slightly faster speed (1.05x).
 *   This creates a terrifying, flawless, neck-and-neck pursuit that cannot get stuck.
 * 
 * - When FLEEING (Runner): The bot uses Raycast Sensor steering to run away 
 *   and avoid obstacles dynamically.
 */

import * as constants from './constants.js';
import { state } from './state.js';

// ─── PLAYER PATH RECORDER ───────────────────────────────────────────────────

export class PathRecorder {
    constructor() {
        this.paths = {}; // keyed by player.id
        this.maxFrames = 600; // 10 seconds at 60fps
    }

    record(players) {
        for (const id in players) {
            const p = players[id];
            if (p.isBot) continue; // Only record humans

            if (!this.paths[id]) {
                this.paths[id] = [];
            }

            this.paths[id].push({
                x: p.x,
                y: p.y,
                velocityX: p.velocityX,
                velocityY: p.velocityY
            });

            if (this.paths[id].length > this.maxFrames) {
                this.paths[id].shift();
            }
        }
    }
    
    getPath(id) {
        return this.paths[id] || [];
    }
}

// ─── SENSOR FLEE LOGIC (from v6) ────────────────────────────────────────────

const CFG = { playerSize: 26 };

function isGapAhead(x, botY, dir, platforms) {
    const checkX = x + (dir * 45);
    const checkY = botY + CFG.playerSize + 5;
    if (checkY >= constants.MAP_BOUNDS.bottom) return false;
    for (const p of platforms) {
        if (p.height > 50 && p.width < 50) continue;
        if (checkX + CFG.playerSize > p.x && checkX < p.x + p.width) {
            if (p.y >= botY && p.y < botY + 150) return false;
        }
    }
    return true;
}

function isWallAhead(x, botY, dir, platforms) {
    const checkX = x + (dir * 30);
    for (const p of platforms) {
        if (checkX + CFG.playerSize > p.x && checkX < p.x + p.width) {
            if (p.y < botY + CFG.playerSize && p.y + p.height > botY) return true;
        }
    }
    if (checkX < constants.MAP_BOUNDS.left || checkX + CFG.playerSize > constants.MAP_BOUNDS.right) return true;
    return false;
}

// ─── BOT BRAIN ──────────────────────────────────────────────────────────────

export class HybridBot {
    constructor(recorder, botIndex) {
        this.recorder = recorder;
        this.botIndex = botIndex;
        
        // Shadow Chasing State
        this.shadowDelayFrames = 60 + (botIndex * 30); // Base 1s delay, +0.5s per bot
        this.currentReadIndex = 0;
        this.isLockedOn = false;
        
        // Fleeing State
        this.jumpCooldown = 0;
        this.fleeDir = Math.random() < 0.5 ? 1 : -1;
        this.stuckTime = 0;
        this.lastX = 0;
    }

    think(bot, target, dt, isChasing) {
        if (isChasing) {
            return this._chaseShadow(bot, target);
        } else {
            return this._fleeSensors(bot, target, dt);
        }
    }

    _chaseShadow(bot, target) {
        const path = this.recorder.getPath(target.id);
        
        if (path.length < this.shadowDelayFrames) {
            // Not enough history yet, stand still
            return { mode: 'physics', left: false, right: false, jump: false };
        }

        // Lock on!
        if (!this.isLockedOn) {
            this.currentReadIndex = path.length - this.shadowDelayFrames;
            this.isLockedOn = true;
        }

        // Advance through the path slightly faster than 1 frame per tick to catch up
        this.currentReadIndex += 1.05; 
        
        // Cap it so we don't read past the present
        if (this.currentReadIndex >= path.length - 2) {
            this.currentReadIndex = path.length - 2;
        }

        // Interpolate position
        const idx = Math.floor(this.currentReadIndex);
        const p1 = path[idx];
        const p2 = path[idx + 1];
        const fraction = this.currentReadIndex - idx;

        if (p1 && p2) {
            const newX = p1.x + (p2.x - p1.x) * fraction;
            const newY = p1.y + (p2.y - p1.y) * fraction;
            const newVx = p1.velocityX + (p2.velocityX - p1.velocityX) * fraction;
            const newVy = p1.velocityY + (p2.velocityY - p1.velocityY) * fraction;
            
            return {
                mode: 'shadow',
                x: newX,
                y: newY,
                velocityX: newVx,
                velocityY: newVy
            };
        }

        return { mode: 'physics', left: false, right: false, jump: false };
    }

    _fleeSensors(bot, target, dt) {
        this.isLockedOn = false; // Break shadow lock when we stop chasing
        this.jumpCooldown -= dt;

        if (Math.abs(bot.x - this.lastX) < 1) {
            this.stuckTime += dt;
        } else {
            this.stuckTime = 0;
        }
        this.lastX = bot.x;

        if (this.stuckTime > 0.2) {
            this.fleeDir *= -1;
            this.stuckTime = 0;
            return { mode: 'physics', left: this.fleeDir < 0, right: this.fleeDir > 0, jump: true };
        }

        let targetX = bot.x + this.fleeDir * 100;
        
        // If approaching target, reverse
        if (Math.abs(target.x - targetX) < Math.abs(target.x - bot.x)) {
            this.fleeDir *= -1;
            targetX = bot.x + this.fleeDir * 100;
        }

        let shouldJump = false;
        if (isWallAhead(bot.x, bot.y, this.fleeDir, state.platforms)) {
            shouldJump = true;
        }
        if (isGapAhead(bot.x, bot.y, this.fleeDir, state.platforms) && target.y <= bot.y + 30) {
            shouldJump = true;
        }

        if (shouldJump && this.jumpCooldown <= 0) {
            this.jumpCooldown = 0.2;
        } else if (shouldJump) {
            shouldJump = false;
        }

        return { mode: 'physics', left: this.fleeDir < 0, right: this.fleeDir > 0, jump: shouldJump };
    }
}
