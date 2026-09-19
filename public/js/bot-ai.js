/**
 * Bot AI — Navigation Graph + A* Pathfinding
 * ============================================
 * Inspired by Claude's architecture but rewritten from scratch to work with
 * our exact platform format (x, y, width, height, angle, motion) and our
 * real physics constants (GRAVITY=3200, JUMP_STRENGTH=-880, MOVE_SPEED=350).
 *
 * Architecture:
 *   1. buildNavGraph()  — called ONCE per map load. Converts platforms into
 *      walkable nodes and jump/fall edges using real projectile simulation.
 *   2. A* pathfinding   — finds the shortest route through the graph.
 *   3. BotBrain.think() — called every frame. Returns { left, right, jump }
 *      which gets fed into the existing physics loop as virtual key presses.
 *
 * The bot never teleports. It only "presses buttons."
 */

import * as constants from './constants.js';
import { state } from './state.js';

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const CFG = {
    gravity:          constants.GRAVITY,          // 3200
    jumpVelocity:     Math.abs(constants.JUMP_STRENGTH), // 880
    moveSpeed:        constants.MOVE_SPEED,       // 350
    playerSize:       constants.PLAYER_SIZE,      // 26
    landingTolerance: 18,   // px — how close a projected landing must be
    replanInterval:   0.35, // seconds between forced path recalculations
    reactionDelay:    0.12, // seconds — human-like delay before reacting
    maxArcTime:       1.8,  // max seconds for a single jump/fall arc
    arcSampleSteps:   12,   // collision check resolution along arcs
    edgePadding:      4,    // px inward from platform edges for node placement
};

// ─── 1. NAV GRAPH BUILDER ───────────────────────────────────────────────────

/**
 * Converts our platform list into a navigation graph.
 * Each platform produces two nodes (left-edge, right-edge).
 * Edges are: walk (across a platform), jump, or fall (between platforms).
 */
export function buildNavGraph(platforms) {
    const nodes = [];
    const edges = [];

    // Add floor as a virtual platform spanning the whole map
    const floorY = constants.MAP_BOUNDS.bottom - constants.PLAYER_SIZE;
    const floorLeft = constants.MAP_BOUNDS.left;
    const floorRight = constants.MAP_BOUNDS.right - constants.PLAYER_SIZE;

    nodes.push({ id: 'floor-L', x: floorLeft, y: floorY, platformIdx: -1 });
    nodes.push({ id: 'floor-R', x: floorRight, y: floorY, platformIdx: -1 });
    edges.push({ from: 'floor-L', to: 'floor-R', cost: (floorRight - floorLeft) / CFG.moveSpeed, type: 'walk' });
    edges.push({ from: 'floor-R', to: 'floor-L', cost: (floorRight - floorLeft) / CFG.moveSpeed, type: 'walk' });

    // Build nodes from each platform
    platforms.forEach((p, i) => {
        if (p.angle && Math.abs(p.angle) > 0.01) {
            // For angled platforms, compute the actual world-space endpoints
            const cos = Math.cos(p.angle);
            const sin = Math.sin(p.angle);
            const lx = p.x + CFG.edgePadding * cos;
            const ly = p.y + CFG.edgePadding * sin;
            const rx = p.x + (p.width - CFG.edgePadding) * cos;
            const ry = p.y + (p.width - CFG.edgePadding) * sin;
            // Use the top surface (subtract player size so feet sit ON the platform)
            nodes.push({ id: `${i}-L`, x: lx, y: ly - CFG.playerSize, platformIdx: i });
            nodes.push({ id: `${i}-R`, x: rx, y: ry - CFG.playerSize, platformIdx: i });
        } else {
            // Horizontal platform
            const topY = p.y - CFG.playerSize; // player stands ON TOP
            nodes.push({ id: `${i}-L`, x: p.x + CFG.edgePadding, y: topY, platformIdx: i });
            nodes.push({ id: `${i}-R`, x: p.x + p.width - CFG.edgePadding, y: topY, platformIdx: i });
        }

        const nL = nodes[nodes.length - 2];
        const nR = nodes[nodes.length - 1];
        const walkDist = Math.hypot(nR.x - nL.x, nR.y - nL.y);
        edges.push({ from: nL.id, to: nR.id, cost: walkDist / CFG.moveSpeed, type: 'walk' });
        edges.push({ from: nR.id, to: nL.id, cost: walkDist / CFG.moveSpeed, type: 'walk' });
    });

    // Test reachability between every pair of nodes on different platforms
    for (const a of nodes) {
        for (const b of nodes) {
            if (a.platformIdx === b.platformIdx) continue;
            const link = testReachability(a, b, platforms);
            if (link) {
                edges.push({
                    from: a.id, to: b.id,
                    cost: link.time + (link.type === 'jump' ? 0.05 : 0), // slight penalty for jumps
                    type: link.type,
                });
            }
        }
    }

    return { nodes, edges };
}

/**
 * Simulates a jump or fall from node A toward node B using real projectile
 * motion, and checks whether the arc lands at B without clipping platforms.
 */
function testReachability(a, b, platforms) {
    const dx = b.x - a.x;
    const dir = Math.sign(dx) || 1;
    const vx = dir * CFG.moveSpeed;

    // Try both: full jump impulse, and plain walk-off-the-edge fall
    for (const vy0 of [-CFG.jumpVelocity, 0]) {
        const isJump = vy0 !== 0;
        const horizontalTime = Math.abs(dx) / CFG.moveSpeed;
        if (horizontalTime <= 0 || horizontalTime > CFG.maxArcTime) continue;

        // Where does the arc end up at time t?
        const yAtT = a.y + vy0 * horizontalTime + 0.5 * CFG.gravity * horizontalTime * horizontalTime;
        if (Math.abs(yAtT - b.y) > CFG.landingTolerance) continue;

        // Check that the arc doesn't clip through any platform
        if (!clearArc(a, vx, vy0, horizontalTime, platforms, b.platformIdx)) continue;

        return { time: horizontalTime, type: isJump ? 'jump' : 'fall' };
    }
    return null;
}

/**
 * Samples points along a projectile arc and rejects it if it clips
 * through a platform (other than the destination platform).
 */
function clearArc(a, vx, vy0, totalT, platforms, destPlatformIdx) {
    for (let i = 1; i < CFG.arcSampleSteps; i++) {
        const t = (totalT * i) / CFG.arcSampleSteps;
        const x = a.x + vx * t;
        const y = a.y + vy0 * t + 0.5 * CFG.gravity * t * t;

        for (let pi = 0; pi < platforms.length; pi++) {
            if (pi === a.platformIdx || pi === destPlatformIdx) continue;
            const p = platforms[pi];
            // Simple AABB check for horizontal platforms
            if (x + CFG.playerSize > p.x && x < p.x + p.width &&
                y + CFG.playerSize > p.y && y < p.y + p.height) {
                return false;
            }
        }
    }
    return true;
}

// ─── 2. A* PATHFINDING ──────────────────────────────────────────────────────

function findPath(graph, startId, goalId) {
    const adj = {};
    graph.edges.forEach(e => (adj[e.from] ??= []).push(e));

    const nodeMap = {};
    graph.nodes.forEach(n => nodeMap[n.id] = n);

    const goalNode = nodeMap[goalId];
    if (!goalNode) return null;

    const heuristic = (id) => {
        const n = nodeMap[id];
        return Math.hypot(n.x - goalNode.x, n.y - goalNode.y) / CFG.moveSpeed;
    };

    const openSet = new Set([startId]);
    const cameFrom = {};
    const gScore = { [startId]: 0 };
    const fScore = { [startId]: heuristic(startId) };

    while (openSet.size > 0) {
        // Pick node with lowest fScore
        let current = null;
        let currentF = Infinity;
        for (const id of openSet) {
            const f = fScore[id] ?? Infinity;
            if (f < currentF) { currentF = f; current = id; }
        }

        if (current === goalId) {
            // Reconstruct path
            const path = [];
            let c = current;
            while (cameFrom[c]) {
                path.unshift(cameFrom[c].edge);
                c = cameFrom[c].from;
            }
            return path;
        }

        openSet.delete(current);
        for (const edge of (adj[current] || [])) {
            const tentativeG = gScore[current] + edge.cost;
            if (tentativeG < (gScore[edge.to] ?? Infinity)) {
                cameFrom[edge.to] = { from: current, edge };
                gScore[edge.to] = tentativeG;
                fScore[edge.to] = tentativeG + heuristic(edge.to);
                openSet.add(edge.to);
            }
        }
    }
    return null; // no path
}

// ─── 3. FIND NEAREST NODE ───────────────────────────────────────────────────

function nearestNode(graph, x, y) {
    let best = null;
    let bestDist = Infinity;
    for (const n of graph.nodes) {
        const d = Math.hypot(x - n.x, y - n.y);
        if (d < bestDist) { bestDist = d; best = n; }
    }
    return best;
}

// ─── 4. BOT BRAIN ───────────────────────────────────────────────────────────

export class BotBrain {
    constructor(navGraph) {
        this.graph = navGraph;
        this.nodeMap = {};
        navGraph.nodes.forEach(n => this.nodeMap[n.id] = n);
        this.path = [];
        this.timeSinceReplan = Infinity;
        this.reactionTimer = 0;
        this.predictX = 0;
        this.predictY = 0;
    }

    /**
     * Called every frame.
     * @param {object} bot - { x, y, velocityX, velocityY }
     * @param {object} target - { x, y, velocityX, velocityY }
     * @param {number} dt - seconds
     * @param {boolean} isChasing - true if bot is "it" and chasing, false if fleeing
     * @returns {{ left: boolean, right: boolean, jump: boolean }}
     */
    think(bot, target, dt, isChasing) {
        this.timeSinceReplan += dt;
        this.reactionTimer -= dt;

        // Predict where the target will be shortly
        if (this.reactionTimer <= 0) {
            this.predictX = target.x + (target.velocityX || 0) * 0.2;
            this.predictY = target.y;
            this.reactionTimer = CFG.reactionDelay;
        }

        const targetX = isChasing ? this.predictX : this.getFleeX(bot, target);
        const targetY = isChasing ? this.predictY : bot.y;

        // Check if bot and target are on the same platform (within ~40px vertically)
        const samePlatform = Math.abs(bot.y - target.y) < 40;

        // Replan if needed
        if (!samePlatform && (this.timeSinceReplan > CFG.replanInterval || this.path.length === 0)) {
            const startNode = nearestNode(this.graph, bot.x, bot.y);
            const goalNode = nearestNode(this.graph, targetX, targetY);
            if (startNode && goalNode && startNode.id !== goalNode.id) {
                this.path = findPath(this.graph, startNode.id, goalNode.id) || [];
            }
            this.timeSinceReplan = 0;
        }

        // If same platform or no path, direct chase/flee
        if (samePlatform || this.path.length === 0) {
            return this.directMove(bot, targetX);
        }

        return this.followPath(bot);
    }

    getFleeX(bot, target) {
        // Flee to the opposite side of the map
        const dx = bot.x - target.x;
        const mapCenter = (constants.MAP_BOUNDS.left + constants.MAP_BOUNDS.right) / 2;
        if (dx > 0) {
            return Math.min(bot.x + 300, constants.MAP_BOUNDS.right - CFG.playerSize);
        } else {
            return Math.max(bot.x - 300, constants.MAP_BOUNDS.left);
        }
    }

    directMove(bot, targetX) {
        const dx = targetX - bot.x;
        if (Math.abs(dx) < 6) return { left: false, right: false, jump: false };
        return {
            left: dx < 0,
            right: dx > 0,
            jump: false,
        };
    }

    followPath(bot) {
        const edge = this.path[0];
        if (!edge) return { left: false, right: false, jump: false };

        const targetNode = this.nodeMap[edge.to];
        const fromNode = this.nodeMap[edge.from];
        if (!targetNode || !fromNode) {
            this.path.shift();
            return { left: false, right: false, jump: false };
        }

        // Check if we've arrived at the target node
        const distToTarget = Math.hypot(bot.x - targetNode.x, bot.y - targetNode.y);
        if (distToTarget < 20) {
            this.path.shift();
            if (this.path.length === 0) return { left: false, right: false, jump: false };
            return this.followPath(bot); // immediately process next edge
        }

        if (edge.type === 'walk') {
            // Walk toward the target node
            const dx = targetNode.x - bot.x;
            return { left: dx < 0, right: dx > 0, jump: false };
        }

        // Jump or fall edge: walk to the launch point first
        const distToLaunch = Math.hypot(bot.x - fromNode.x, bot.y - fromNode.y);
        const moveDir = Math.sign(targetNode.x - bot.x);

        if (distToLaunch < 12) {
            // At launch point — execute the jump/fall
            return {
                left: moveDir < 0,
                right: moveDir > 0,
                jump: edge.type === 'jump',
            };
        }

        // Walk to launch point
        const dxToLaunch = fromNode.x - bot.x;
        return {
            left: dxToLaunch < 0,
            right: dxToLaunch > 0,
            jump: false,
        };
    }
}
