export class SurpriseSystem {
    constructor() {
        this.canvas = document.getElementById('fireworks-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.isRunning = false;
        
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.fireworks = [];
        this.particles = [];
        
        // Manejar redimensionamiento
        window.addEventListener('resize', () => {
            if(!this.canvas) return;
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        });
        
        if(this.canvas) {
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        }
    }

    trigger() {
        if (!this.canvas) return;
        
        this.isRunning = true;
        document.body.classList.add('show-surprise');
        
        this.loop();

        // Cerrar automáticamente tras hacer clic
        setTimeout(() => {
            const closeHandler = () => {
                this.stop();
                document.removeEventListener('click', closeHandler);
            };
            setTimeout(() => {
                document.addEventListener('click', closeHandler, { once: true });
            }, 500);
        }, 500);
    }

    stop() {
        this.isRunning = false;
        document.body.classList.remove('show-surprise');
        
        // Limpiar canvas
        if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height);
        this.fireworks = [];
        this.particles = [];
    }

    loop() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.loop());

        // Efecto de rastro (motion blur)
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Rastro más largo
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.globalCompositeOperation = 'lighter'; // Mezcla de luz aditiva

        // 1. Crear cohetes
        if (this.fireworks.length < 4 && Math.random() < 0.05) {
            this.fireworks.push(new Firework(this.width, this.height));
        }

        // 2. Actualizar Cohetes (Subida)
        for (let i = this.fireworks.length - 1; i >= 0; i--) {
            let fw = this.fireworks[i];
            fw.update();
            fw.draw(this.ctx);

            if (fw.readyToExplode) {
                this.createExplosion(fw.x, fw.y, fw.hue); // Pasamos el color
                this.fireworks.splice(i, 1);
            }
        }

        // 3. Actualizar Partículas (Explosión)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.update();
            p.draw(this.ctx);
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    createExplosion(x, y, baseHue) {
        // Cantidad de partículas por explosión
        for (let i = 0; i < 50; i++) {
            this.particles.push(new Particle(x, y, baseHue));
        }
    }
}

/* =========================================
   CLASE COHETE (SUBIDA) - MEJORADA
   ========================================= */
class Firework {
    constructor(w, h) {
        this.x = Math.random() * (w * 0.6) + (w * 0.2); // Centrado
        this.y = h;
        this.tx = this.x + (Math.random() * 200 - 100); 
        this.ty = Math.random() * (h * 0.4) + (h * 0.1); 
        
        this.speed = 5;
        this.angle = Math.atan2(this.ty - this.y, this.tx - this.x);
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        
        // Color "Negativo/Luz": Base Cian/Blanco
        // Usamos un rango de azules eléctricos y blancos
        this.hue = Math.random() * 60 + 180; // Tonos Cian/Azul
        this.brightness = Math.random() * 20 + 80; // Muy brillante
        
        // Rastro
        this.coordinates = []; 
        this.coordinateCount = 4; // Longitud de la cola
        
        this.readyToExplode = false;
    }

    update() {
        // Guardar coordenadas pasadas para la cola
        this.coordinates.pop();
        this.coordinates.unshift([this.x, this.y]);
        // Si el array está vacío al inicio, llenarlo
        if (this.coordinates.length < this.coordinateCount) {
             while(this.coordinates.length < this.coordinateCount) {
                 this.coordinates.push([this.x, this.y]);
             }
        }

        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.04; // Gravedad

        if (this.y <= this.ty || this.vy >= 0) {
            this.readyToExplode = true;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        // Dibujar desde el último punto de la cola hasta el actual
        let last = this.coordinates[this.coordinates.length - 1];
        if(!last) return;
        
        ctx.moveTo(last[0], last[1]);
        ctx.lineTo(this.x, this.y);
        
        // ESTILO DE LA COLA: "Luz Negativa"
        // HSL(Cian, 100%, 90%) -> Casi blanco con tinte azul
        ctx.strokeStyle = `hsl(${this.hue}, 100%, ${this.brightness}%)`;
        
        // Efecto Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsl(${this.hue}, 100%, 50%)`;
        
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Resetear sombra para no afectar rendimiento global excesivamente
        ctx.shadowBlur = 0;
    }
}

/* =========================================
   CLASE PARTÍCULA (EXPLOSIÓN)
   ========================================= */
class Particle {
    constructor(x, y, hue) {
        this.x = x;
        this.y = y;
        this.angle = Math.random() * Math.PI * 2;
        // Velocidad explosiva variable
        this.speed = Math.random() * 6 + 1;
        this.friction = 0.95;
        this.gravity = 0.15;
        
        // Color: Variación del color del cohete + algunos blancos
        this.hue = hue + (Math.random() * 40 - 20);
        this.brightness = Math.random() * 40 + 60;
        this.alpha = 1;
        this.decay = Math.random() * 0.02 + 0.01;
    }

    update() {
        this.speed *= this.friction;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed + this.gravity;
        this.alpha -= this.decay;
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        // Color brillante
        ctx.fillStyle = `hsl(${this.hue}, 100%, ${this.brightness}%)`;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
