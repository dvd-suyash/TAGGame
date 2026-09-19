/**
 * Bot AI v12 — Waypoint Climber (with Drop Logic)
 * ==============================
 */

import * as constants from './constants.js';
import { state } from './state.js';

function findBestClimbNode(bot, target, platforms, bannedNodes) {
    let bestNode = null;
    let bestScore = Infinity;

    for (const p of platforms) {
        if (p.height > 50 && p.width < 50) continue; // skip walls
        if (p.y >= bot.y - 10) continue;
        const heightDiff = bot.y - p.y;
        if (heightDiff > 140) continue; 

        const leftEdgeX = p.x;
        const rightEdgeX = p.x + p.width;

        const evaluateEdge = (edgeX, inwardDir) => {
            const nodeId = Math.round(edgeX) + ',' + Math.round(p.y);
            if (bannedNodes && bannedNodes.has(nodeId)) return;

            const distToBot = Math.hypot(edgeX - bot.x, p.y - bot.y);
            const distToTarget = Math.hypot(edgeX - target.x, p.y - target.y);
            const score = (distToBot * 1.5) + distToTarget;

            if (score < bestScore) {
                bestScore = score;
                bestNode = {
                    id: nodeId,
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
        
        // Memory of failed jumps
        this.bannedNodes = new Map();
        
        this.dropDir = null;
    }

    think(bot, target, dt, isChasing) {
        this.jumpCooldown -= dt;

        for (const [nodeId, time] of this.bannedNodes.entries()) {
            if (time <= 0) {
                this.bannedNodes.delete(nodeId);
            } else {
                this.bannedNodes.set(nodeId, time - dt);
            }
        }

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
            this.targetNode = null; 
            if (this.dropDir) this.dropDir *= -1;
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

        if (dy < -30) {
            if (this.targetNode && bot.y <= this.targetNode.y + 10) {
                this.targetNode = null;
            }

            if (!this.targetNode) {
                this.targetNode = findBestClimbNode(bot, target, state.platforms, this.bannedNodes);
                this.nodeTimeout = 2.0; 
            }

            if (this.targetNode) {
                this.nodeTimeout -= dt;
                
                if (this.nodeTimeout <= 0) { 
                    this.bannedNodes.set(this.targetNode.id, 5.0); 
                    this.targetNode = null; 
                    return { left: false, right: false, jump: false }; 
                }

                const launchPadX = this.targetNode.x - (this.targetNode.inwardDir * 40);
                const distToLaunch = launchPadX - bot.x;

                if (Math.abs(distToLaunch) < 25) {
                    if (this.jumpCooldown <= 0) {
                        this.jumpCooldown = 0.5;
                        return { left: this.targetNode.inwardDir === -1, right: this.targetNode.inwardDir === 1, jump: true };
                    } else {
                        return { left: this.targetNode.inwardDir === -1, right: this.targetNode.inwardDir === 1, jump: false };
                    }
                } else {
                    return { left: distToLaunch < -5, right: distToLaunch > 5, jump: false };
                }
            }
        }

        this.targetNode = null;
        const dx = target.x - bot.x;
        
        let shouldJump = false;
        if (Math.abs(dy) < 40 && Math.random() < 0.02 && this.jumpCooldown <= 0) {
            shouldJump = true;
            this.jumpCooldown = 0.5;
        }

        if (dy > 40 && Math.abs(dx) < 25) {
            if (!this.dropDir) this.dropDir = Math.random() < 0.5 ? 1 : -1;
            return { left: this.dropDir === -1, right: this.dropDir === 1, jump: false };
        } else {
            this.dropDir = null;
        }

        return { left: dx < -15, right: dx > 15, jump: shouldJump };
    }

    _flee(bot, target, dt) {
        const dx = bot.x - target.x;
        let shouldJump = false;
        if (Math.random() < 0.02 && this.jumpCooldown <= 0) {
            shouldJump = true;
            this.jumpCooldown = 0.5;
        }
        return { left: dx < -10, right: dx > 10, jump: shouldJump };
    }
}
