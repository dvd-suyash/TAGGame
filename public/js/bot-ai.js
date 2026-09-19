/**
 * Bot AI v6 — Raycast / Sensor Steering
 * =====================================
 * Relentless, neck-and-neck pursuit using spatial sensors.
 * 
 * Rules:
 * 1. Move horizontally towards the player.
 * 2. CEILING SENSOR: If the player is above us, cast a ray UP. If it hits a platform, 
 *    steer towards the edge of that platform to get out from under it. Once clear, JUMP!
 * 3. WALL SENSOR: Look ahead. If there's a wall, JUMP!
 * 4. GAP SENSOR: Look ahead and down. If there is no ground, and the player is not below us, JUMP!
 * 5. PANIC SENSOR: If we haven't moved in 0.3s, mash jump and reverse direction.
 */

import * as constants from './constants.js';
import { state } from './state.js';

const CFG = {
    playerSize: 26,
    jumpCooldown: 0.2
};

function getCeiling(x, botY, targetY, platforms) {
    let lowestY = -Infinity;
    let lowestCeiling = null;
    
    for (const p of platforms) {
        if (p.height > 50 && p.width < 50) continue; // skip walls
        
        // Is platform horizontally above us?
        if (x + CFG.playerSize > p.x && x < p.x + p.width) {
            // Is it vertically between us and the target?
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
    const checkX = x + (dir * 45); // look ahead
    const checkY = botY + CFG.playerSize + 5; // look below feet
    
    // Check floor bounds
    if (checkY >= constants.MAP_BOUNDS.bottom) return false;

    for (const p of platforms) {
        if (p.height > 50 && p.width < 50) continue;
        if (checkX + CFG.playerSize > p.x && checkX < p.x + p.width) {
            // Is there ground within a reasonable drop distance?
            if (p.y >= botY && p.y < botY + 150) {
                return false; // Found ground
            }
        }
    }
    return true; // Gap!
}

function isWallAhead(x, botY, dir, platforms) {
    const checkX = x + (dir * 30);
    for (const p of platforms) {
        if (checkX + CFG.playerSize > p.x && checkX < p.x + p.width) {
            if (p.y < botY + CFG.playerSize && p.y + p.height > botY) {
                return true;
            }
        }
    }
    // Check map bounds
    if (checkX < constants.MAP_BOUNDS.left || checkX + CFG.playerSize > constants.MAP_BOUNDS.right) return true;
    
    return false;
}

export class SensorBot {
    constructor() {
        this.stuckTime = 0;
        this.lastX = 0;
        this.lastY = 0;
        this.panicTimer = 0;
        this.panicDir = 1;
        this.jumpCooldown = 0;
    }

    think(bot, target, dt, isChasing) {
        this.jumpCooldown -= dt;

        // ── Stuck detection ──
        const moved = Math.hypot(bot.x - this.lastX, bot.y - this.lastY);
        if (moved < 2) {
            this.stuckTime += dt;
        } else {
            this.stuckTime = 0;
        }
        this.lastX = bot.x;
        this.lastY = bot.y;

        if (this.stuckTime > 0.3 && this.panicTimer <= 0) {
            this.panicTimer = 0.5;
            this.panicDir = Math.random() < 0.5 ? 1 : -1;
            this.stuckTime = 0;
        }

        if (this.panicTimer > 0) {
            this.panicTimer -= dt;
            return {
                left: this.panicDir < 0,
                right: this.panicDir > 0,
                jump: this.jumpCooldown <= 0 && Math.random() < 0.2
            };
        }

        // ── Steering ──
        let targetX = target.x;
        let shouldJump = false;

        if (!isChasing) {
            // Flee to opposite side
            const dx = bot.x - target.x;
            targetX = dx > 0 ? constants.MAP_BOUNDS.right : constants.MAP_BOUNDS.left;
        } else {
            // Predict movement slightly
            targetX += (target.velocityX || 0) * 0.15;
        }

        // Ceiling Evader
        if (target.y < bot.y - 20) {
            const ceiling = getCeiling(bot.x, bot.y, target.y, state.platforms);
            if (ceiling) {
                // Steer towards nearest edge of ceiling
                const leftDist = bot.x - ceiling.x;
                const rightDist = (ceiling.x + ceiling.width) - bot.x;
                if (leftDist < rightDist) {
                    targetX = ceiling.x - 20; // aim left of edge
                } else {
                    targetX = ceiling.x + ceiling.width + 20; // aim right of edge
                }
            } else {
                // Target is above, and NO ceiling is blocking us! JUMP!
                if (Math.abs(targetX - bot.x) < 80) {
                    shouldJump = true;
                }
            }
        }

        const moveDir = targetX > bot.x ? 1 : -1;
        const dx = targetX - bot.x;

        // Wall & Gap Sensors
        if (isWallAhead(bot.x, bot.y, moveDir, state.platforms)) {
            shouldJump = true;
        }

        if (isGapAhead(bot.x, bot.y, moveDir, state.platforms)) {
            // Only jump over gap if target is NOT below us
            if (target.y <= bot.y + 30) {
                shouldJump = true;
            }
        }

        if (shouldJump && this.jumpCooldown <= 0) {
            this.jumpCooldown = CFG.jumpCooldown;
        } else if (shouldJump) {
            shouldJump = false;
        }

        return {
            left: dx < -5,
            right: dx > 5,
            jump: shouldJump
        };
    }
}
