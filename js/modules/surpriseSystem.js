export class SurpriseSystem {
    constructor() {
        this.canvas = document.getElementById('fireworks-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.isRunning = false;
        this.waitingForNext = false; // Control para la secuencia

        // Colecciones de objetos
        this.rockets = [];
        this.particles = [];
        this.comicFlashes = []; // Burbujas de explosión estilo cómic
        this.sparkles = [];
        this.textParticles = [];

        // Configuración visual
        this.config = {
            rocketSpawnChance: 0,    // ANULADO: Ya no salen aleatoriamente
            particleCount: 120,      
            gravity: 0.12,
            friction: 0.96,
            colors: [
                ['#ff0040', '#ff0080', '#ff8000'], // Hot Pink
                ['#00ffed', '#00b8ff', '#0040ff'], // Cyan Electric
                ['#ffea00', '#ffaa00', '#ffea80'], // Gold
                ['#ccff00', '#55ff00', '#aaffaa'], // Lime
                ['#d600ff', '#9900ff', '#ff00cc']  // Purple Neon
            ],
            words: ["POW!", "BAM!", "BOOM!", "LOVE", "ZAP!", "POP!", "WOW!"]
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
        this.waitingForNext = false;
        document.body.classList.add('show-surprise');

        this.setRandomLoveMessage();

        // Lanzamiento inicial (Solo 1 para empezar la cadena)
        this.launchRocket();
        
        this.loop();

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

    setRandomLoveMessage() {
        const msgContainer = document.getElementById('dynamic-love-msg');
        if (!msgContainer) return;

        const messages = [
            { text: "Tú eres<br>lo mejor que<br>me ha pasado", weight: 0.225 },
            { text: "Mi mundo<br>es más bonito<br>contigo", weight: 0.225 },
            { text: "Te elijo a ti<br>una y mil<br>veces más", weight: 0.225 },
            { text: "Gracias por<br>existir y<br>hacerme feliz", weight: 0.225 },
            { text: "¡Eres mi persona<br>favorita en todo<br>el universo! 🪐", weight: 0.1 }
        ];

        let random = Math.random();
        let selectedMsg = messages[0].text;
        let cumulativeWeight = 0;

        for (let msg of messages) {
            cumulativeWeight += msg.weight;
            if (random < cumulativeWeight) {
                selectedMsg = msg.text;
                break;
            }
        }
        msgContainer.innerHTML = `<span class="comic-msg-inner">${selectedMsg}</span>`;
    }

    stop() {
        this.isRunning = false;
        document.body.classList.remove('show-surprise');
        if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height);
        this.rockets = [];
        this.particles = [];
        this.comicFlashes = [];
        this.sparkles = [];
        this.textParticles = [];
    }

    loop() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.loop());

        if (!this.ctx) return;

        // 1. Fondo
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; 
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.globalCompositeOperation = 'source-over'; 

        // 2. Lógica de Cadena (Fallback de seguridad)
        if (this.rockets.length === 0 && !this.waitingForNext && this.isRunning) {
            this.waitingForNext = true;
            setTimeout(() => {
                 if (this.isRunning) {
                     this.launchRocket();
                     this.waitingForNext = false;
                 }
            }, 500);
        }

        // 3. Actualizar Cohetes
        for (let i = this.rockets.length - 1; i >= 0; i--) {
            let r = this.rockets[i];
            r.update();
            r.draw(this.ctx); 

            if (r.exploded) {
                this.createExplosion(r);
                this.rockets.splice(i, 1);
            }
        }

        // 4. Actualizar Flashes Cómicos
        for (let i = this.comicFlashes.length - 1; i >= 0; i--) {
            let f = this.comicFlashes[i];
            f.update();
            f.draw(this.ctx);
            if (f.life <= 0) {
                this.comicFlashes.splice(i, 1);
            }
        }

        // 5. Actualizar Partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.update();
            p.draw(this.ctx);
            if (p.life <= 0 || p.alpha <= 0.01) {
                this.particles.splice(i, 1);
            }
        }

        // 6. Textos
        for (let i = this.textParticles.length - 1; i >= 0; i--) {
            let tp = this.textParticles[i];
            tp.update();
            tp.draw(this.ctx);
            if (tp.life <= 0) {
                this.textParticles.splice(i, 1);
            }
        }

        // 7. Chispas
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
        const targetY = Math.random() * (this.height * 0.5) + (this.height * 0.1);
        const palette = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
        const type = Math.floor(Math.random() * 5);
        this.rockets.push(new Rocket(x, this.height, targetY, palette, type));
    }

    createExplosion(rocket) {
        // --- SECUENCIA AUTOMÁTICA ---
        if (!this.waitingForNext && this.isRunning) {
            this.waitingForNext = true;
            setTimeout(() => {
                if (this.isRunning) {
                    this.launchRocket();
                    this.waitingForNext = false;
                }
            }, 600); 
        }

        // 1. Flash de cómic
        this.comicFlashes.push(new ComicFlash(rocket.x, rocket.y, rocket.color));

        // 2. Flash pantalla
        if (Math.random() > 0.7) {
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'overlay';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.restore();
        }

        // 3. Onomatopeya
        if (Math.random() > 0.3) {
            let word;
            if (Math.random() < 0.1) word = "Hermosa";
            else word = this.config.words[Math.floor(Math.random() * this.config.words.length)];
            this.textParticles.push(new TextParticle(rocket.x, rocket.y, word, rocket.color));
        }

        // 4. Partículas
        const count = this.config.particleCount;
        for (let i = 0; i < count; i++) {
            const p = new Particle(rocket.x, rocket.y, rocket.palette);

            // ==========================================
            // LÓGICA DE MOVIMIENTO CORREGIDA
            // ==========================================
            if (rocket.type === 1) { // ❤️ CORAZÓN MEJORADO ❤️
                const angle = (Math.PI * 2 * i) / count;
                // Fórmula paramétrica del corazón
                const xDir = 16 * Math.pow(Math.sin(angle), 3);
                const yDir = -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle));
                
                // CAMBIO: Multiplicador más alto (x 0.18) para que se abra más
                // CAMBIO: Menos aleatoriedad (* 0.2 + 0.8) para que la línea sea nítida
                const force = 0.25; 
                const randomVar = Math.random() * 0.2 + 0.8; // Variación mínima (trazo limpio)

                p.vx = xDir * force * randomVar;
                p.vy = yDir * force * randomVar;
                
                p.friction = 0.93; // Frenado suave
                p.gravity = 0.08;  // Poca gravedad para mantener la forma
                p.life = 180;      // Dura más tiempo
            } else if (rocket.type === 2) { // Saturno
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 1 + 8;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.vy *= 0.4;
                p.friction = 0.92;
            } else if (rocket.type === 3) { // Sauce
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 10 + 2;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.friction = 0.90;
                p.gravity = 0.15;
                p.willow = true;
                p.life = 150;
            } else { // Clásica
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 15;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
            }
            this.particles.push(p);
        }
    }
}

/* =========================================
   CLASES VISUALES (Estilo Cómic)
   ========================================= */

class ComicFlash {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 0;
        this.targetRadius = 100 + Math.random() * 50;
        this.life = 15; 
        this.points = 12; 
    }

    update() {
        this.radius += (this.targetRadius - this.radius) * 0.4;
        this.life--;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.random() * 0.2); 

        ctx.beginPath();
        for (let i = 0; i < this.points * 2; i++) {
            const angle = (Math.PI * 2 * i) / (this.points * 2);
            const r = (i % 2 === 0) ? this.radius : this.radius * 0.4;
            ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();

        ctx.fillStyle = '#FFF'; 
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#000';
        ctx.stroke();
        ctx.restore();
    }
}

class Rocket {
    constructor(x, y, targetY, palette, type) {
        this.x = x;
        this.y = y;
        this.targetY = targetY;
        this.palette = palette;
        this.color = palette[1];
        this.type = type;
        this.speed = Math.random() * 4 + 14;
        this.angle = -Math.PI / 2 + (Math.random() * 0.1 - 0.05);
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.exploded = false;
        this.history = [];
    }

    update() {
        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > 5) this.history.shift(); 

        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2;
        this.vx *= 0.99;

        if (this.vy >= -1 || this.y <= this.targetY) {
            this.exploded = true;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        if (this.history.length > 0) {
            ctx.moveTo(this.history[0].x, this.history[0].y);
            for (let p of this.history) ctx.lineTo(p.x, p.y);
        }
        ctx.lineTo(this.x, this.y);

        ctx.save();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 7; 
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}

class Particle {
    constructor(x, y, palette) {
        this.x = x;
        this.y = y;
        this.palette = palette;
        this.color = palette[Math.floor(Math.random() * palette.length)];

        this.vx = 0;
        this.vy = 0;
        this.alpha = 1;
        this.friction = 0.92;
        this.gravity = 0.15;
        this.life = Math.random() * 60 + 40;
        this.size = Math.random() * 5 + 3; 
        this.willow = false;
        this.shape = Math.random() > 0.5 ? 'square' : 'circle';
    }

    update() {
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.life--;

        if (this.life < 15) this.alpha -= 0.1;
        if (this.alpha < 0) this.alpha = 0;
    }

    draw(ctx) {
        if (this.alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        if (this.willow) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, 4, 8);
            ctx.strokeRect(this.x, this.y, 4, 8);
        } else {
            if (this.shape === 'square') {
                ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
                ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
            } else {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }
        ctx.restore();
    }
}

class TextParticle {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.size = 0;
        this.targetSize = 50 + Math.random() * 30; 
        this.life = 70;
        this.angle = (Math.random() * 0.4) - 0.2;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = -3; 
    }

    update() {
        if (this.size < this.targetSize) {
            this.size += (this.targetSize - this.size) * 0.3; 
        }
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; 
        this.life--;
    }

    draw(ctx) {
        if (this.life <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        let alpha = 1;
        if (this.life < 15) alpha = this.life / 15;
        ctx.globalAlpha = alpha;

        ctx.font = `900 ${this.size}px 'Bangers', cursive`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.lineWidth = 6;
        ctx.strokeStyle = '#000';
        ctx.lineJoin = 'round';
        ctx.strokeText(this.text, 5, 5); 
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        ctx.strokeText(this.text, 0, 0);

        ctx.fillStyle = this.color;
        ctx.fillText(this.text, 0, 0);

        ctx.lineWidth = 1;
        ctx.strokeStyle = '#FFF';
        ctx.strokeText(this.text, 0, 0);

        ctx.restore();
    }
}

class Sparkle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = 10;
        this.size = Math.random() * 4 + 2;
    }
    update() { this.life--; }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.fillStyle = '#FFF';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.strokeRect(this.x, this.y, this.size, this.size);
    }
}
