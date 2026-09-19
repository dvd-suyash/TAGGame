/**
 * Bot AI v10 — Waypoint Climber
 * ==============================
 * A simple, organic approach requested by the user.
 * - If target is on the same level or below: chase X directly.
 * - If target is above: find a platform edge, walk to its outside, jump inwards to climb it.
 */

import * as constants from './constants.js';
import { state } from './state.js';

function findBestClimbNode(bot, target, platforms) {
    let bestNode = null;
    let bestScore = Infinity;

    for (const p of platforms) {
        if (p.height > 50 && p.width < 50) continue; // skip walls

        // We only care about platforms ABOVE the bot
        if (p.y >= bot.y - 10) continue;

        // Must be reachable by a single jump (jump strength is ~120px)
        const heightDiff = bot.y - p.y;
        if (heightDiff > 140) continue; 

        // Evaluate Left Edge (jump right to get on)
        const leftEdgeX = p.x;
        // Evaluate Right Edge (jump left to get on)
        const rightEdgeX = p.x + p.width;

        const evaluateEdge = (edgeX, inwardDir) => {
            const distToBot = Math.hypot(edgeX - bot.x, p.y - bot.y);
            const distToTarget = Math.hypot(edgeX - target.x, p.y - target.y);
            
            // Prefer edges that are closer to the bot, but also closer to the target
            const score = (distToBot * 1.5) + distToTarget;

            if (score < bestScore) {
                bestScore = score;
                bestNode = {
                    x: edgeX,
                    y: p.y,
                    inwardDir: inwardDir
                };
            }
        };

        evaluateEdge(leftEdgeX, 1);
        evaluateEdge(rightEdgeX, -1);
    }
    return bestNode;
}

export class ActionBot {
    constructor() {
        this.stuckTime = 0;
        this.lastX = 0;
        this.panicTimer = 0;
        this.panicDir = 1;
        this.jumpCooldown = 0;
        
        // Waypoint state
        this.targetNode = null;
        this.nodeTimeout = 0;
    }

    think(bot, target, dt, isChasing) {
        this.jumpCooldown -= dt;

        // Stuck detection panic
        if (Math.abs(bot.x - this.lastX) < 1) {
            this.stuckTime += dt;
        } else {
            this.stuckTime = 0;
        }
        this.lastX = bot.x;

        if (this.stuckTime > 0.5 && this.panicTimer <= 0) {
            this.panicTimer = 0.5;
            this.panicDir = Math.random() < 0.5 ? 1 : -1;
            this.stuckTime = 0;
            this.targetNode = null; // reset climbing state if stuck
        }

        if (this.panicTimer > 0) {
            this.panicTimer -= dt;
            return {
                left: this.panicDir < 0,
                right: this.panicDir > 0,
                jump: this.jumpCooldown <= 0
            };
        }

        if (isChasing) {
            return this._chase(bot, target, dt);
        } else {
            return this._flee(bot, target, dt);
        }
    }

    _chase(bot, target, dt) {
        const dy = target.y - bot.y;

        // TARGET IS ABOVE US -> CLIMB
        if (dy < -30) {
            // If we have a node, but we've climbed past it, clear it
            if (this.targetNode && bot.y <= this.targetNode.y + 10) {
                this.targetNode = null;
            }

            // Find a new platform edge to climb to
            if (!this.targetNode) {
                this.targetNode = findBestClimbNode(bot, target, state.platforms);
                this.nodeTimeout = 3.0; // Give up after 3 seconds of trying
            }

            if (this.targetNode) {
                this.nodeTimeout -= dt;
                if (this.nodeTimeout <= 0) { this.targetNode = null; return { left: false, right: false, jump: false }; }

                // We want to jump from slightly OUTSIDE the platform edge
                const launchPadX = this.targetNode.x - (this.targetNode.inwardDir * 40);
                const distToLaunch = launchPadX - bot.x;

                // Are we physically on top of the launch pad?
                if (Math.abs(distToLaunch) < 25) {
                    if (this.jumpCooldown <= 0) {
                        this.jumpCooldown = 0.5; // Prevent spamming
                        return {
                            left: this.targetNode.inwardDir === -1,
                            right: this.targetNode.inwardDir === 1,
                            jump: true
                        };
                    } else {
                        // Keep holding direction while jumping
                        return {
                            left: this.targetNode.inwardDir === -1,
                            right: this.targetNode.inwardDir === 1,
                            jump: false
                        };
                    }
                } else {
                    // Walk towards the launch pad
                    return {
                        left: distToLaunch < -5,
                        right: distToLaunch > 5,
                        jump: false
                    };
                }
            }
        }

        // TARGET IS LEVEL OR BELOW -> DIRECT CHASE
        this.targetNode = null;
        const dx = target.x - bot.x;
        
        let shouldJump = false;
        // Occasionally jump if the target is roughly level, to hop over small gaps organically
        if (Math.abs(dy) < 40 && Math.random() < 0.02 && this.jumpCooldown <= 0) {
            shouldJump = true;
            this.jumpCooldown = 0.5;
        }

        return {
            left: dx < -15,
            right: dx > 15,
            jump: shouldJump
        };
    }

    _flee(bot, target, dt) {
        // Run in opposite direction
        const dx = bot.x - target.x;
        let shouldJump = false;

        if (Math.random() < 0.02 && this.jumpCooldown <= 0) {
            shouldJump = true;
            this.jumpCooldown = 0.5;
        }

        return {
            left: dx < -10,  // target is right, go left
            right: dx > 10, // target is left, go right
            jump: shouldJump
        };
    }
}
