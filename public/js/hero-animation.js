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
            this.speed = 3 + Math.random() * 2;
            this.turnSpeed = 0;
            this.history = [];
            this.maxHistory = 45 + Math.random() * 30; // Trail length varies
            
            this.redX = this.x;
            this.redY = this.y;
        }

        update() {
            // Smooth natural wandering
            this.turnSpeed += (Math.random() - 0.5) * 0.05;
            this.turnSpeed = Math.max(-0.15, Math.min(0.15, this.turnSpeed));
            this.angle += this.turnSpeed;
            
            // Soft boundaries to keep them on screen
            const margin = 150;
            if (this.x < margin) this.turnSpeed += 0.01;
            if (this.x > width - margin) this.turnSpeed -= 0.01;
            if (this.y < margin) this.turnSpeed += 0.01;
            if (this.y > height - margin) this.turnSpeed -= 0.01;

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

            // Draw fading dashed or solid trail
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            for (let i = 0; i < this.history.length - 1; i++) {
                const p1 = this.history[i];
                const p2 = this.history[i+1];
                
                // Calculate opacity based on position in trail
                // Tail (0) is opacity 0 (Red box is here)
                // Head (length-1) is opacity 0.5 (Green box is here)
                const progress = i / this.history.length;
                ctx.strokeStyle = \`rgba(60, 214, 197, \${progress * 0.6})\`;
                
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
            ctx.restore();

            // Draw Green Square (Runner)
            ctx.save();
            ctx.translate(this.x, this.y);
            // Slight rotation based on movement
            ctx.rotate(this.angle);
            ctx.fillStyle = '#3cd6c5';
            ctx.shadowColor = '#3cd6c5';
            ctx.shadowBlur = 12;
            ctx.fillRect(-5, -5, 10, 10);
            ctx.restore();

            // Draw Red Square (Chaser)
            ctx.save();
            ctx.translate(this.redX, this.redY);
            
            // Joy/Delight: Red box pulses aggressively as if out of breath/eager
            const pulse = 1.5 * Math.sin(Date.now() / 100 + this.id);
            ctx.fillStyle = '#ff4d29';
            ctx.shadowColor = '#ff4d29';
            ctx.shadowBlur = 15;
            ctx.fillRect(-5 - pulse, -5 - pulse, 10 + pulse*2, 10 + pulse*2);
            ctx.restore();
        }
    }

    const numPairs = window.innerWidth > 768 ? 6 : 3; // Fewer on mobile
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
