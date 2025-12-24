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
        this.sparkles = []; // Nuevas partículas secundarias (rastros)

        // Configuración visual
        this.config = {
            rocketSpawnChance: 0.03, // Probabilidad por frame
            particleCount: 100,      // Partículas por explosión base
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

        // 1. Fondo con efecto "Motion Blur" (Rastro suave)
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Más transparencia = rastro más largo
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 2. Modo de mezcla aditiva para brillo intenso
        this.ctx.globalCompositeOperation = 'lighter';

        // 3. Lógica de Cohetes
        if (this.rockets.length < 5 && Math.random() < this.config.rocketSpawnChance) {
            this.launchRocket();
        }

        // Actualizar y dibujar Cohetes
        for (let i = this.rockets.length - 1; i >= 0; i--) {
            let r = this.rockets[i];
            r.update();
            r.draw(this.ctx);

            // Emitir chispas de rastro
            if (Math.random() > 0.5) {
                this.sparkles.push(new Sparkle(r.x, r.y, r.color));
            }

            if (r.exploded) {
                this.createExplosion(r);
                this.rockets.splice(i, 1);
            }
        }

        // 4. Actualizar y dibujar Partículas (Explosiones)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.update();
            p.draw(this.ctx);
            if (p.life <= 0 || p.alpha <= 0.01) {
                this.particles.splice(i, 1);
            }
        }

        // 5. Actualizar y dibujar Chispas (Detalles finos)
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
        // Tipos de explosión: 0=Esfera, 1=Corazón, 2=Anillo, 3=Sauce
        const type = Math.floor(Math.random() * 4); 
        this.rockets.push(new Rocket(x, this.height, targetY, palette, type));
    }

    createExplosion(rocket) {
        // Flash de pantalla sutil para impacto
        if (Math.random() > 0.7) {
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.restore();
        }

        const count = this.config.particleCount;
        const mainColor = rocket.color;
        
        for (let i = 0; i < count; i++) {
            const p = new Particle(rocket.x, rocket.y, rocket.palette);
            
            // FÍSICA SEGÚN TIPO DE EXPLOSIÓN
            if (rocket.type === 1) { // Corazón
                const angle = (Math.PI * 2 * i) / count;
                // Fórmula paramétrica del corazón
                const r = Math.random() * 2 + 10; // velocidad base
                const xDir = 16 * Math.pow(Math.sin(angle), 3);
                const yDir = -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle));
                
                // Normalizar y aplicar velocidad
                p.vx = (xDir / 10) * (Math.random() * 0.5 + 0.5);
                p.vy = (yDir / 10) * (Math.random() * 0.5 + 0.5);
                p.friction = 0.94; // Frenado rápido para mantener forma
                p.gravity = 0.05;  // Cae despacio
                p.life = 120; // Dura más
            
            } else if (rocket.type === 2) { // Anillo (Saturno)
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 1 + 8; // Velocidad muy uniforme
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.friction = 0.92;
                
            } else if (rocket.type === 3) { // Sauce Llorón (Willow)
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 10 + 2;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.friction = 0.90; // Mucha resistencia aire
                p.gravity = 0.08;  // Gravedad media
                p.willow = true;   // Flag para dejar rastro largo
                p.life = 150;
                
            } else { // Esfera estándar (default)
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
        this.color = palette[1]; // Color medio
        this.type = type;
        this.speed = Math.random() * 3 + 12;
        this.angle = -Math.PI / 2 + (Math.random() * 0.2 - 0.1); // Ligera desviación
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.exploded = false;
        this.history = []; // Para la cola
    }

    update() {
        this.history.push({x: this.x, y: this.y});
        if (this.history.length > 5) this.history.shift();

        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15; // Gravedad leve al subir
        this.vx *= 0.99; // Resistencia aire

        // Detonar si llega al apogeo o empieza a caer
        if (this.vy >= -1 || this.y <= this.targetY) {
            this.exploded = true;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        // Dibujar cola sólida
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
        ctx.shadowBlur = 0; // Reset performance
    }
}

class Particle {
    constructor(x, y, palette) {
        this.x = x;
        this.y = y;
        this.palette = palette;
        // Seleccionar color random de la paleta
        this.color = palette[Math.floor(Math.random() * palette.length)];
        
        this.vx = 0;
        this.vy = 0;
        this.alpha = 1;
        this.friction = 0.95;
        this.gravity = 0.2;
        this.life = Math.random() * 60 + 40;
        this.maxLife = this.life;
        this.size = Math.random() * 2 + 1;
        this.willow = false; // Si es true, deja rastro dorado
    }

    update() {
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        
        // Fade out basado en vida
        if (this.life < 20) this.alpha -= 0.05;
        
        // Efecto titileo (twinkle) al final de la vida
        if (this.life < 40 && Math.random() > 0.8) {
            this.alpha = 0; // Parpadeo
        } else if (this.life < 40) {
            this.alpha = (this.life / 40);
        }
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        
        // Si es "Willow", dibujamos chispas cayendo
        if (this.willow) {
             ctx.fillStyle = `rgba(255, 215, 0, ${this.alpha})`; // Dorado
             ctx.fillRect(this.x, this.y, 1.5, 4); // Alargado
        } else {
             // Partícula normal redonda con brillo central
             ctx.beginPath();
             ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
             ctx.fill();
        }
        ctx.restore();
    }
}

// Chispas pequeñas y rápidas (Trail Dust)
class Sparkle {
    constructor(x, y, color) {
        this.x = x + (Math.random() * 4 - 2);
        this.y = y + (Math.random() * 4 - 2);
        this.color = color;
        this.alpha = 1;
        this.life = 20;
    }

    update() {
        this.y += 0.5; // Caen lento
        this.life--;
        this.alpha = this.life / 20;
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 1.5, 1.5); // Pixel art style sparkles
        ctx.globalAlpha = 1;
    }
}
