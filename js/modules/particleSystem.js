import { ColorSampler } from '../utils/colorSampler.js';

// Partícula con debug
class NeuralParticle {
  constructor(colorPalette, width, height) {
    this.colorPalette = colorPalette;
    this.width = width;
    this.height = height;
    this.connections = [];
    this.reset();
  }

  reset() {
    // Spawn más cerca del centro para asegurar visibilidad
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 150; // Reducido
    
    this.x = Math.cos(angle) * radius;
    this.y = Math.sin(angle) * radius;
    this.z = 400 + Math.random() * 400; // Más cerca
    
    this.speed = 1 + Math.random() * 1.5;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    
    // Partículas más visibles para debug
    this.baseSize = 1.5 + Math.random() * 2; // MÁS GRANDES
    this.color = this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    
    this.pulse = 0;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.8 + Math.random() * 0.4;
  }

  update(musicState) {
    const speedMult = 1 + (musicState?.bass || 0) * 2 + (musicState?.impact || 0) * 4;
    this.z -= this.speed * speedMult;
    
    this.x += this.vx * (1 + (musicState?.mid || 0) * 2);
    this.y += this.vy * (1 + (musicState?.mid || 0) * 2);
    
    this.pulsePhase += 0.05 * this.pulseSpeed;
    const naturalPulse = Math.sin(this.pulsePhase) * 0.2;
    const musicPulse = (musicState?.bass || 0) * 0.6 + (musicState?.mid || 0) * 0.3 + (musicState?.impact || 0) * 1.2;
    this.pulse = naturalPulse + musicPulse;
    
    if (this.z < 10 || Math.abs(this.x) > 800 || Math.abs(this.y) > 800) {
      this.reset();
    }
  }

  draw(ctx, centerX, centerY, musicState) {
    const fov = 400;
    const scale = fov / (fov + this.z);
    
    this.x2d = Math.floor(this.x * scale + centerX);
    this.y2d = Math.floor(this.y * scale + centerY);
    
    const size = Math.max(2, this.baseSize * scale * (1 + this.pulse * 0.5));
    
    const depthAlpha = Math.max(0, Math.min(1, 1 - this.z / 1200));
    const musicLevel = musicState?.level || 0.5; // Default si no hay música
    const alpha = depthAlpha * (0.6 + musicLevel * 0.4); // Alpha mínimo aumentado
    
    if (alpha < 0.05) return false;
    
    // Glow
    if (musicLevel > 0.2) {
      const glowSize = size * (2 + (musicState?.impact || 0) * 2);
      const glowAlpha = alpha * 0.3 * musicLevel;
      
      const gradient = ctx.createRadialGradient(this.x2d, this.y2d, 0, this.x2d, this.y2d, glowSize);
      
      // Usar color directamente si ColorSampler falla
      const colorStr = this.color.r !== undefined 
        ? `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${glowAlpha})`
        : `rgba(255, 255, 255, ${glowAlpha})`;
      
      gradient.addColorStop(0, colorStr);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x2d, this.y2d, glowSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Núcleo - Fallback a blanco si no hay color
    const coreColor = this.color.r !== undefined
      ? `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha})`
      : `rgba(255, 255, 255, ${alpha})`;
    
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.arc(this.x2d, this.y2d, size, 0, Math.PI * 2);
    ctx.fill();
    
    return true;
  }

  distance2D(other) {
    if (!this.x2d || !other.x2d) return Infinity;
    const dx = this.x2d - other.x2d;
    const dy = this.y2d - other.y2d;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export class ParticleSystem {
  constructor(canvas, colorSampler, audioAnalyzer) {
    console.log('🎨 Inicializando ParticleSystem...');
    console.log('Canvas:', canvas.width, 'x', canvas.height);
    
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { 
      alpha: true, 
      desynchronized: true,
      willReadFrequently: false 
    });
    
    if (!this.ctx) {
      console.error('❌ No se pudo obtener contexto 2D del canvas');
      return;
    }
    
    this.colorSampler = colorSampler;
    this.audioAnalyzer = audioAnalyzer;
    
    this.particles = [];
    this.MAX_PARTICLES = 80;
    this.CONNECTION_DISTANCE = 120;
    this.MAX_CONNECTIONS_PER_PARTICLE = 5;
    
    // Generar colores con fallback
    this.colorPalette = [];
    try {
      for (let i = 0; i < 10; i++) {
        const color = colorSampler?.sampleColor() || { r: 100 + i * 15, g: 150, b: 255 };
        this.colorPalette.push(color);
      }
      console.log('✅ Paleta generada:', this.colorPalette.length, 'colores');
    } catch(e) {
      console.warn('⚠️ Error generando paleta, usando colores por defecto');
      // Colores por defecto
      this.colorPalette = [
        { r: 100, g: 150, b: 255 },
        { r: 255, g: 100, b: 150 },
        { r: 150, g: 255, b: 100 },
        { r: 255, g: 200, b: 100 }
      ];
    }
    
    // Actualizar paleta
    if (colorSampler) {
      setInterval(() => {
        try {
          const idx = Math.floor(Math.random() * this.colorPalette.length);
          this.colorPalette[idx] = colorSampler.sampleColor();
        } catch(e) {
          console.warn('Error actualizando paleta:', e);
        }
      }, 1000);
    }
    
    // Crear partículas
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push(
        new NeuralParticle(this.colorPalette, this.canvas.width, this.canvas.height)
      );
    }
    
    console.log('✅ Creadas', this.particles.length, 'partículas');
    
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.animate = this.animate.bind(this);
  }

  drawConnections(musicState) {
    const connectionIntensity = Math.max(0.3, musicState?.level || 0.5);
    const sortedParticles = [...this.particles].sort((a, b) => b.z - a.z);
    
    let totalConnections = 0;
    
    for (let i = 0; i < sortedParticles.length; i++) {
      const p1 = sortedParticles[i];
      if (!p1.x2d) continue;
      
      let connectionCount = 0;
      
      for (let j = i + 1; j < Math.min(i + 20, sortedParticles.length); j++) {
        if (connectionCount >= this.MAX_CONNECTIONS_PER_PARTICLE) break;
        
        const p2 = sortedParticles[j];
        if (!p2.x2d) continue;
        
        const dist = p1.distance2D(p2);
        
        if (dist < this.CONNECTION_DISTANCE) {
          connectionCount++;
          totalConnections++;
          
          const distanceRatio = 1 - (dist / this.CONNECTION_DISTANCE);
          const baseAlpha = distanceRatio * 0.3;
          const pulseAlpha = baseAlpha * (0.5 + (musicState?.bass || 0) * 0.5 + (musicState?.impact || 0) * 0.8);
          const alpha = pulseAlpha * connectionIntensity;
          
          const baseWidth = 0.5;
          const width = baseWidth * (1 + (musicState?.bass || 0) * 1.5 + (musicState?.impact || 0) * 2);
          
          const mixedColor = this.mixColors(p1.color, p2.color);
          const lineColor = mixedColor.r !== undefined
            ? `rgba(${mixedColor.r}, ${mixedColor.g}, ${mixedColor.b}, ${alpha})`
            : `rgba(255, 255, 255, ${alpha})`;
          
          this.ctx.strokeStyle = lineColor;
          this.ctx.lineWidth = width;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x2d, p1.y2d);
          this.ctx.lineTo(p2.x2d, p2.y2d);
          this.ctx.stroke();
        }
      }
    }
    
    // Debug cada 60 frames
    if (this.frameCount % 60 === 0 && totalConnections > 0) {
      console.log('🔗 Conexiones dibujadas:', totalConnections);
    }
  }

  mixColors(color1, color2) {
    return {
      r: Math.floor((color1.r + color2.r) / 2),
      g: Math.floor((color1.g + color2.g) / 2),
      b: Math.floor((color1.b + color2.b) / 2)
    };
  }

  drawFlash(musicState) {
    if ((musicState?.impact || 0) > 0.6) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const flashAlpha = ((musicState?.impact || 0) - 0.6) * 0.12;
      
      const gradient = this.ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, 300 + (musicState?.bass || 0) * 200
      );
      
      const flashColor = this.colorPalette[0];
      const color1 = flashColor.r !== undefined
        ? `rgba(${flashColor.r}, ${flashColor.g}, ${flashColor.b}, ${flashAlpha})`
        : `rgba(255, 255, 255, ${flashAlpha})`;
      const color2 = flashColor.r !== undefined
        ? `rgba(${flashColor.r}, ${flashColor.g}, ${flashColor.b}, ${flashAlpha * 0.3})`
        : `rgba(255, 255, 255, ${flashAlpha * 0.3})`;
      
      gradient.addColorStop(0, color1);
      gradient.addColorStop(0.5, color2);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  drawEdgePulse(musicState) {
    if ((musicState?.beat || (musicState?.impact || 0) > 0.7)) {
      const pulseAlpha = (musicState?.impact || 0) * 0.15;
      const pulseColor = this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
      
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
      
      const gradient = this.ctx.createRadialGradient(
        centerX, centerY, maxRadius * 0.6,
        centerX, centerY, maxRadius
      );
      
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      const edgeColor = pulseColor.r !== undefined
        ? `rgba(${pulseColor.r}, ${pulseColor.g}, ${pulseColor.b}, ${pulseAlpha})`
        : `rgba(255, 255, 255, ${pulseAlpha})`;
      gradient.addColorStop(1, edgeColor);
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  animate(currentTime) {
    // Obtener estado de música con fallback
    let musicState;
    try {
      musicState = this.audioAnalyzer?.getState() || {
        bass: 0.3,
        mid: 0.2,
        treble: 0.1,
        level: 0.5,
        impact: 0,
        beat: false
      };
    } catch(e) {
      musicState = { bass: 0.3, mid: 0.2, treble: 0.1, level: 0.5, impact: 0, beat: false };
    }
    
    const deltaTime = currentTime - this.lastTime;
    if (deltaTime < 16) {
      requestAnimationFrame(this.animate);
      return;
    }
    this.lastTime = currentTime;
    this.frameCount++;

    // Debug inicial
    if (this.frameCount === 1) {
      console.log('🎬 Primera frame renderizada');
      console.log('MusicState:', musicState);
    }

    // Limpiar canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Efectos de fondo
    this.drawFlash(musicState);
    this.drawEdgePulse(musicState);
    
    // Modo brillo
    this.ctx.globalCompositeOperation = 'lighter';
    
    // Actualizar partículas
    let visibleParticles = 0;
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles[i].update(musicState);
      if (this.particles[i].z < 800) visibleParticles++;
    }
    
    // Debug cada 60 frames
    if (this.frameCount % 60 === 0) {
      console.log('👁️ Partículas visibles:', visibleParticles, '/', this.MAX_PARTICLES);
    }
    
    // Dibujar conexiones
    this.ctx.lineCap = 'round';
    this.drawConnections(musicState);
    
    // Dibujar partículas
    let drawnCount = 0;
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const drawn = this.particles[i].draw(this.ctx, centerX, centerY, musicState);
      if (drawn) drawnCount++;
    }
    
    // Debug inicial
    if (this.frameCount === 1) {
      console.log('✏️ Partículas dibujadas:', drawnCount);
    }
    
    this.ctx.globalCompositeOperation = 'source-over';
    
    requestAnimationFrame(this.animate);
  }

  start() {
    console.log('▶️ Iniciando animación...');
    this.animate(performance.now());
  }

  setConnectionDistance(distance) {
    this.CONNECTION_DISTANCE = Math.max(50, Math.min(200, distance));
    console.log('🔗 Distancia de conexión:', this.CONNECTION_DISTANCE);
  }

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
    console.log('🔢 Total partículas:', this.particles.length);
  }

  setConnectionComplexity(maxConnections) {
    this.MAX_CONNECTIONS_PER_PARTICLE = Math.max(2, Math.min(8, maxConnections));
    console.log('🕸️ Complejidad:', this.MAX_CONNECTIONS_PER_PARTICLE, 'conexiones/partícula');
  }
}
