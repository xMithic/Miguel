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
        this.textParticles = []; // NUEVO: Partículas de texto

        // Configuración visual
        this.config = {
            rocketSpawnChance: 0.08, // Ligeramente más rápido
            particleCount: 150,
            gravity: 0.12,
            friction: 0.96,
            colors: [
                ['#ff0040', '#ff0080', '#ff8000'], // Hot Pink
                ['#00ffed', '#00b8ff', '#0040ff'], // Cyan Electric
                ['#ffea00', '#ffaa00', '#ffea80'], // Gold
                ['#ccff00', '#55ff00', '#aaffaa'], // Lime
                ['#d600ff', '#9900ff', '#ff00cc']  // Purple Neon
            ],
            words: ["POW!", "BAM!", "BOOM!", "LOVE", "ZAP!", "POP!", "WOW!"] // Onomatopeyas
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

        // NUEVO: Definir mensaje de amor aleatorio
        this.setRandomLoveMessage();

        // Lanzamiento inicial intenso
        for (let i = 0; i < 3; i++) {
            setTimeout(() => this.launchRocket(), i * 300);
        }
        this.loop();

        // Auto-cierre
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

        /* 
           =========================================================================
           CONFIGURACIÓN DE MENSAJES Y PROBABILIDADES
           -------------------------------------------------------------------------
           Aquí puedes cambiar el texto y la probabilidad de aparición (weight).
           
           - text: El mensaje que saldrá (usa <br> para saltos de línea).
           - weight: La probabilidad (0.225 = 22.5%, 0.1 = 10%).
           
           La suma de todos los "weight" idealmente debería ser 1.0 (100%),
           pero el código funciona igual si no es exacto.
           =========================================================================
        */
        const messages = [
            // Mensaje Común 1 (22.5%)
            { text: "Tú eres<br>lo mejor que<br>me ha pasado", weight: 0.225 },

            // Mensaje Común 2 (22.5%)
            { text: "Mi mundo<br>es más bonito<br>contigo", weight: 0.225 },

            // Mensaje Común 3 (22.5%)
            { text: "Te elijo a ti<br>una y mil<br>veces más", weight: 0.225 },

            // Mensaje Común 4 (22.5%)
            { text: "Gracias por<br>existir y<br>hacerme feliz", weight: 0.225 },

            // 🌟 MENSAJE RARO / ESPECIAL (Solo 10% de probabilidad)
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
        this.sparkles = [];
        this.textParticles = [];
    }

    loop() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.loop());

        if (!this.ctx) return;

        // 1. Fondo con efecto "Motion Blur"
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Un poco más de estela
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 2. Modo de mezcla aditiva
        this.ctx.globalCompositeOperation = 'lighter';

        // 3. Lógica de Cohetes
        if (this.rockets.length < 8 && Math.random() < this.config.rocketSpawnChance) {
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

        // 5. Actualizar Partículas de Texto (NUEVO)
        this.ctx.globalCompositeOperation = 'source-over'; // El texto se debe ver nítido, no mezclado
        for (let i = this.textParticles.length - 1; i >= 0; i--) {
            let tp = this.textParticles[i];
            tp.update();
            tp.draw(this.ctx);
            if (tp.life <= 0) {
                this.textParticles.splice(i, 1);
            }
        }
        this.ctx.globalCompositeOperation = 'lighter'; // Volver a modo luz para chispas

        // 6. Actualizar Chispas
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
        const type = Math.floor(Math.random() * 5); // Aumentamos tipos para variedad
        this.rockets.push(new Rocket(x, this.height, targetY, palette, type));
    }

    createExplosion(rocket) {
        // Flash de pantalla ocasional (Comic Impact)
        if (Math.random() > 0.8) {
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'overlay';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.restore();
        }

        // Lanza una onomatopeya con probabilidad media
        if (Math.random() > 0.3) {
            let word;
            // 10% de probabilidad de que salga "MG" específicamente
            if (Math.random() < 0.1) {
                word = "Hermosa";
            } else {
                word = this.config.words[Math.floor(Math.random() * this.config.words.length)];
            }
            this.textParticles.push(new TextParticle(rocket.x, rocket.y, word, rocket.color));
        }

        const count = this.config.particleCount;

        for (let i = 0; i < count; i++) {
            const p = new Particle(rocket.x, rocket.y, rocket.palette);

            // Patrones de explosión
            if (rocket.type === 1) { // Corazón
                const angle = (Math.PI * 2 * i) / count;
                const xDir = 16 * Math.pow(Math.sin(angle), 3);
                const yDir = -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle));

                p.vx = (xDir / 10) * (Math.random() * 0.5 + 0.5);
                p.vy = (yDir / 10) * (Math.random() * 0.5 + 0.5);
                p.friction = 0.94;
                p.gravity = 0.05;
                p.life = 140;
            } else if (rocket.type === 2) { // Anillo Saturno
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 1 + 8;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                // Aplana el círculo para hacer una elipse
                p.vy *= 0.4;
                p.friction = 0.92;
            } else if (rocket.type === 3) { // Sauce Llorón
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 10 + 2;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.friction = 0.90;
                p.gravity = 0.15; // Cae más rápido
                p.willow = true;
                p.life = 150;
            } else { // Esfera Clásica
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 15; // Más violentas
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
        this.speed = Math.random() * 4 + 14;
        this.angle = -Math.PI / 2 + (Math.random() * 0.1 - 0.05); // Menos desviación
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.exploded = false;
        this.history = [];
    }

    update() {
        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > 4) this.history.shift();

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

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
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
        this.color = palette[Math.floor(Math.random() * palette.length)];

        this.vx = 0;
        this.vy = 0;
        this.alpha = 1;
        this.friction = 0.94;
        this.gravity = 0.2;
        this.life = Math.random() * 60 + 50;
        this.maxLife = this.life;
        this.size = Math.random() * 3 + 2; // Partículas más grandes (estilo cómic)
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
        if (this.alpha < 0) this.alpha = 0;
    }

    draw(ctx) {
        if (this.alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;

        // Estilo cuadrado/círculo para estética pixel/pop
        if (this.willow) {
            ctx.fillStyle = `rgba(255, 230, 100, ${this.alpha})`;
            ctx.fillRect(this.x, this.y, 2, 6);
        } else {
            // Dibujar cuadrados a veces para variar
            if (Math.random() > 0.5) {
                ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
            } else {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
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
        this.targetSize = 40 + Math.random() * 20; // Tamaño final
        this.life = 80;
        this.angle = (Math.random() * 0.4) - 0.2; // Rotación leve
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2 - 2; // Sube un poco
    }

    update() {
        // Efecto "Pop" al aparecer
        if (this.size < this.targetSize) {
            this.size += (this.targetSize - this.size) * 0.2;
        }

        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.05; // Gravedad leve

        this.life--;
    }

    draw(ctx) {
        if (this.life <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Efecto Fade Out al final
        let alpha = 1;
        if (this.life < 20) alpha = this.life / 20;
        ctx.globalAlpha = alpha;

        ctx.font = `900 ${this.size}px 'Bangers', cursive`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Borde negro grueso
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000';
        ctx.strokeText(this.text, 0, 0);

        // Relleno vibrante
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, 0, 0);

        // Brillo blanco interior
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#FFF';
        ctx.strokeText(this.text, 0, 0);

        ctx.restore();
    }
}

class Sparkle {
    constructor(x, y, color) {
        this.x = x + (Math.random() * 10 - 5);
        this.y = y + (Math.random() * 10 - 5);
        this.color = '#FFF'; // Chispas blancas brillan más
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
        ctx.fillRect(this.x, this.y, 3, 3); // Chispas más grandes
        ctx.globalAlpha = 1;
    }
}
