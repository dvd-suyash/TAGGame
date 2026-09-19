/**
 * Bot AI v8 — Pure Action Sensor
 * ==============================
 * Chasing: Direct, relentless pursuit using spatial raycasts. Skips player paths/errors and goes straight for the kill.
 * Fleeing: Runs away, uses Escape State Machine to break out of corners and run past the chaser.
 */

import * as constants from './constants.js';
import { state } from './state.js';

const CFG = { playerSize: 26 };

function getCeiling(x, botY, targetY, platforms) {
    let lowestY = -Infinity;
    let lowestCeiling = null;
    for (const p of platforms) {
        if (p.height > 50 && p.width < 50) continue; 
        if (x + CFG.playerSize > p.x && x < p.x + p.width) {
            if (p.y < botY && p.y >= targetY - 10) {
                if (p.y > lowestY) {
                    lowestY = p.y;
                    lowestCeiling = p;
                }
            }
        }
    }
    return lowestCeiling;
}

function isGapAhead(x, botY, dir, platforms) {
    const checkX = x + (dir * 45);
    const checkY = botY + CFG.playerSize + 5;
    if (checkY >= constants.MAP_BOUNDS.bottom) return false;
    for (const p of platforms) {
        if (p.height > 50 && p.width < 50) continue;
        if (checkX + CFG.playerSize > p.x && checkX < p.x + p.width) {
            if (p.y >= botY - 5 && p.y < botY + 150) return false;
        }
    }
    return true;
}

function isWallAhead(x, botY, dir, platforms) {
    const checkX = x + (dir * 30);
    const botBottom = botY + CFG.playerSize - 2; 
    for (const p of platforms) {
        if (checkX + CFG.playerSize > p.x && checkX < p.x + p.width) {
            if (p.y < botBottom && p.y + p.height > botY + 2) return true;
        }
    }
    if (checkX < constants.MAP_BOUNDS.left || checkX + CFG.playerSize > constants.MAP_BOUNDS.right) return true;
    return false;
}

export class ActionBot {
    constructor() {
        this.jumpCooldown = 0;
        this.stuckTime = 0;
        this.lastX = 0;
        this.escaping = false;
        this.escapeTargetX = 0;
    }

    think(bot, target, dt, isChasing) {
        this.jumpCooldown -= dt;

        if (Math.abs(bot.x - this.lastX) < 1) {
            this.stuckTime += dt;
        } else {
            this.stuckTime = 0;
        }
        this.lastX = bot.x;

        if (isChasing) {
            return this._chase(bot, target, dt);
        } else {
            return this._flee(bot, target, dt);
        }
    }

    _chase(bot, target, dt) {
        let targetX = target.x + (target.velocityX || 0) * 0.15; // Predict slightly
        let shouldJump = false;

        // Stuck Panic
        if (this.stuckTime > 0.3) {
            shouldJump = true;
            this.stuckTime = 0;
            targetX = bot.x + (Math.random() < 0.5 ? 100 : -100);
        }

        // Ceiling Evader
        if (target.y < bot.y - 20) {
            const ceiling = getCeiling(bot.x, bot.y, target.y, state.platforms);
            if (ceiling) {
                const leftDist = bot.x - ceiling.x;
                const rightDist = (ceiling.x + ceiling.width) - bot.x;
                targetX = leftDist < rightDist ? ceiling.x - 20 : ceiling.x + ceiling.width + 20;
            } else if (Math.abs(targetX - bot.x) < 80) {
                shouldJump = true;
            }
        }

        const moveDir = targetX > bot.x ? 1 : -1;
        
        if (isWallAhead(bot.x, bot.y, moveDir, state.platforms)) shouldJump = true;
        if (isGapAhead(bot.x, bot.y, moveDir, state.platforms) && target.y <= bot.y + 30) shouldJump = true;

        if (shouldJump && this.jumpCooldown <= 0) {
            this.jumpCooldown = 0.25;
        } else if (shouldJump) {
            shouldJump = false;
        }

        const dx = targetX - bot.x;
        return { mode: 'physics', left: dx < -5, right: dx > 5, jump: shouldJump };
    }

    _flee(bot, target, dt) {
        let targetX;
        
        // Escape State Machine
        if (this.escaping) {
            targetX = this.escapeTargetX;
            if (Math.sign(bot.x - target.x) === Math.sign(this.escapeTargetX - target.x) && Math.abs(bot.x - target.x) > 100) {
                this.escaping = false;
            }
        } else {
            targetX = bot.x > target.x ? constants.MAP_BOUNDS.right : constants.MAP_BOUNDS.left;
        }
        
        const moveDir = targetX > bot.x ? 1 : -1;
        
        // Break out of corners
        if (!this.escaping && isWallAhead(bot.x, bot.y, moveDir, state.platforms)) {
            this.escaping = true;
            this.escapeTargetX = moveDir === -1 ? constants.MAP_BOUNDS.right : constants.MAP_BOUNDS.left;
        }

        const finalMoveDir = targetX > bot.x ? 1 : -1;
        let shouldJump = false;

        // Obstacle avoidance
        if (isWallAhead(bot.x, bot.y, finalMoveDir, state.platforms)) shouldJump = true;
        if (isGapAhead(bot.x, bot.y, finalMoveDir, state.platforms) && target.y <= bot.y + 30) shouldJump = true;
        
        // Stuck Panic
        if (this.stuckTime > 0.4) {
            shouldJump = true;
            this.stuckTime = 0;
            this.escaping = true;
            this.escapeTargetX = finalMoveDir > 0 ? constants.MAP_BOUNDS.left : constants.MAP_BOUNDS.right;
        }

        if (shouldJump && this.jumpCooldown <= 0) {
            this.jumpCooldown = 0.25;
        } else if (shouldJump) {
            shouldJump = false;
        }

        const runDx = targetX - bot.x;
        return { mode: 'physics', left: runDx < -5, right: runDx > 5, jump: shouldJump };
    }
}
