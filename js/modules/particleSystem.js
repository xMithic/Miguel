import { ColorSampler } from '../utils/colorSampler.js';

/* ==========================================
   CLASE NEURAL PARTICLE (Con Spawn en Esquinas y Centro)
   ========================================== */
class NeuralParticle {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.history = [];
        this.MAX_HISTORY = 8; 
        this.color = { r: 220, g: 202, b: 255 }; 
        this.x2d = 0;
        this.y2d = 0;
        this.reset(true);
    }

    reset(isInitial = false) {
        // Z aleatoria: unas nacen cerca (0) y otras lejos (1500)
        this.z = Math.random() * 1500;
        
        const fov = 400;
        // Evitamos división por cero asegurando que (fov + z) nunca sea 0
        const scale = fov / Math.max(0.1, (fov + this.z));
        
        // --- NUEVA LÓGICA: SPAWN EN ESQUINAS Y CENTRO ---
        // Calculamos los límites del mundo 3D en este nivel de profundidad Z
        const worldWidth = this.width / scale;
        const worldHeight = this.height / scale;

        // Elegimos una zona de nacimiento (0: Centro, 1-4: Esquinas)
        const spawnRegion = Math.floor(Math.random() * 5);
        
        // Dispersión para que no salgan en líneas rectas perfectas (efecto orgánico)
        const spread = 150 + Math.random() * 150; 

        switch(spawnRegion) {
            case 0: // Centro
                this.x = (Math.random() - 0.5) * spread;
                this.y = (Math.random() - 0.5) * spread;
                break;
            case 1: // Arriba-Izquierda
                this.x = (-worldWidth / 2) + (Math.random() * spread);
                this.y = (-worldHeight / 2) + (Math.random() * spread);
                break;
            case 2: // Arriba-Derecha
                this.x = (worldWidth / 2) - (Math.random() * spread);
                this.y = (-worldHeight / 2) + (Math.random() * spread);
                break;
            case 3: // Abajo-Izquierda
                this.x = (-worldWidth / 2) + (Math.random() * spread);
                this.y = (worldHeight / 2) - (Math.random() * spread);
                break;
            case 4: // Abajo-Derecha
                this.x = (worldWidth / 2) - (Math.random() * spread);
                this.y = (worldHeight / 2) - (Math.random() * spread);
                break;
        }

        // --- Resto de la física ---
        this.speed = 0.5 + Math.random() * 1.0;
        
        // Ángulo aleatorio para que se muevan en todas direcciones desde su origen
        this.angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.baseSize = 0.5 + Math.random() * 1.5;
        this.history = [];
    }

    // Interpolación lineal segura
    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    update(musicState, pixelData, bufferWidth, bufferHeight, canvasWidth, canvasHeight) {
        // Actualizamos las dimensiones por si la pantalla cambió de tamaño
        this.width = canvasWidth;
        this.height = canvasHeight;

        // --- 1. Física Segura ---
        const bass = musicState?.bass || 0;
        
        // Mover hacia el espectador
        this.z -= (this.speed * (1 + bass));
        
        // Movimiento lateral
        this.x += this.vx;
        this.y += this.vy;

        // Proyección 3D a 2D
        const fov = 400;
        
        // Protección crítica: si Z es muy negativo (pasó la cámara), resetear
        if (this.z <= -fov + 10) { 
            this.reset(); 
            return; 
        }

        const scale = fov / (fov + this.z);
        const screenX = this.x * scale + canvasWidth / 2;
        const screenY = this.y * scale + canvasHeight / 2;

        // --- 2. Sincronización de Color (Protegida) ---
        if (pixelData && bufferWidth > 0) {
            // Verificar límites antes de leer el array
            if (screenX >= 0 && screenX < canvasWidth && screenY >= 0 && screenY < canvasHeight) {
                const bufferX = Math.floor((screenX / canvasWidth) * bufferWidth);
                const bufferY = Math.floor((screenY / canvasHeight) * bufferHeight);
                const index = (bufferY * bufferWidth + bufferX) * 4;

                // Lectura segura del pixel
                if (index >= 0 && index < pixelData.length - 4) {
                    const r = pixelData[index];
                    const g = pixelData[index + 1];
                    const b = pixelData[index + 2];
                    
                    if (!isNaN(r)) {
                        const brightness = (r + g + b) / 3;
                        let targetR = r, targetG = g, targetB = b;
                        
                        if (brightness > 200) { 
                             targetR = 50; targetG = 50; targetB = 50; 
                        } else {
                             targetR = Math.min(255, r * 1.5);
                             targetG = Math.min(255, g * 1.5);
                             targetB = Math.min(255, b * 1.5);
                        }

                        this.color.r = this.lerp(this.color.r, targetR, 0.2);
                        this.color.g = this.lerp(this.color.g, targetG, 0.2);
                        this.color.b = this.lerp(this.color.b, targetB, 0.2);
                    }
                }
            }
        }

        // Guardar historia para la cola
        this.x2d = screenX;
        this.y2d = screenY;
        this.history.push({ x: screenX, y: screenY });
        if (this.history.length > this.MAX_HISTORY) this.history.shift();

        // --- Reinicio Infinito ---
        // Si sale demasiado de los lados
        const boundX = canvasWidth * 2; 
        if (Math.abs(screenX - canvasWidth/2) > boundX) {
            this.reset();
            this.z = 1500; // Mandar al fondo
        }
    }

    draw(ctx, centerX, centerY, musicState) {
        if (this.z < 10) return; // No dibujar si está detrás

        const fov = 400;
        const scale = fov / (fov + this.z);
        
        // Alpha basado en profundidad (Fade in/out)
        const depthAlpha = Math.min(1, Math.max(0, (1400 - this.z) / 300));
        if (depthAlpha < 0.05) return;

        const r = Math.floor(this.color.r);
        const g = Math.floor(this.color.g);
        const b = Math.floor(this.color.b);
        const a = depthAlpha; 

        // Dibujar Rastro (Cola)
        if (this.history.length > 2) {
            ctx.beginPath();
            ctx.moveTo(this.history[0].x, this.history[0].y);
            for (let i = 1; i < this.history.length; i++) {
                ctx.lineTo(this.history[i].x, this.history[i].y);
            }
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a * 0.5})`;
            ctx.lineWidth = 1 * scale;
            ctx.stroke();
        }

        // Dibujar Partícula
        const size = Math.max(0.5, this.baseSize * scale * (1 + (musicState?.bass || 0)));
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        ctx.beginPath();
        ctx.arc(this.x2d, this.y2d, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

/* ==========================================
   SISTEMA DE PARTÍCULAS PRINCIPAL
   ========================================== */
export class ParticleSystem {
    constructor(canvas, colorSampler, audioAnalyzer) {
        this.canvas = canvas;
        // IMPORTANTE: alpha: true permite que se vea el video de fondo
        this.ctx = canvas.getContext('2d', { alpha: true });
        this.colorSampler = colorSampler;
        this.audioAnalyzer = audioAnalyzer;
        
        this.particles = [];
        this.MAX_PARTICLES = 120;
        this.CONNECTION_DISTANCE = 150;
        
        // Mouse
        this.mouse = { x: -1000, y: -1000, active: false };

        this.initParticles();
        this.initInput();
        this.animate = this.animate.bind(this);
    }

    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.MAX_PARTICLES; i++) {
            this.particles.push(new NeuralParticle(this.canvas.width, this.canvas.height));
        }
    }

/* Copia y pega esto reemplazando el método initInput() existente en particleSystem.js */

initInput() {
    // Bloquear gestos también aquí para consistencia
    this.canvas.style.touchAction = 'none';

    const updateMouse = (e) => {
        // Solo actualizamos si es el puntero principal (evita errores multitouch)
        if (!e.isPrimary) return;

        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        this.mouse.active = true;
    };

    // --- ESCUCHAS UNIFICADAS (POINTER EVENTS) ---
    
    // Detectar movimiento (funciona para mouse y touch arrastrando)
    window.addEventListener('pointermove', (e) => {
        updateMouse(e);
    });

    // Detectar inicio de interacción (necesario para touch instantáneo)
    window.addEventListener('pointerdown', (e) => {
        updateMouse(e);
        this.mouse.active = true;
    });

    // Manejar el final de la interacción
    const endInteraction = (e) => {
        // En dispositivos táctiles, queremos que deje de interactuar al levantar el dedo.
        // En PC (mouse), a veces preferimos que siga activo o no, según tu gusto.
        // Aquí replicamos tu lógica original: Touchend desactivaba, Mouse se quedaba.
        
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
            this.mouse.active = false;
            // Opcional: Mover fuera de pantalla para que no se queden pegadas en el último punto
            this.mouse.x = -1000;
            this.mouse.y = -1000;
        }
    };

    window.addEventListener('pointerup', endInteraction);
    window.addEventListener('pointercancel', endInteraction);
    window.addEventListener('pointerleave', endInteraction);
}

    drawConnections(bassFactor) {
        // Conexiones neuronales
        this.ctx.lineWidth = 0.5;
        const reach = this.CONNECTION_DISTANCE * (1 + bassFactor);
        const reachSq = reach * reach;

        for (let i = 0; i < this.particles.length; i++) {
            const p1 = this.particles[i];
            
            // Conexión con Mouse (Interacción)
            if (this.mouse.active) {
                const dx = p1.x2d - this.mouse.x;
                const dy = p1.y2d - this.mouse.y;
                if (dx*dx + dy*dy < 150*150) {
                    this.ctx.strokeStyle = `rgba(${Math.floor(p1.color.r)}, 255, 255, 0.4)`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x2d, p1.y2d);
                    this.ctx.lineTo(this.mouse.x, this.mouse.y);
                    this.ctx.stroke();
                }
            }

            // Conexión entre partículas cercanas (Red Neuronal)
            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                // Optimización rápida: solo conectar si están cerca en profundidad Z también
                if (Math.abs(p1.z - p2.z) > 100) continue; 

                const dx = p1.x2d - p2.x2d;
                const dy = p1.y2d - p2.y2d;
                
                if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue; // Box check rápido

                const distSq = dx*dx + dy*dy;
                if (distSq < reachSq) {
                    const alpha = (1 - distSq / reachSq) * 0.3;
                    this.ctx.strokeStyle = `rgba(200, 200, 255, ${alpha})`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x2d, p1.y2d);
                    this.ctx.lineTo(p2.x2d, p2.y2d);
                    this.ctx.stroke();
                }
            }
        }
    }

    animate() {
        // 1. LIMPIEZA DEL CANVAS
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Datos externos
        let musicState = { bass: 0 };
        let pixelData = null;
        let bufferW = 0, bufferH = 0;

        try {
            if (this.audioAnalyzer) musicState = this.audioAnalyzer.getState();
            if (this.colorSampler) {
                pixelData = this.colorSampler.getPixelData();
                bufferW = this.colorSampler.width;
                bufferH = this.colorSampler.height;
            }
        } catch (e) {
            // Ignorar errores de módulos externos
        }

        // Actualizar y Dibujar (Ordenado por Z)
        this.particles.sort((a, b) => b.z - a.z);

        this.particles.forEach(p => {
            p.update(musicState, pixelData, bufferW, bufferH, this.canvas.width, this.canvas.height);
            p.draw(this.ctx, this.canvas.width/2, this.canvas.height/2, musicState);
        });

        this.drawConnections(musicState.bass || 0);

        requestAnimationFrame(this.animate);
    }

    start() { this.animate(); }
    resize(w, h) { this.canvas.width = w; this.canvas.height = h; }
}
