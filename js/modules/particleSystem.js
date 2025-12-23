import { ColorSampler } from '../utils/colorSampler.js';

// Partícula minimalista y optimizada
class MinimalParticle {
  constructor(colorPalette, width, height) {
    this.colorPalette = colorPalette;
    this.width = width;
    this.height = height;
    this.reset();
  }

  reset() {
    // Spawn desde el centro en círculo
    const angle = Math.random() * Math.PI * 2;
    const spawnRadius = 50;
    
    this.x = Math.cos(angle) * spawnRadius;
    this.y = Math.sin(angle) * spawnRadius;
    this.z = 800 + Math.random() * 400;
    
    // Velocidad simple
    this.speed = 2 + Math.random() * 2;
    
    // Propiedades visuales minimalistas
    this.baseSize = 0.8 + Math.random() * 1.2; // Más pequeñas
    this.color = this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    
    // Pulso de audio simple
    this.pulse = 0;
  }

  update(musicState) {
    // Sincronización simple con bass
    const speedMult = 1 + musicState.bass * 3 + musicState.impact * 5;
    this.z -= this.speed * speedMult;
    
    // Pulso reactivo
    this.pulse = musicState.mid * 0.5 + musicState.impact * 0.8;
    
    // Reset cuando está muy cerca
    if (this.z < 10) {
      this.reset();
    }
  }

  draw(ctx, centerX, centerY) {
    const fov = 400;
    const scale = fov / (fov + this.z);
    
    // Convertir a enteros para mejor performance
    const x2d = Math.floor(this.x * scale + centerX);
    const y2d = Math.floor(this.y * scale + centerY);
    
    // Tamaño minimalista
    const size = this.baseSize * scale * (1 + this.pulse);
    
    // Alpha simple basado en profundidad
    const alpha = Math.max(0, Math.min(1, 1 - this.z / 1200)) * (0.6 + musicState.level * 0.4);
    
    if (alpha < 0.05) return;
    
    // Dibujar partícula simple sin sombras
    ctx.fillStyle = ColorSampler.rgba(this.color, alpha);
    ctx.fillRect(x2d - size, y2d - size, size * 2, size * 2); // fillRect es más rápido que arc
  }
}

// Sistema ultra optimizado
export class ParticleSystem {
  constructor(canvas, colorSampler, audioAnalyzer) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { 
      alpha: true, 
      desynchronized: true,
      willReadFrequently: false 
    });
    this.colorSampler = colorSampler;
    this.audioAnalyzer = audioAnalyzer;
    
    this.particles = [];
    this.MAX_PARTICLES = 60; // Reducido drásticamente
    
    // Colores precalculados
    this.colorPalette = [];
    for (let i = 0; i < 8; i++) {
      this.colorPalette.push(colorSampler.sampleColor());
    }
    
    // Actualizar paleta menos frecuentemente
    setInterval(() => {
      const idx = Math.floor(Math.random() * this.colorPalette.length);
      this.colorPalette[idx] = colorSampler.sampleColor();
    }, 800);
    
    // Inicializar partículas
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push(
        new MinimalParticle(this.colorPalette, this.canvas.width, this.canvas.height)
      );
    }
    
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
  }

  drawFlash(musicState) {
    // Flash sutil en impactos fuertes
    if (musicState.impact > 0.75) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const flashAlpha = (musicState.impact - 0.75) * 0.15;
      
      // Gradiente radial simple
      const gradient = this.ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, 200
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  animate(currentTime) {
    const musicState = this.audioAnalyzer.getState();
    
    // Limitar a 60 FPS
    const deltaTime = currentTime - this.lastTime;
    if (deltaTime < 16) {
      requestAnimationFrame(this.animate);
      return;
    }
    this.lastTime = currentTime;

    // Limpieza eficiente
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Flash de fondo opcional
    this.drawFlash(musicState);
    
    // Modo de composición para brillo
    this.ctx.globalCompositeOperation = 'lighter';
    
    // Actualizar y dibujar todas las partículas en un solo loop
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles[i].update(musicState);
      this.particles[i].draw(this.ctx, centerX, centerY);
    }
    
    this.ctx.globalCompositeOperation = 'source-over';
    
    requestAnimationFrame(this.animate);
  }

  start() {
    this.animate(performance.now());
  }

  // Ajustar cantidad dinámicamente (mantener bajo)
  setParticleCount(count) {
    this.MAX_PARTICLES = Math.max(30, Math.min(100, count));
    const diff = this.MAX_PARTICLES - this.particles.length;
    
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        this.particles.push(
          new MinimalParticle(this.colorPalette, this.canvas.width, this.canvas.height)
        );
      }
    } else if (diff < 0) {
      this.particles.splice(this.MAX_PARTICLES);
    }
  }
}
