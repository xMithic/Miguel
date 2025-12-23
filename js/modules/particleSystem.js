import { ColorSampler } from '../utils/colorSampler.js';

// Partícula mejorada con conexiones neuronales
class NeuralParticle {
  constructor(colorPalette, width, height) {
    this.colorPalette = colorPalette;
    this.width = width;
    this.height = height;
    this.connections = []; // Para optimizar conexiones
    this.reset();
  }

  reset() {
    // Spawn aleatorio en todo el espacio
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 300;
    
    this.x = Math.cos(angle) * radius;
    this.y = Math.sin(angle) * radius;
    this.z = 600 + Math.random() * 600;
    
    // Velocidad y dirección
    this.speed = 1 + Math.random() * 1.5;
    this.vx = (Math.random() - 0.5) * 0.5; // Movimiento lateral suave
    this.vy = (Math.random() - 0.5) * 0.5;
    
    // Propiedades visuales pequeñas
    this.baseSize = 0.4 + Math.random() * 0.6; // Partículas muy pequeñas
    this.color = this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    
    // Pulso individual para variedad
    this.pulse = 0;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.8 + Math.random() * 0.4;
  }

  update(musicState) {
    // Movimiento hacia adelante con reactividad al bass
    const speedMult = 1 + musicState.bass * 2 + musicState.impact * 4;
    this.z -= this.speed * speedMult;
    
    // Movimiento lateral suave (efecto orgánico)
    this.x += this.vx * (1 + musicState.mid * 2);
    this.y += this.vy * (1 + musicState.mid * 2);
    
    // Pulso reactivo sincronizado con música
    this.pulsePhase += 0.05 * this.pulseSpeed;
    const naturalPulse = Math.sin(this.pulsePhase) * 0.2;
    const musicPulse = musicState.bass * 0.6 + musicState.mid * 0.3 + musicState.impact * 1.2;
    this.pulse = naturalPulse + musicPulse;
    
    // Reset cuando está muy cerca o muy lejos lateralmente
    if (this.z < 10 || Math.abs(this.x) > 800 || Math.abs(this.y) > 800) {
      this.reset();
    }
  }

  draw(ctx, centerX, centerY, musicState) {
    const fov = 400;
    const scale = fov / (fov + this.z);
    
    // Posición 2D
    this.x2d = Math.floor(this.x * scale + centerX);
    this.y2d = Math.floor(this.y * scale + centerY);
    
    // Tamaño con pulso
    const size = Math.max(1, this.baseSize * scale * (1 + this.pulse * 0.5));
    
    // Alpha basado en profundidad y nivel de música
    const depthAlpha = Math.max(0, Math.min(1, 1 - this.z / 1200));
    const alpha = depthAlpha * (0.5 + musicState.level * 0.5);
    
    if (alpha < 0.05) return;
    
    // Glow sutil cuando hay música intensa
    if (musicState.level > 0.3) {
      const glowSize = size * (2 + musicState.impact * 2);
      const glowAlpha = alpha * 0.3 * musicState.level;
      
      const gradient = ctx.createRadialGradient(this.x2d, this.y2d, 0, this.x2d, this.y2d, glowSize);
      gradient.addColorStop(0, ColorSampler.rgba(this.color, glowAlpha));
      gradient.addColorStop(1, ColorSampler.rgba(this.color, 0));
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x2d, this.y2d, glowSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Núcleo de la partícula
    ctx.fillStyle = ColorSampler.rgba(this.color, alpha * 1.2);
    ctx.beginPath();
    ctx.arc(this.x2d, this.y2d, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Calcular distancia 2D con otra partícula (optimizado)
  distance2D(other) {
    if (!this.x2d || !other.x2d) return Infinity;
    const dx = this.x2d - other.x2d;
    const dy = this.y2d - other.y2d;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// Sistema mejorado con conexiones neuronales
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
    this.MAX_PARTICLES = 80; // Más partículas pequeñas
    this.CONNECTION_DISTANCE = 120; // Distancia máxima para conexiones
    this.MAX_CONNECTIONS_PER_PARTICLE = 5; // Limitar conexiones para rendimiento
    
    // Colores precalculados
    this.colorPalette = [];
    for (let i = 0; i < 10; i++) {
      this.colorPalette.push(colorSampler.sampleColor());
    }
    
    // Actualizar paleta periódicamente
    setInterval(() => {
      const idx = Math.floor(Math.random() * this.colorPalette.length);
      this.colorPalette[idx] = colorSampler.sampleColor();
    }, 1000);
    
    // Inicializar partículas
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push(
        new NeuralParticle(this.colorPalette, this.canvas.width, this.canvas.height)
      );
    }
    
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
  }

  // Dibujar conexiones entre partículas cercanas (efecto neuronal)
  drawConnections(musicState) {
    // Solo dibujar conexiones si hay música significativa
    const connectionIntensity = Math.max(0.2, musicState.level);
    
    // Ordenar por profundidad para mejor efecto visual
    const sortedParticles = [...this.particles].sort((a, b) => b.z - a.z);
    
    for (let i = 0; i < sortedParticles.length; i++) {
      const p1 = sortedParticles[i];
      if (!p1.x2d) continue;
      
      let connectionCount = 0;
      
      // Solo verificar partículas cercanas (optimización)
      for (let j = i + 1; j < Math.min(i + 20, sortedParticles.length); j++) {
        if (connectionCount >= this.MAX_CONNECTIONS_PER_PARTICLE) break;
        
        const p2 = sortedParticles[j];
        if (!p2.x2d) continue;
        
        const dist = p1.distance2D(p2);
        
        if (dist < this.CONNECTION_DISTANCE) {
          connectionCount++;
          
          // Alpha basado en distancia y música
          const distanceRatio = 1 - (dist / this.CONNECTION_DISTANCE);
          const baseAlpha = distanceRatio * 0.3;
          const pulseAlpha = baseAlpha * (0.5 + musicState.bass * 0.5 + musicState.impact * 0.8);
          const alpha = pulseAlpha * connectionIntensity;
          
          // Grosor reactivo a la música
          const baseWidth = 0.5;
          const width = baseWidth * (1 + musicState.bass * 1.5 + musicState.impact * 2);
          
          // Color interpolado entre las dos partículas
          const mixedColor = this.mixColors(p1.color, p2.color);
          
          // Dibujar línea
          this.ctx.strokeStyle = ColorSampler.rgba(mixedColor, alpha);
          this.ctx.lineWidth = width;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x2d, p1.y2d);
          this.ctx.lineTo(p2.x2d, p2.y2d);
          this.ctx.stroke();
        }
      }
    }
  }

  // Mezclar dos colores
  mixColors(color1, color2) {
    return {
      r: Math.floor((color1.r + color2.r) / 2),
      g: Math.floor((color1.g + color2.g) / 2),
      b: Math.floor((color1.b + color2.b) / 2)
    };
  }

  // Flash de fondo mejorado
  drawFlash(musicState) {
    if (musicState.impact > 0.6) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const flashAlpha = (musicState.impact - 0.6) * 0.12;
      
      const gradient = this.ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, 300 + musicState.bass * 200
      );
      
      // Color basado en la paleta
      const flashColor = this.colorPalette[0];
      gradient.addColorStop(0, ColorSampler.rgba(flashColor, flashAlpha));
      gradient.addColorStop(0.5, ColorSampler.rgba(flashColor, flashAlpha * 0.3));
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // Efecto de pulso en los bordes
  drawEdgePulse(musicState) {
    if (musicState.beat || musicState.impact > 0.7) {
      const pulseAlpha = musicState.impact * 0.15;
      const pulseColor = this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
      
      // Vignette pulsante
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
      
      const gradient = this.ctx.createRadialGradient(
        centerX, centerY, maxRadius * 0.6,
        centerX, centerY, maxRadius
      );
      
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, ColorSampler.rgba(pulseColor, pulseAlpha));
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
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

    // Limpieza
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Efectos de fondo
    this.drawFlash(musicState);
    this.drawEdgePulse(musicState);
    
    // Modo de composición para brillo
    this.ctx.globalCompositeOperation = 'lighter';
    
    // Actualizar partículas
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles[i].update(musicState);
    }
    
    // Dibujar conexiones primero (para que queden atrás)
    this.ctx.lineCap = 'round';
    this.drawConnections(musicState);
    
    // Dibujar partículas encima
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles[i].draw(this.ctx, centerX, centerY, musicState);
    }
    
    this.ctx.globalCompositeOperation = 'source-over';
    
    requestAnimationFrame(this.animate);
  }

  start() {
    this.animate(performance.now());
  }

  // Ajustar densidad de red neuronal
  setConnectionDistance(distance) {
    this.CONNECTION_DISTANCE = Math.max(50, Math.min(200, distance));
  }

  // Ajustar cantidad de partículas
  setParticleCount(count) {
    this.MAX_PARTICLES = Math.max(40, Math.min(150, count));
    const diff = this.MAX_PARTICLES - this.particles.length;
    
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        this.particles.push(
          new NeuralParticle(this.colorPalette, this.canvas.width, this.canvas.height)
        );
      }
    } else if (diff < 0) {
      this.particles.splice(this.MAX_PARTICLES);
    }
  }

  // Ajustar complejidad de conexiones
  setConnectionComplexity(maxConnections) {
    this.MAX_CONNECTIONS_PER_PARTICLE = Math.max(2, Math.min(8, maxConnections));
  }
}

// Uso ejemplo:
/*
const particleSystem = new ParticleSystem(canvas, colorSampler, audioAnalyzer);
particleSystem.start();

// Ajustes opcionales:
particleSystem.setParticleCount(100); // Más partículas
particleSystem.setConnectionDistance(150); // Conexiones más largas
particleSystem.setConnectionComplexity(6); // Más conexiones por partícula
*/
