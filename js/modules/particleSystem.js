import { ColorSampler } from '../utils/colorSampler.js';

// Clase para partículas con conexiones neuronales
class NeuralParticle {
  constructor(colorPalette, width, height) {
    this.colorPalette = colorPalette;
    this.width = width;
    this.height = height;
    this.reset();
  }

  reset() {
    // Posición aleatoria en 3D
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 400;
    
    this.x = Math.cos(angle) * radius;
    this.y = Math.sin(angle) * radius;
    this.z = Math.random() * 1500 + 500;
    
    // Velocidad base y rotación
    this.baseSpeedZ = 1.5 + Math.random() * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    
    // Propiedades visuales
    this.baseSize = 1 + Math.random() * 2;
    this.color = this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    
    // Para ondulación con audio
    this.phase = Math.random() * Math.PI * 2;
    this.frequency = 0.5 + Math.random() * 1.5;
    
    // Energía para pulsos de audio
    this.energy = 0;
  }

  update(musicState, time) {
    // Sincronización perfecta con bass (graves)
    const bassImpact = musicState.bass * 6;
    const midImpact = musicState.mid * 3;
    const trebleImpact = musicState.treble * 2;
    
    // Velocidad reactiva a los graves
    const speedMultiplier = 1 + bassImpact + (musicState.impact * 10);
    this.z -= this.baseSpeedZ * speedMultiplier;
    
    // Rotación orbital reactiva a medios
    const orbitRadius = Math.sqrt(this.x * this.x + this.y * this.y);
    const currentAngle = Math.atan2(this.y, this.x);
    const newAngle = currentAngle + this.rotationSpeed * (1 + midImpact);
    
    this.x = Math.cos(newAngle) * orbitRadius * (1 + trebleImpact * 0.1);
    this.y = Math.sin(newAngle) * orbitRadius * (1 + trebleImpact * 0.1);
    
    // Ondulación sincronizada con frecuencias altas
    this.phase += 0.05 * (1 + trebleImpact);
    const waveOffset = Math.sin(this.phase) * 20 * musicState.treble;
    this.x += waveOffset;
    this.y += waveOffset;
    
    // Energía que se acumula con impactos
    this.energy += (musicState.impact * 0.5 + musicState.bass * 0.3);
    this.energy *= 0.92; // Decay suave
    
    // Reset cuando sale del campo de visión
    if (this.z < 1) {
      this.reset();
    }
  }

  draw(ctx, centerX, centerY, width, height, musicState) {
    const fov = 350;
    const scale = fov / (fov + this.z);
    
    const x2d = this.x * scale + centerX;
    const y2d = this.y * scale + centerY;
    
    // Culling optimizado
    if (x2d < -100 || x2d > width + 100 || y2d < -100 || y2d > height + 100) {
      return { x: null, y: null };
    }

    // Tamaño reactivo a música
    const energyPulse = 1 + this.energy * 2;
    const size = this.baseSize * scale * (1 + musicState.mid * 1.2) * energyPulse;
    
    // Alpha con profundidad y nivel de audio
    let alpha = 1 - (this.z / 1500);
    alpha = Math.max(0, Math.min(1, alpha));
    alpha *= (0.5 + musicState.level * 0.5 + this.energy * 0.3);

    // Núcleo de la partícula con brillo
    const glowIntensity = musicState.treble * 15 + this.energy * 20;
    if (glowIntensity > 5) {
      ctx.shadowBlur = glowIntensity;
      ctx.shadowColor = ColorSampler.rgba(this.color, alpha * 0.8);
    }
    
    ctx.fillStyle = ColorSampler.rgba(this.color, alpha);
    ctx.beginPath();
    ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
    ctx.fill();
    
    // Centro brillante en partículas energéticas
    if (this.energy > 0.5 || musicState.impact > 0.6) {
      ctx.fillStyle = ColorSampler.rgba({ r: 255, g: 255, b: 255 }, alpha * 0.7);
      ctx.beginPath();
      ctx.arc(x2d, y2d, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.shadowBlur = 0;
    
    return { x: x2d, y: y2d, alpha, scale, size };
  }
}

// Sistema de partículas con conexiones neuronales
export class ParticleSystem {
  constructor(canvas, colorSampler, audioAnalyzer) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    this.colorSampler = colorSampler;
    this.audioAnalyzer = audioAnalyzer;
    
    this.particles = [];
    this.MAX_PARTICLES = 150;
    this.CONNECTION_DISTANCE = 180; // Distancia para conexiones neuronales
    this.MAX_CONNECTIONS = 3; // Conexiones máximas por partícula
    
    // Pool de colores
    this.colorPalette = [];
    for (let i = 0; i < 12; i++) {
      this.colorPalette.push(colorSampler.sampleColor());
    }
    
    // Actualizar paleta dinámicamente
    setInterval(() => {
      const idx = Math.floor(Math.random() * this.colorPalette.length);
      this.colorPalette[idx] = colorSampler.sampleColor();
    }, 400);
    
    // Inicializar partículas
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push(
        new NeuralParticle(this.colorPalette, this.canvas.width, this.canvas.height)
      );
    }
    
    this.lastTime = performance.now();
    this.time = 0;
    this.animate = this.animate.bind(this);
  }

  drawNeuralConnections(positions, musicState) {
    // Conexiones que reaccionan a frecuencias medias
    const connectionIntensity = musicState.mid * 2 + musicState.bass * 1.5;
    const maxDistance = this.CONNECTION_DISTANCE * (1 + musicState.impact * 0.5);
    
    this.ctx.lineCap = 'round';
    this.ctx.globalCompositeOperation = 'lighter';
    
    for (let i = 0; i < positions.length; i++) {
      const p1 = positions[i];
      if (!p1.x) continue;
      
      let connectionCount = 0;
      
      for (let j = i + 1; j < positions.length; j++) {
        if (connectionCount >= this.MAX_CONNECTIONS) break;
        
        const p2 = positions[j];
        if (!p2.x) continue;
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < maxDistance) {
          // Opacidad basada en distancia y música
          const distanceRatio = 1 - (distance / maxDistance);
          let lineAlpha = distanceRatio * 0.4 * (p1.alpha + p2.alpha) / 2;
          lineAlpha *= (0.6 + connectionIntensity);
          
          // Grosor reactivo
          const lineWidth = (1 + musicState.bass * 2) * distanceRatio * 2;
          
          // Color mezclado entre las dos partículas
          const avgColor = {
            r: (p1.color.r + p2.color.r) / 2,
            g: (p1.color.g + p2.color.g) / 2,
            b: (p1.color.b + p2.color.b) / 2
          };
          
          // Gradiente para efecto neural
          const gradient = this.ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          gradient.addColorStop(0, ColorSampler.rgba(p1.color, lineAlpha));
          gradient.addColorStop(0.5, ColorSampler.rgba(avgColor, lineAlpha * 1.5));
          gradient.addColorStop(1, ColorSampler.rgba(p2.color, lineAlpha));
          
          this.ctx.strokeStyle = gradient;
          this.ctx.lineWidth = lineWidth;
          
          // Glow en conexiones energéticas
          if (musicState.impact > 0.5 || musicState.bass > 0.6) {
            this.ctx.shadowBlur = 10 * musicState.impact;
            this.ctx.shadowColor = ColorSampler.rgba(avgColor, lineAlpha);
          }
          
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
          
          this.ctx.shadowBlur = 0;
          
          connectionCount++;
        }
      }
    }
    
    this.ctx.globalCompositeOperation = 'source-over';
  }

  drawEnergyWaves(musicState) {
    // Ondas de energía desde el centro cuando hay impactos fuertes
    if (musicState.impact > 0.7 || musicState.bass > 0.8) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const waveCount = 3;
      
      this.ctx.globalCompositeOperation = 'screen';
      
      for (let i = 0; i < waveCount; i++) {
        const radius = (this.time * 200 + i * 100) % 600;
        const alpha = (1 - radius / 600) * musicState.impact * 0.3;
        
        if (alpha > 0.05) {
          const hue = (this.time * 50 + i * 60) % 360;
          this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
          this.ctx.lineWidth = 2 + musicState.bass * 3;
          this.ctx.shadowBlur = 15;
          this.ctx.shadowColor = `hsla(${hue}, 100%, 50%, ${alpha * 0.8})`;
          
          this.ctx.beginPath();
          this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          this.ctx.stroke();
        }
      }
      
      this.ctx.shadowBlur = 0;
      this.ctx.globalCompositeOperation = 'source-over';
    }
  }

  animate(currentTime) {
    const musicState = this.audioAnalyzer.getState();
    
    // Control de framerate
    const deltaTime = currentTime - this.lastTime;
    if (deltaTime < 16) {
      requestAnimationFrame(this.animate);
      return;
    }
    this.lastTime = currentTime;
    this.time += deltaTime / 1000;

    // Limpieza completa
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Dibujar ondas de energía de fondo
    this.drawEnergyWaves(musicState);
    
    // Array para almacenar posiciones para conexiones
    const positions = [];
    
    // Actualizar y dibujar partículas
    this.particles.forEach(particle => {
      particle.update(musicState, this.time);
      const pos = particle.draw(
        this.ctx, 
        centerX, 
        centerY, 
        this.canvas.width, 
        this.canvas.height, 
        musicState
      );
      
      if (pos.x !== null) {
        positions.push({
          x: pos.x,
          y: pos.y,
          alpha: pos.alpha,
          color: particle.color,
          scale: pos.scale
        });
      }
    });
    
    // Dibujar conexiones neuronales
    this.drawNeuralConnections(positions, musicState);
    
    requestAnimationFrame(this.animate);
  }

  start() {
    this.animate(performance.now());
  }

  // Cambiar densidad de partículas dinámicamente
  setParticleCount(count) {
    this.MAX_PARTICLES = Math.max(50, Math.min(300, count));
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
  
  // Cambiar distancia de conexión
  setConnectionDistance(distance) {
    this.CONNECTION_DISTANCE = Math.max(50, Math.min(300, distance));
  }
}
