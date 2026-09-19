/**
 * Bot AI v3 — Reactive Platform Scanner
 * ======================================
 * Inspired by Spelunky/Celeste enemy AI and the Awesomenauts "record & playback" technique.
 * 
 * Instead of pre-building a fragile navigation graph, this system uses real-time
 * platform scanning to make decisions every frame:
 *
 *   1. "What platform am I standing on?"
 *   2. "What platform is my target on?"
 *   3. "Are we on the same platform?" → Direct chase.
 *   4. "Target is ABOVE me?" → Find nearest reachable platform that's higher, walk to its edge, jump.
 *   5. "Target is BELOW me?" → Walk to the nearest edge and drop off.
 *   6. "I'm stuck?" → Jump + reverse direction.
 *
 * The bot NEVER sets position directly. It only returns virtual key presses
 * { left, right, jump } that get fed into the identical physics loop as the player.
 *
 * This approach is robust because it doesn't depend on a precomputed graph being correct.
 * It reacts to the world as-is, every single frame.
 */

import * as constants from './constants.js';
import { state } from './state.js';

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const BOT_CFG = {
    // Physics (must match constants.js exactly)
    gravity:       constants.GRAVITY,            // 3200
    jumpVelocity:  Math.abs(constants.JUMP_STRENGTH), // 880
    moveSpeed:     constants.MOVE_SPEED,          // 350
    playerSize:    constants.PLAYER_SIZE,          // 26

    // Tuning
    samePlatformYThreshold: 50,   // px — vertical tolerance for "same level"
    stuckThreshold:         0.3,  // seconds before declaring stuck
    stuckDistance:           2,    // px — if we moved less than this, we're stuck
    jumpCooldown:           0.25, // seconds between jumps
    replanInterval:         0.3,  // seconds between target re-evaluation
    predictionAhead:        0.25, // seconds — aim ahead of target's velocity
    edgeScanRange:          40,   // px — how close to a platform edge to trigger jump
    maxJumpHeight:          null, // computed below
    maxJumpDistance:        null, // computed below
};

// Pre-compute max jump reach from real physics
// Max height: v²/(2g) where v = jumpVelocity
BOT_CFG.maxJumpHeight = (BOT_CFG.jumpVelocity * BOT_CFG.jumpVelocity) / (2 * BOT_CFG.gravity);
// Max horizontal distance during a full jump arc
// Time to apex: v/g. Full flight ≈ 2 * apex time
const timeToApex = BOT_CFG.jumpVelocity / BOT_CFG.gravity;
const fullJumpTime = timeToApex * 2;
BOT_CFG.maxJumpDistance = BOT_CFG.moveSpeed * fullJumpTime;


// ─── PLATFORM HELPERS ───────────────────────────────────────────────────────

/**
 * Returns the platform a point is standing on, or null.
 * A point is "on" a platform if it's within a few pixels of the top surface.
 */
function getPlatformUnder(x, y, platforms) {
    const footY = y + BOT_CFG.playerSize;
    let best = null;
    let bestDist = 20; // max distance to count as "on"

    for (const p of platforms) {
        // Skip walls (thin tall platforms) — only care about walkable surfaces
        if (p.height > 50 && p.width < 50) continue;

        const topY = p.y;
        const dist = Math.abs(footY - topY);

        if (dist < bestDist && x + BOT_CFG.playerSize > p.x && x < p.x + p.width) {
            bestDist = dist;
            best = p;
        }
    }

    // Check floor
    const floorY = constants.MAP_BOUNDS.bottom - BOT_CFG.playerSize;
    if (Math.abs(y - floorY) < 10) {
        return { id: 'floor', x: constants.MAP_BOUNDS.left, y: constants.MAP_BOUNDS.bottom, width: constants.MAP_BOUNDS.right - constants.MAP_BOUNDS.left, height: 10, isFloor: true };
    }

    return best;
}

/**
 * Find all platforms reachable by jumping from a given position.
 * Uses real projectile math to validate each one.
 */
function findReachablePlatformsAbove(botX, botY, platforms) {
    const results = [];

    for (const p of platforms) {
        // Skip walls
        if (p.height > 50 && p.width < 50) continue;

        const platTopY = p.y - BOT_CFG.playerSize; // where feet would be

        // Must be ABOVE us
        if (platTopY >= botY - 5) continue;

        // Must be within jump height
        const heightDiff = botY - platTopY;
        if (heightDiff > BOT_CFG.maxJumpHeight * 1.1) continue;

        // Check if we can reach it horizontally
        // Time to reach that height during jump: solve y = vy*t + 0.5*g*t²
        // We need to reach the platform's X range during that time window
        const platLeftX = p.x;
        const platRightX = p.x + p.width;
        const platCenterX = platLeftX + p.width / 2;

        // Can we reach the platform's horizontal range during the jump arc?
        const horizontalDist = Math.min(
            Math.abs(botX - platLeftX),
            Math.abs(botX - platRightX),
            Math.abs(botX - platCenterX)
        );

        if (horizontalDist > BOT_CFG.maxJumpDistance * 1.2) continue;

        results.push({
            platform: p,
            topY: platTopY,
            centerX: platCenterX,
            leftX: platLeftX,
            rightX: platRightX,
            heightDiff,
            horizontalDist
        });
    }

    // Sort by: prefer platforms that are closest to target vertically
    return results;
}

/**
 * Find the nearest edge (left or right) of the current platform.
 * Returns { x, direction } where direction is -1 (left edge) or 1 (right edge).
 */
function getNearestEdge(botX, platform) {
    if (!platform) return null;

    const leftEdge = platform.x;
    const rightEdge = platform.x + platform.width;
    const distToLeft = Math.abs(botX - leftEdge);
    const distToRight = Math.abs(botX - rightEdge);

    if (distToLeft < distToRight) {
        return { x: leftEdge, direction: -1 };
    } else {
        return { x: rightEdge, direction: 1 };
    }
}


// ─── BOT BRAIN ──────────────────────────────────────────────────────────────

export class BotBrain {
    constructor() {
        this.stuckTime = 0;
        this.lastX = 0;
        this.lastY = 0;
        this.jumpCooldownTimer = 0;
        this.replanTimer = 0;
        this.cachedTargetX = 0;
        this.cachedTargetY = 0;
        this.forceDirection = 0;    // -1 or 1 when panic-fleeing a stuck state
        this.forceTimer = 0;        // how long to hold the forced direction
        this.lastJumpInput = false;
    }

    /**
     * Called every frame.
     * @param {object} bot    - { x, y, velocityX, velocityY, isIt }
     * @param {object} target - { x, y, velocityX, velocityY }
     * @param {number} dt     - seconds
     * @param {boolean} isChasing - true if this bot should chase, false if flee
     * @returns {{ left: boolean, right: boolean, jump: boolean }}
     */
    think(bot, target, dt, isChasing) {
        this.jumpCooldownTimer = Math.max(0, this.jumpCooldownTimer - dt);
        this.replanTimer -= dt;

        // ── Predict target position ──
        if (this.replanTimer <= 0) {
            this.cachedTargetX = target.x + (target.velocityX || 0) * BOT_CFG.predictionAhead;
            this.cachedTargetY = target.y;
            this.replanTimer = BOT_CFG.replanInterval;
        }

        const targetX = isChasing ? this.cachedTargetX : this._getFleeX(bot, target);
        const targetY = isChasing ? this.cachedTargetY : bot.y;

        // ── Stuck detection ──
        const moved = Math.hypot(bot.x - this.lastX, bot.y - this.lastY);
        if (moved < BOT_CFG.stuckDistance) {
            this.stuckTime += dt;
        } else {
            this.stuckTime = 0;
        }
        this.lastX = bot.x;
        this.lastY = bot.y;

        // ── Force timer (panic mode) ──
        if (this.forceTimer > 0) {
            this.forceTimer -= dt;
            const jump = this.jumpCooldownTimer <= 0 && Math.random() < 0.15;
            if (jump) this.jumpCooldownTimer = BOT_CFG.jumpCooldown;
            return {
                left: this.forceDirection < 0,
                right: this.forceDirection > 0,
                jump,
            };
        }

        // ── If stuck for too long, PANIC: reverse + jump ──
        if (this.stuckTime > BOT_CFG.stuckThreshold) {
            this.stuckTime = 0;
            // Reverse direction and force it for a bit
            const currentDir = Math.sign(targetX - bot.x) || 1;
            this.forceDirection = -currentDir;
            this.forceTimer = 0.4 + Math.random() * 0.3; // 0.4-0.7s
            return { left: false, right: false, jump: true };
        }

        // ── Platform awareness ──
        const botPlatform = getPlatformUnder(bot.x, bot.y, state.platforms);
        const targetPlatform = getPlatformUnder(target.x, target.y, state.platforms);

        const dx = targetX - bot.x;
        const dy = targetY - bot.y;
        const samePlatform = botPlatform && targetPlatform &&
            (botPlatform === targetPlatform || botPlatform.id === targetPlatform.id);
        const sameLevel = Math.abs(dy) < BOT_CFG.samePlatformYThreshold;

        // ──────────────────────────────────────────────────────────────────
        // CASE 1: Same platform or same vertical level → DIRECT CHASE
        // ──────────────────────────────────────────────────────────────────
        if (samePlatform || sameLevel) {
            return {
                left: dx < -6,
                right: dx > 6,
                jump: false,
            };
        }

        // ──────────────────────────────────────────────────────────────────
        // CASE 2: Target is ABOVE us → Find a way UP
        // ──────────────────────────────────────────────────────────────────
        if (dy < -BOT_CFG.samePlatformYThreshold) {
            return this._navigateUp(bot, target, targetX, targetY, botPlatform);
        }

        // ──────────────────────────────────────────────────────────────────
        // CASE 3: Target is BELOW us → Walk off edge to drop down
        // ──────────────────────────────────────────────────────────────────
        if (dy > BOT_CFG.samePlatformYThreshold) {
            return this._navigateDown(bot, targetX, botPlatform);
        }

        // Fallback: chase directly
        return { left: dx < 0, right: dx > 0, jump: false };
    }

    /**
     * Navigate upward: find reachable platforms above and jump to the best one.
     */
    _navigateUp(bot, target, targetX, targetY, botPlatform) {
        const reachable = findReachablePlatformsAbove(bot.x, bot.y, state.platforms);

        if (reachable.length === 0) {
            // Can't find any reachable platform above. Just chase horizontally
            // and hope we find a better position.
            const dx = targetX - bot.x;
            const shouldJump = this.jumpCooldownTimer <= 0;
            if (shouldJump) this.jumpCooldownTimer = BOT_CFG.jumpCooldown;
            return { left: dx < 0, right: dx > 0, jump: shouldJump };
        }

        // Score each reachable platform: prefer the one closest to the target
        let bestPlatform = null;
        let bestScore = Infinity;

        for (const rp of reachable) {
            // Score = distance from this platform's center to the target
            const distToTarget = Math.hypot(rp.centerX - targetX, rp.topY - targetY);
            // Penalize platforms that are far horizontally (harder jumps)
            const score = distToTarget + rp.horizontalDist * 0.5;
            if (score < bestScore) {
                bestScore = score;
                bestPlatform = rp;
            }
        }

        if (!bestPlatform) {
            return { left: targetX < bot.x, right: targetX > bot.x, jump: false };
        }

        // Strategy: walk toward the nearest edge of the target platform, then jump
        const jumpTargetX = bot.x < bestPlatform.centerX ? bestPlatform.leftX : bestPlatform.rightX;
        const dx = jumpTargetX - bot.x;

        // Are we roughly underneath the target platform? → JUMP!
        const underPlatform = bot.x + BOT_CFG.playerSize > bestPlatform.leftX - 30 &&
                              bot.x < bestPlatform.rightX + 30;

        if (underPlatform || Math.abs(dx) < BOT_CFG.edgeScanRange) {
            const shouldJump = this.jumpCooldownTimer <= 0;
            if (shouldJump) this.jumpCooldownTimer = BOT_CFG.jumpCooldown;
            return {
                left: dx < 0,
                right: dx > 0,
                jump: shouldJump,
            };
        }

        // Walk toward the platform
        return { left: dx < 0, right: dx > 0, jump: false };
    }

    /**
     * Navigate downward: walk toward the nearest edge and fall off.
     */
    _navigateDown(bot, targetX, botPlatform) {
        if (!botPlatform || botPlatform.isFloor) {
            // Already on the floor, can't go lower. Chase horizontally.
            return { left: targetX < bot.x, right: targetX > bot.x, jump: false };
        }

        // Find the edge of our current platform that's closest to the target
        const leftEdge = botPlatform.x;
        const rightEdge = botPlatform.x + botPlatform.width;
        const distToLeft = Math.abs(bot.x - leftEdge);
        const distToRight = Math.abs(bot.x - rightEdge);

        // Prefer the edge that's in the direction of the target
        let targetEdge;
        if (targetX < botPlatform.x + botPlatform.width / 2) {
            targetEdge = leftEdge - 10; // walk slightly past the edge to fall off
        } else {
            targetEdge = rightEdge + 10;
        }

        const dx = targetEdge - bot.x;
        return { left: dx < 0, right: dx > 0, jump: false };
    }

    _getFleeX(bot, target) {
        const dx = bot.x - target.x;
        if (dx > 0) {
            return Math.min(bot.x + 250, constants.MAP_BOUNDS.right - BOT_CFG.playerSize);
        } else {
            return Math.max(bot.x - 250, constants.MAP_BOUNDS.left);
        }
    }
}
