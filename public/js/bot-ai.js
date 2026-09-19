/**
 * Bot AI v9 — Back to Basics (Dumb Heuristic)
 * ==========================================
 * Ripped out all the complex raycasts, sensors, and shadows.
 * Just pure, simple logic: if player is left, go left.
 */

export class ActionBot {
    constructor() {
        this.stuckTime = 0;
        this.lastX = 0;
        this.panicTimer = 0;
        this.panicDir = 1;
        this.jumpCooldown = 0;
    }

    think(bot, target, dt, isChasing) {
        this.jumpCooldown -= dt;

        // Stuck detection (so they don't just glue to a wall forever)
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
        }

        if (this.panicTimer > 0) {
            this.panicTimer -= dt;
            return {
                left: this.panicDir < 0,
                right: this.panicDir > 0,
                jump: this.jumpCooldown <= 0
            };
        }

        const dx = target.x - bot.x;
        const dy = target.y - bot.y;

        if (isChasing) {
            // CHASING: Go towards player. Jump if player is above.
            let shouldJump = false;
            
            // If target is above us, jump
            if (dy < -20 && this.jumpCooldown <= 0) {
                shouldJump = true;
                this.jumpCooldown = 0.2; // don't spam jump every single frame
            }

            return {
                left: dx < -10,
                right: dx > 10,
                jump: shouldJump
            };

        } else {
            // FLEEING: Go away from player. Randomly jump to avoid getting stuck.
            let shouldJump = false;

            if (Math.random() < 0.02 && this.jumpCooldown <= 0) {
                shouldJump = true;
                this.jumpCooldown = 0.5;
            }

            return {
                left: dx > 10,  // target is right, go left
                right: dx < -10, // target is left, go right
                jump: shouldJump
            };
        }
    }
}
