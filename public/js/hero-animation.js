export function initHeroAnimation() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    let width, height;
    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }
    window.addEventListener('resize', resize);
    resize();

    class ChasePair {
        constructor(id) {
            this.id = id;
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.angle = Math.random() * Math.PI * 2;
            this.speed = 3;
            this.history = [];
            this.maxHistory = 40 + Math.random() * 40; 
            
            this.redX = this.x;
            this.redY = this.y;
            
            this.pickNewTarget();
        }

        pickNewTarget() {
            this.targetX = 50 + Math.random() * (width - 100);
            this.targetY = 50 + Math.random() * (height - 100);
            
            const r = Math.random();
            if (r < 0.3) {
                // Dash (fast, sharp turns)
                this.targetSpeed = 7 + Math.random() * 4;
                this.turnFlexibility = 0.1; 
            } else if (r < 0.7) {
                // Wander (slow, sweeping curves)
                this.targetSpeed = 2 + Math.random() * 2;
                this.turnFlexibility = 0.02;
            } else {
                // Erratic
                this.targetSpeed = 4 + Math.random() * 3;
                this.turnFlexibility = 0.2;
            }
        }

        update() {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.hypot(dx, dy);

            // Reached target or randomly decide to change course
            if (dist < 50 || Math.random() < 0.01) {
                this.pickNewTarget();
            }

            const targetAngle = Math.atan2(dy, dx);
            let diff = targetAngle - this.angle;
            
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            // Turn towards target, adding a tiny bit of random noise for natural feeling
            this.angle += diff * this.turnFlexibility + (Math.random() - 0.5) * 0.05;

            // Smooth speed transitions
            this.speed += (this.targetSpeed - this.speed) * 0.05;

            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;

            this.history.push({x: this.x, y: this.y});
            if (this.history.length > this.maxHistory) {
                this.history.shift();
            }

            // Red follows exactly at the end of the tail
            if (this.history.length > 0) {
                const tail = this.history[0];
                this.redX = tail.x;
                this.redY = tail.y;
            }
        }

        draw(ctx) {
            if (this.history.length < 2) return;

            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            for (let i = 0; i < this.history.length - 1; i++) {
                const p1 = this.history[i];
                const p2 = this.history[i+1];
                
                const progress = i / this.history.length;
                ctx.strokeStyle = `rgba(60, 214, 197, ${progress * 0.6})`;
                
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
            ctx.restore();

            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.fillStyle = '#3cd6c5';
            ctx.shadowColor = '#3cd6c5';
            ctx.shadowBlur = 12;
            ctx.fillRect(-5, -5, 10, 10);
            ctx.restore();

            ctx.save();
            ctx.translate(this.redX, this.redY);
            
            const pulse = 1.5 * Math.sin(Date.now() / 100 + this.id);
            ctx.fillStyle = '#ff4d29';
            ctx.shadowColor = '#ff4d29';
            ctx.shadowBlur = 15;
            ctx.fillRect(-5 - pulse, -5 - pulse, 10 + pulse*2, 10 + pulse*2);
            ctx.restore();
        }
    }

    const numPairs = window.innerWidth > 768 ? 6 : 3;
    const pairs = Array.from({ length: numPairs }, (_, i) => new ChasePair(i));

    function animate() {
        const screen = document.getElementById('homeScreen');
        if (screen && screen.classList.contains('active')) {
            ctx.clearRect(0, 0, width, height);
            pairs.forEach(p => {
                p.update();
                p.draw(ctx);
            });
        }
        requestAnimationFrame(animate);
    }
    
    animate();
}
