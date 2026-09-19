/**
 * Bot AI v5 — Breadcrumb Trail Tracker
 * =====================================
 * The ultimate solution requested by the user: "trace my path".
 * 
 * 1. The human player leaves a trail of breadcrumbs (X, Y, isJumping).
 * 2. Bots find the nearest breadcrumb to their current position.
 * 3. They target a breadcrumb slightly ahead on the trail.
 * 4. They simply move towards that breadcrumb. If it's higher, they jump!
 * 5. If they get stuck (e.g., trying to reach a breadcrumb they aren't on the path for),
 *    they use a panic-juke to unstuck themselves.
 */

import * as constants from './constants.js';

const CFG = {
    crumbInterval: 0.05, // drop a crumb every 50ms
    trailDuration: 15,   // keep 15 seconds of trail
    targetAhead: 5,      // target the crumb 5 steps ahead (to smooth out movement)
    catchupDist: 30,     // if within 30px, consider crumb reached
};

export class BreadcrumbTrail {
    constructor() {
        this.crumbs = [];
        this.timeSinceLastCrumb = 0;
    }

    record(player, dt, keys) {
        this.timeSinceLastCrumb += dt;
        if (this.timeSinceLastCrumb >= CFG.crumbInterval) {
            this.timeSinceLastCrumb = 0;
            this.crumbs.push({
                x: player.x,
                y: player.y,
                jump: !!keys['ArrowUp']
            });

            const maxCrumbs = (CFG.trailDuration / CFG.crumbInterval);
            if (this.crumbs.length > maxCrumbs) {
                this.crumbs.shift();
            }
        }
    }

    getNearestIndex(botX, botY) {
        if (this.crumbs.length === 0) return -1;
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < this.crumbs.length; i++) {
            const c = this.crumbs[i];
            const dist = Math.hypot(c.x - botX, c.y - botY);
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
            }
        }
        return bestIdx;
    }
}

export class BreadcrumbBot {
    constructor(trail) {
        this.trail = trail;
        this.stuckTime = 0;
        this.lastX = 0;
        this.lastY = 0;
        this.panicTimer = 0;
        this.panicDir = 1;
        this.wanderDir = Math.random() < 0.5 ? 1 : -1;
    }

    think(bot, target, dt, isChasing) {
        // ── Stuck detection ──
        const moved = Math.hypot(bot.x - this.lastX, bot.y - this.lastY);
        if (moved < 2) {
            this.stuckTime += dt;
        } else {
            this.stuckTime = 0;
        }
        this.lastX = bot.x;
        this.lastY = bot.y;

        if (this.stuckTime > 0.4 && this.panicTimer <= 0) {
            this.panicTimer = 0.8;
            this.panicDir = Math.random() < 0.5 ? 1 : -1;
            this.stuckTime = 0;
        }

        if (this.panicTimer > 0) {
            this.panicTimer -= dt;
            return {
                left: this.panicDir < 0,
                right: this.panicDir > 0,
                jump: Math.random() < 0.1
            };
        }

        // ── Breadcrumb Tracking ──
        let targetX = target.x;
        let targetY = target.y;
        let shouldJump = false;

        const nearestIdx = this.trail.getNearestIndex(bot.x, bot.y);
        
        if (nearestIdx !== -1) {
            const nearestCrumb = this.trail.crumbs[nearestIdx];
            const distToTrail = Math.hypot(bot.x - nearestCrumb.x, bot.y - nearestCrumb.y);

            if (distToTrail < 150) {
                // We are near the trail! Look ahead.
                let targetIdx = Math.min(this.trail.crumbs.length - 1, nearestIdx + CFG.targetAhead);
                const targetCrumb = this.trail.crumbs[targetIdx];
                
                targetX = targetCrumb.x;
                targetY = targetCrumb.y;

                // If the trail goes up significantly, JUMP!
                if (targetCrumb.y < bot.y - 15) {
                    shouldJump = true;
                }
                // Also copy the player's jump input if they jumped around this crumb
                if (targetCrumb.jump) {
                    shouldJump = true;
                }
            } else {
                // We are far from the trail. Just wander towards the target.
                const dy = target.y - bot.y;
                if (Math.abs(dy) > 40) {
                    // Target is on different level, just patrol to find edge
                    targetX = bot.x + (this.wanderDir * 100);
                    if (this.stuckTime > 0.1) this.wanderDir *= -1;
                }
            }
        }

        const dx = targetX - bot.x;

        // Evasion logic if not IT
        if (!isChasing) {
            const evadeDx = bot.x - target.x;
            return {
                left: evadeDx < 0,
                right: evadeDx > 0,
                jump: shouldJump || Math.random() < 0.02
            };
        }

        return {
            left: dx < -10,
            right: dx > 10,
            jump: shouldJump
        };
    }
}
