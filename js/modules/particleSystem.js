import { ColorSampler } from '../utils/colorSampler.js';

/* ==========================================
   CLASE NEURAL PARTICLE
========================================== */
class NeuralParticle {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.history = [];
        this.MAX_HISTORY = 3;
        this.color = { r: 220, g: 220, b: 255 };
        this.x2d = 0;
        this.y2d = 0;
        this.reset(true);
    }

    reset(isInitial = false) {
        this.x = Math.random() * this.width;
        this.y = Math.random() * this.height;

        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 1.0;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.baseSize = 1.0 + Math.random() * 1.0;
        this.history = [];
    }

    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    update(musicState, pixelData, bufferWidth, bufferHeight, canvasWidth, canvasHeight, mouse) {
        this.width = canvasWidth;
        this.height = canvasHeight;

        const bass = musicState?.bass || 0;

        // --- REPULSIÓN DEL CURSOR ---
        if (mouse.active) {
            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const distSq = dx * dx + dy * dy;
            const repelRadius = 150; // Radio de influencia del cursor
            const repelRadiusSq = repelRadius * repelRadius;

            if (distSq < repelRadiusSq && distSq > 0) {
                const distance = Math.sqrt(distSq);
                
                // Vector normalizado de dirección (desde cursor hacia partícula)
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                
                // Fuerza inversamente proporcional a la distancia
                const forceMagnitude = (1 - distance / repelRadius) * 2.5;
                
                // Aplicar fuerza de repulsión
                this.vx += forceDirectionX * forceMagnitude;
                this.vy += forceDirectionY * forceMagnitude;
            }
        }

        // Aplicar fricción para que no aceleren infinitamente
        this.vx *= 0.98;
        this.vy *= 0.98;

        this.x += this.vx * (1 + bass * 0.5);
        this.y += this.vy * (1 + bass * 0.5);

        if (this.x < 0 || this.x > canvasWidth) {
            this.vx *= -1;
            this.x = Math.max(0, Math.min(canvasWidth, this.x));
        }
        if (this.y < 0 || this.y > canvasHeight) {
            this.vy *= -1;
            this.y = Math.max(0, Math.min(canvasHeight, this.y));
        }

        this.x2d = this.x;
        this.y2d = this.y;

        // --- SINCRONIZACIÓN COLOR PRECISA ---
        if (pixelData && bufferWidth > 0 &&
            this.x2d >= 0 && this.x2d < canvasWidth &&
            this.y2d >= 0 && this.y2d < canvasHeight) {

            const bufferX = (this.x2d / canvasWidth * bufferWidth) | 0;
            const bufferY = (this.y2d / canvasHeight * bufferHeight) | 0;

            let totalR = 0, totalG = 0, totalB = 0;
            let samples = 0;

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const sampleX = bufferX + dx;
                    const sampleY = bufferY + dy;
                    
                    if (sampleX >= 0 && sampleX < bufferWidth && sampleY >= 0 && sampleY < bufferHeight) {
                        const index = (sampleY * bufferWidth + sampleX) << 2;
                        
                        if (index >= 0 && index < pixelData.length - 4) {
                            totalR += pixelData[index];
                            totalG += pixelData[index + 1];
                            totalB += pixelData[index + 2];
                            samples++;
                        }
                    }
                }
            }

            if (samples > 0) {
                const r = totalR / samples;
                const g = totalG / samples;
                const b = totalB / samples;

                const luminosity = (r * 0.299 + g * 0.587 + b * 0.114);
                
                const boostFactor = luminosity < 128 
                    ? 1.5 + (128 - luminosity) / 128 * 0.8
                    : 1.2 + (128 - luminosity) / 128 * 0.3;
                
                const targetR = Math.min(255, r * boostFactor);
                const targetG = Math.min(255, g * boostFactor);
                const targetB = Math.min(255, b * boostFactor);

                const lerpSpeed = 0.5;
                this.color.r = this.lerp(this.color.r, targetR, lerpSpeed);
                this.color.g = this.lerp(this.color.g, targetG, lerpSpeed);
                this.color.b = this.lerp(this.color.b, targetB, lerpSpeed);
            }
        }

        this.history.push({ x: this.x2d, y: this.y2d });
        if (this.history.length > this.MAX_HISTORY) this.history.shift();
    }

    draw(ctx, centerX, centerY, musicState) {
        const r = this.color.r | 0;
        const g = this.color.g | 0;
        const b = this.color.b | 0;

        // Rastro más sutil
        if (this.history.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.history[0].x, this.history[0].y);
            for (let i = 1; i < this.history.length; i++) {
                ctx.lineTo(this.history[i].x, this.history[i].y);
            }
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'lighter';

        const size = Math.max(0.3, this.baseSize * (1 + (musicState?.bass || 0) * 0.3));

        // Núcleo más definido y pequeño
        const rCore = Math.min(255, r + 15);
        const gCore = Math.min(255, g + 15);
        const bCore = Math.min(255, b + 15);

        ctx.fillStyle = `rgba(${rCore}, ${gCore}, ${bCore}, 0.95)`;
        ctx.beginPath();
        ctx.arc(this.x2d, this.y2d, size, 0, Math.PI * 2);
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
        this.MAX_PARTICLES = 68;
        this.CONNECTION_DISTANCE = 65;
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
        window.addEventListener('pointerleave', (e) => {
            // Desactivar mouse cuando sale del canvas
            this.mouse.active = false;
            this.mouse.x = -1000;
            this.mouse.y = -1000;
        });
    }

    drawConnections(bassFactor) {
        this.ctx.lineWidth = 1.0;
        const reach = this.CONNECTION_DISTANCE * (1 + bassFactor);
        const reachSq = reach * reach;

        this.ctx.globalCompositeOperation = 'lighter';

        const mouseActive = this.mouse.active;
        const mouseX = this.mouse.x;
        const mouseY = this.mouse.y;

        for (let i = 0; i < this.particles.length; i++) {
            const p1 = this.particles[i];

            // REMOVIDO: Conexión al mouse (ya no queremos atraer visualmente)

            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                const dx = p1.x2d - p2.x2d;
                const dy = p1.y2d - p2.y2d;

                if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;

                const distSq = dx*dx + dy*dy;

                if (distSq < reachSq) {
                    const alpha = (1 - distSq / reachSq) * 0.6;
                    const r = (p1.color.r + p2.color.r) >> 1;
                    const g = (p1.color.g + p2.color.g) >> 1;
                    const b = (p1.color.b + p2.color.b) >> 1;

                    const lineR = Math.min(255, r + 15);
                    const lineG = Math.min(255, g + 15);
                    const lineB = Math.min(255, b + 15);

                    this.ctx.strokeStyle = `rgba(${lineR}, ${lineG}, ${lineB}, ${alpha})`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x2d, p1.y2d);
                    this.ctx.lineTo(p2.x2d, p2.y2d);
                    this.ctx.stroke();

                    if ((i + j) % 2 === 0) {
                        for (let k = j + 1; k < this.particles.length; k++) {
                            const p3 = this.particles[k];
                            const dx2 = p2.x2d - p3.x2d;
                            const dy2 = p2.y2d - p3.y2d;
                            const distSq2 = dx2*dx2 + dy2*dy2;

                            if (distSq2 >= reachSq) continue;

                            const dx3 = p1.x2d - p3.x2d;
                            const dy3 = p1.y2d - p3.y2d;
                            const distSq3 = dx3*dx3 + dy3*dy3;

                            if (distSq3 < reachSq) {
                                const maxDist = Math.max(distSq, distSq2, distSq3);
                                const triAlpha = (1 - maxDist / reachSq) * 0.1;

                                if (triAlpha > 0.02) {
                                    this.ctx.fillStyle = `rgba(${lineR}, ${lineG}, ${lineB}, ${triAlpha})`;
                                    this.ctx.beginPath();
                                    this.ctx.moveTo(p1.x2d, p1.y2d);
                                    this.ctx.lineTo(p2.x2d, p2.y2d);
                                    this.ctx.lineTo(p3.x2d, p3.y2d);
                                    this.ctx.closePath();
                                    this.ctx.fill();
                                    break;
                                }
                            }
                        }
                    }
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

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.update(musicState, pixelData, bufferW, bufferH, this.canvas.width, this.canvas.height, this.mouse);
        }

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.draw(this.ctx, this.canvas.width/2, this.canvas.height/2, musicState);
        }

        this.drawConnections(musicState.bass || 0);

        requestAnimationFrame(this.animate);
    }

    start() { this.animate(); }
    resize(w, h) { this.canvas.width = w; this.canvas.height = h; }
}
