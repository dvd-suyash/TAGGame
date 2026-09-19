/**
 * Bot AI v4 — Shadow Trail (Input Playback)
 * ==========================================
 * Used by: Celeste (Badeline), Awesomenauts, Pac-Man CE
 *
 * Instead of pathfinding, we record the player's INPUTS (left, right, jump)
 * every frame into a circular buffer. The bot replays those exact inputs
 * with a configurable time delay.
 *
 * Why this works perfectly:
 *   - If the player reached a platform, the bot WILL reach it too
 *   - Zero pathfinding bugs — the bot literally follows your footsteps
 *   - The delay creates natural urgency — shorter delay = harder game
 *   - It feels like something is stalking you, which is terrifying
 *
 * The bot uses the same physics engine as the player, so it moves
 * identically. No teleporting, no cheating.
 */

import * as constants from './constants.js';

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const TRAIL_CFG = {
    trailDelay:     2.5,    // seconds behind the player (lower = harder)
    maxTrailLength: 600,    // frames of history (~10 seconds at 60fps)
    sampleInterval: 1 / 60, // record every frame at 60fps
    wanderChance:   0.003,  // small chance per frame to deviate slightly
    wanderDuration: 0.3,    // how long a wander deviation lasts
};

// ─── INPUT TRAIL RECORDER ───────────────────────────────────────────────────

export class InputTrail {
    constructor() {
        this.buffer = [];       // Array of { time, left, right, jump }
        this.currentTime = 0;
    }

    /**
     * Record the player's current input state. Call every frame.
     * @param {object} keys  - the player's key state { ArrowLeft, ArrowRight, ArrowUp }
     * @param {number} dt    - delta time in seconds
     */
    record(keys, dt) {
        this.currentTime += dt;

        this.buffer.push({
            time: this.currentTime,
            left:  !!keys['ArrowLeft'],
            right: !!keys['ArrowRight'],
            jump:  !!keys['ArrowUp'],
        });

        // Trim old entries beyond max trail length
        while (this.buffer.length > TRAIL_CFG.maxTrailLength) {
            this.buffer.shift();
        }
    }

    /**
     * Read inputs from `delay` seconds ago.
     * @param {number} delay - seconds behind current time
     * @returns {{ left: boolean, right: boolean, jump: boolean }}
     */
    readAt(delay) {
        const targetTime = this.currentTime - delay;

        if (this.buffer.length === 0 || targetTime < this.buffer[0].time) {
            // Not enough history yet — return idle
            return { left: false, right: false, jump: false };
        }

        // Binary search for the closest frame
        let lo = 0;
        let hi = this.buffer.length - 1;

        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (this.buffer[mid].time < targetTime) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }

        const entry = this.buffer[lo];
        return {
            left:  entry.left,
            right: entry.right,
            jump:  entry.jump,
        };
    }

    /**
     * Get the total seconds of recorded trail.
     */
    getDuration() {
        if (this.buffer.length < 2) return 0;
        return this.buffer[this.buffer.length - 1].time - this.buffer[0].time;
    }
}


// ─── SHADOW BOT BRAIN ───────────────────────────────────────────────────────

export class ShadowBotBrain {
    /**
     * @param {InputTrail} trail - shared trail recorder (one per game)
     * @param {number} delayOffset - additional delay offset for this specific bot
     *                               (so multiple bots don't stack on each other)
     */
    constructor(trail, delayOffset = 0) {
        this.trail = trail;
        this.delay = TRAIL_CFG.trailDelay + delayOffset;
        this.wanderTimer = 0;
        this.wanderDir = 0; // -1 or 1
        this.lastJump = false;
    }

    /**
     * Called every frame. Returns virtual key presses.
     * @param {object} bot    - { x, y, velocityX, velocityY, isIt }
     * @param {object} target - { x, y } (the player)
     * @param {number} dt     - seconds
     * @returns {{ left: boolean, right: boolean, jump: boolean }}
     */
    think(bot, target, dt) {
        // Read the player's inputs from `delay` seconds ago
        const replay = this.trail.readAt(this.delay);

        // ── Occasional wander for personality ──
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0 && Math.random() < TRAIL_CFG.wanderChance) {
            this.wanderDir = Math.random() < 0.5 ? -1 : 1;
            this.wanderTimer = TRAIL_CFG.wanderDuration;
        }

        let { left, right, jump } = replay;

        // Apply slight wander deviation (makes bot feel alive, not robotic)
        if (this.wanderTimer > 0) {
            if (this.wanderDir < 0) { left = true; right = false; }
            else { left = false; right = true; }
            // Don't override jump during wander
        }

        return { left, right, jump };
    }
}
