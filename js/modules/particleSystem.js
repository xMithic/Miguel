import { ColorSampler } from '../utils/colorSampler.js';

// Clase para partículas 3D estilo Universe Within
class Star3D {
  constructor(colorPalette) {
    this.colorPalette = colorPalette;
    this.reset();
  }

  reset() {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 500;
    
    this.x = Math.cos(angle) * radius;
    this.y = Math.sin(angle) * radius;
    this.z = Math.random() * 2000 + 1000;
    
    this.baseSize = 0.5 + Math.random() * 1.5;
    this.color = this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    this.speedZ = 2 + Math.random() * 3;
  }

  update(musicState) {
    const speedMultiplier = 1 + (musicState.bass * 4) + (musicState.impact * 8);
    this.z -= this.speedZ * speedMultiplier;

    if (this.z < 1) {
      this.reset();
    }
  }

  draw(ctx, centerX, centerY, width, height, musicState) {
    const fov = 300;
    const scale = fov / (fov + this.z);
    
    const x2d = this.x * scale + centerX;
    const y2d = this.y * scale + centerY;
    
    // Culling
    if (x2d < -50 || x2d > width + 50 || y2d < -50 || y2d > height + 50) {
      return;
    }

    const size = this.baseSize * scale * (1 + musicState.mid * 1.5);
    
    let alpha = 1 - (this.z / 2000);
    alpha = Math.max(0, Math.min(1, alpha));
    alpha *= (0.6 + musicState.level * 0.4);

    // Estelas con impactos ✅ CORREGIDO
    if (musicState.impact > 0.3) {
      const trailLength = 15 * musicState.impact * scale;
      const gradient = ctx.createLinearGradient(
        x2d, y2d,
        x2d + (this.x * 0.01 * scale), 
        y2d + (this.y * 0.01 * scale)
      );
      gradient.addColorStop(0, ColorSampler.rgba(this.color, alpha * 0.8));
      gradient.addColorStop(1, ColorSampler.rgba(this.color, 0));
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = size * 0.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x2d, y2d);
      ctx.lineTo(
        x2d + (this.x * 0.01 * scale * trailLength), 
        y2d + (this.y * 0.01 * scale * trailLength)
      );
      ctx.stroke();
    }

    // Partícula central ✅ CORREGIDO
    ctx.fillStyle = ColorSampler.rgba(this.color, alpha);
    ctx.beginPath();
    ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
    ctx.fill();

    // Brillo en partículas cercanas ✅ CORREGIDO
    if (this.z < 300 && musicState.treble > 0.5) {
      ctx.fillStyle = ColorSampler.rgba({ r: 255, g: 255, b: 255 }, alpha * 0.5);
      ctx.beginPath();
      ctx.arc(x2d, y2d, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ✅ FUNCIÓN HELPER LOCAL (alternativa más limpia)
function rgba(color, alpha) {
  return `rgba(${color.r},${color.g},${color.b},${alpha})`;
}

// Sistema de partículas
export class ParticleSystem {
  constructor(canvas, colorSampler, audioAnalyzer) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    this.colorSampler = colorSampler;
    this.audioAnalyzer = audioAnalyzer;
    
    this.particles = [];
    this.MAX_PARTICLES = 200;
    
    // Pool de colores
    this.colorPalette = [];
    for (let i = 0; i < 10; i++) {
      this.colorPalette.push(colorSampler.sampleColor());
    }
    
    // Actualizar paleta periódicamente
    setInterval(() => {
      const idx = Math.floor(Math.random() * this.colorPalette.length);
      this.colorPalette[idx] = this.colorSampler.sampleColor();
    }, 500);
    
    // Inicializar partículas
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push(new Star3D(this.colorPalette));
    }
    
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
  }

  animate(currentTime) {
    const musicState = this.audioAnalyzer.getState();
    
    // Limitar FPS
    const deltaTime = currentTime - this.lastTime;
    if (deltaTime < 16) {
      requestAnimationFrame(this.animate);
      return;
    }
    this.lastTime = currentTime;

    // Limpiar canvas
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Actualizar y dibujar
    this.ctx.save();
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.particles.forEach(p => {
      p.update(musicState);
      p.draw(this.ctx, centerX, centerY, this.canvas.width, this.canvas.height, musicState);
    });

    this.ctx.restore();
    requestAnimationFrame(this.animate);
  }

  start() {
    this.animate(performance.now());
  }
}
