export class SurpriseSystem {
    constructor() {
        this.canvas = document.getElementById('fireworks-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.isRunning = false;

        // Colecciones de objetos
        this.rockets = [];
        this.particles = [];
        this.sparkles = []; 

        // Configuración visual
        this.config = {
            rocketSpawnChance: 0.05, 
            particleCount: 100,      
            gravity: 0.12,
            friction: 0.96,
            colors: [
                ['#ff0040', '#ff0080', '#ff8000'], // Hot Pink
                ['#00ffed', '#00b8ff', '#0040ff'], // Cyan Electric
                ['#ffea00', '#ffaa00', '#ffea80'], // Gold
                ['#ccff00', '#55ff00', '#aaffaa'], // Lime
                ['#d600ff', '#9900ff', '#ff00cc']  // Purple Neon
            ]
        };

        this.resizeHandler = () => {
            if (!this.canvas) return;
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        };

        window.addEventListener('resize', this.resizeHandler);
        if (this.canvas) this.resizeHandler();
    }

    trigger() {
        if (!this.canvas) return;
        this.isRunning = true;
        document.body.classList.add('show-surprise');
        
        // Lanzamiento inicial inmediato
        this.launchRocket();
        this.loop();

        // Auto-cierre inteligente
        setTimeout(() => {
            const closeHandler = () => {
                this.stop();
                document.removeEventListener('click', closeHandler);
            };
            setTimeout(() => {
                document.addEventListener('click', closeHandler, { once: true });
            }, 1000);
        }, 1000);
    }

    stop() {
        this.isRunning = false;
        document.body.classList.remove('show-surprise');
        if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height);
        this.rockets = [];
        this.particles = [];
        this.sparkles = [];
    }

    loop() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.loop());

        if (!this.ctx) return;

        // 1. Fondo con efecto "Motion Blur"
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 2. Modo de mezcla aditiva
        this.ctx.globalCompositeOperation = 'lighter';

        // 3. Lógica de Cohetes
        if (this.rockets.length < 5 && Math.random() < this.config.rocketSpawnChance) {
            this.launchRocket();
        }

        // Actualizar Cohetes
        for (let i = this.rockets.length - 1; i >= 0; i--) {
            let r = this.rockets[i];
            r.update();
            r.draw(this.ctx);

            if (Math.random() > 0.5) {
                this.sparkles.push(new Sparkle(r.x, r.y, r.color));
            }

            if (r.exploded) {
                this.createExplosion(r);
                this.rockets.splice(i, 1);
            }
        }

        // 4. Actualizar Partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.update();
            p.draw(this.ctx);
            if (p.life <= 0 || p.alpha <= 0.01) {
                this.particles.splice(i, 1);
            }
        }

        // 5. Actualizar Chispas
        for (let i = this.sparkles.length - 1; i >= 0; i--) {
            let s = this.sparkles[i];
            s.update();
            s.draw(this.ctx);
            if (s.life <= 0) {
                this.sparkles.splice(i, 1);
            }
        }
    }

    launchRocket() {
        const x = Math.random() * (this.width * 0.8) + (this.width * 0.1);
        const targetY = Math.random() * (this.height * 0.4) + (this.height * 0.1);
        const palette = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
        const type = Math.floor(Math.random() * 4); 
        this.rockets.push(new Rocket(x, this.height, targetY, palette, type));
    }

    createExplosion(rocket) {
        if (Math.random() > 0.7) {
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.restore();
        }

        const count = this.config.particleCount;
        
        for (let i = 0; i < count; i++) {
            const p = new Particle(rocket.x, rocket.y, rocket.palette);
            
            if (rocket.type === 1) { // Corazón
                const angle = (Math.PI * 2 * i) / count;
                const r = Math.random() * 2 + 10; 
                const xDir = 16 * Math.pow(Math.sin(angle), 3);
                const yDir = -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle));
                
                p.vx = (xDir / 10) * (Math.random() * 0.5 + 0.5);
                p.vy = (yDir / 10) * (Math.random() * 0.5 + 0.5);
                p.friction = 0.94; 
                p.gravity = 0.05;  
                p.life = 120; 
            } else if (rocket.type === 2) { // Saturno
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 1 + 8; 
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.friction = 0.92;
            } else if (rocket.type === 3) { // Sauce
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 10 + 2;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.friction = 0.90; 
                p.gravity = 0.08;  
                p.willow = true;   
                p.life = 150;
            } else { // Esfera
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 12;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
            }
            this.particles.push(p);
        }
    }
}

/* =========================================
   CLASES AUXILIARES (Física y Render)
   ========================================= */

class Rocket {
    constructor(x, y, targetY, palette, type) {
        this.x = x;
        this.y = y;
        this.targetY = targetY;
        this.palette = palette;
        this.color = palette[1]; 
        this.type = type;
        this.speed = Math.random() * 3 + 12;
        this.angle = -Math.PI / 2 + (Math.random() * 0.2 - 0.1); 
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.exploded = false;
        this.history = []; 
    }

    update() {
        this.history.push({x: this.x, y: this.y});
        if (this.history.length > 5) this.history.shift();

        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15; 
        this.vx *= 0.99; 

        if (this.vy >= -1 || this.y <= this.targetY) {
            this.exploded = true;
        }
    } // <--- FALTABA ESTA LLAVE DE CIERRE

    draw(ctx) {
        ctx.beginPath();
        if (this.history.length > 0) {
            ctx.moveTo(this.history[0].x, this.history[0].y);
            for(let p of this.history) ctx.lineTo(p.x, p.y);
        } else {
            ctx.moveTo(this.x, this.y);
        }
        ctx.lineTo(this.x, this.y);
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.stroke();
        ctx.shadowBlur = 0; 
    }
}

class Particle {
    constructor(x, y, palette) {
        this.x = x;
        this.y = y;
        this.palette = palette;
        this.color = palette[Math.floor(Math.random() * palette.length)]; // <--- ESTO ESTABA COMENTADO
        
        this.vx = 0;
        this.vy = 0;
        this.alpha = 1;
        this.friction = 0.95;
        this.gravity = 0.2;
        this.life = Math.random() * 60 + 40;
        this.maxLife = this.life;
        this.size = Math.random() * 2 + 1;
        this.willow = false; 
    }

    update() {
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        
        if (this.life < 20) this.alpha -= 0.05;
        
        if (this.life < 40 && Math.random() > 0.8) {
            this.alpha = 0; 
        } else if (this.life < 40) {
            this.alpha = (this.life / 40);
        }
    } // <--- FALTABA ESTA LLAVE DE CIERRE

    draw(ctx) {
        if (this.alpha <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        
        if (this.willow) {
             ctx.fillStyle = `rgba(255, 215, 0, ${this.alpha})`; 
             ctx.fillRect(this.x, this.y, 1.5, 4); 
        } else {
             ctx.beginPath();
             ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
             ctx.fill();
        }
        ctx.restore();
    }
}

class Sparkle {
    constructor(x, y, color) {
        this.x = x + (Math.random() * 4 - 2);
        this.y = y + (Math.random() * 4 - 2);
        this.color = color;
        this.alpha = 1;
        this.life = 20;
    }

    update() {
        this.y += 0.5; 
        this.life--;
        this.alpha = this.life / 20;
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 1.5, 1.5); 
        ctx.globalAlpha = 1;
    }
}
