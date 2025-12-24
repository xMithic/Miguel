import { ColorSampler } from '../utils/colorSampler.js';

/* ==========================================
   CLASE NEURAL PARTICLE
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
        
        // Iniciamos directamente
        this.reset(true);
    }

    reset(isInitial = false) {
        this.z = Math.random() * 1500;
        
        const fov = 400;
        const scale = fov / Math.max(0.1, (fov + this.z));
        const worldWidth = this.width / scale;
        const worldHeight = this.height / scale;

        this.x = (Math.random() - 0.5) * worldWidth;
        this.y = (Math.random() - 0.5) * worldHeight;

        this.speed = 0.5 + Math.random() * 1.0;
        this.angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.baseSize = 0.5 + Math.random() * 1.5;
        this.history = [];
    }

    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    update(musicState, pixelData, bufferWidth, bufferHeight, canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        const bass = musicState?.bass || 0;
        
        this.z -= (this.speed * (1 + bass));
        this.x += this.vx;
        this.y += this.vy;

        const fov = 400;
        if (this.z <= -fov + 10) { 
            this.reset(); 
            return; 
        }

        const scale = fov / (fov + this.z);
        const screenX = this.x * scale + canvasWidth / 2;
        const screenY = this.y * scale + canvasHeight / 2;

        if (pixelData && bufferWidth > 0) {
            if (screenX >= 0 && screenX < canvasWidth && screenY >= 0 && screenY < canvasHeight) {
                const bufferX = Math.floor((screenX / canvasWidth) * bufferWidth);
                const bufferY = Math.floor((screenY / canvasHeight) * bufferHeight);
                const index = (bufferY * bufferWidth + bufferX) * 4;

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

        this.x2d = screenX;
        this.y2d = screenY;
        
        this.history.push({ x: screenX, y: screenY });
        if (this.history.length > this.MAX_HISTORY) this.history.shift();

        const boundX = canvasWidth * 2; 
        if (Math.abs(screenX - canvasWidth/2) > boundX) {
            this.reset();
            this.z = 1500;
        }
    }

    draw(ctx, centerX, centerY, musicState) {
        if (this.z < 10) return;

        const fov = 400;
        const scale = fov / (fov + this.z);
        
        const depthAlpha = Math.min(1, Math.max(0, (1400 - this.z) / 300));
        if (depthAlpha < 0.05) return;

        const r = Math.floor(this.color.r);
        const g = Math.floor(this.color.g);
        const b = Math.floor(this.color.b);
        const a = depthAlpha; 

        // 1. Rastro (Optimizado)
        if (this.history.length > 2) {
            ctx.beginPath();
            ctx.moveTo(this.history[0].x, this.history[0].y);
            for (let i = 1; i < this.history.length; i++) {
                ctx.lineTo(this.history[i].x, this.history[i].y);
            }
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a * 0.4})`;
            ctx.lineWidth = 1 * scale;
            ctx.stroke();
        }

        // --- SOLUCIÓN RENDIMIENTO + NEÓN ---
        // Usamos Gradiente Radial en vez de ShadowBlur.
        // Es infinitamente más rápido y da un degradado perfecto (sin capas).
        
        const size = Math.max(0.5, this.baseSize * scale * (1 + (musicState?.bass || 0)));
        const glowRadius = size * 4; // Radio del brillo

        // Creamos un degradado que va del blanco (centro) -> color (medio) -> transparente (borde)
        const gradient = ctx.createRadialGradient(this.x2d, this.y2d, 0, this.x2d, this.y2d, glowRadius);
        
        // Centro: Blanco puro (energía)
        gradient.addColorStop(0, `rgba(255, 255, 255, ${a})`);
        // Medio: Color del neón intenso
        gradient.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, ${a * 0.8})`);
        // Borde: Transparente (difuminado suave)
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.globalCompositeOperation = 'lighter'; // Mezcla de luz para que brille más al juntarse
        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        ctx.arc(this.x2d, this.y2d, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
    }
}

/* ==========================================
   SISTEMA DE PARTÍCULAS PRINCIPAL
   ========================================== */
export class ParticleSystem {
    constructor(canvas, colorSampler, audioAnalyzer) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: true });
        this.colorSampler = colorSampler;
        this.audioAnalyzer = audioAnalyzer;
        
        this.particles = [];
        this.MAX_PARTICLES = 100; // Bajamos ligeramente para asegurar 60FPS constantes
        this.CONNECTION_DISTANCE = 150;
        
        this.mouse = { x: -1000, y: -1000, active: false };

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

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

    initInput() {
        this.canvas.style.touchAction = 'none';
        const updateMouse = (e) => {
            if (!e.isPrimary) return;
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
            this.mouse.active = true;
        };
        window.addEventListener('pointermove', updateMouse);
        window.addEventListener('pointerdown', (e) => {
            updateMouse(e);
            this.mouse.active = true;
        });
        const endInteraction = (e) => {
            if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                this.mouse.active = false;
                this.mouse.x = -1000;
                this.mouse.y = -1000;
            }
        };
        window.addEventListener('pointerup', endInteraction);
        window.addEventListener('pointercancel', endInteraction);
        window.addEventListener('pointerleave', endInteraction);
    }

    drawConnections(bassFactor) {
        this.ctx.lineWidth = 0.5;
        const reach = this.CONNECTION_DISTANCE * (1 + bassFactor);
        const reachSq = reach * reach;
        
        // Las líneas también usan 'lighter' para brillar
        this.ctx.globalCompositeOperation = 'lighter'; 

        for (let i = 0; i < this.particles.length; i++) {
            const p1 = this.particles[i];
            
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

            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                if (Math.abs(p1.z - p2.z) > 100) continue; 

                const dx = p1.x2d - p2.x2d;
                const dy = p1.y2d - p2.y2d;
                
                if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue; 

                const distSq = dx*dx + dy*dy;
                if (distSq < reachSq) {
                    const alpha = (1 - distSq / reachSq) * 0.3;
                    this.ctx.strokeStyle = `rgba(${Math.floor(p1.color.r)}, ${Math.floor(p1.color.g)}, ${Math.floor(p1.color.b)}, ${alpha})`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x2d, p1.y2d);
                    this.ctx.lineTo(p2.x2d, p2.y2d);
                    this.ctx.stroke();
                }
            }
        }
        this.ctx.globalCompositeOperation = 'source-over';
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

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
        } catch (e) {}

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
