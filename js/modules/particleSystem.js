import { ColorSampler } from '../utils/colorSampler.js';

class LensParticle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.reset(true);
  }

  reset(isInitial = false) {
    const fov = 400;
    this.z = isInitial ? Math.random() * 1000 : 800 + Math.random() * 300;
    
    const scale = fov / (fov + this.z);
    const visibleWidth = this.width / scale;
    const visibleHeight = this.height / scale;

    this.x = (Math.random() - 0.5) * visibleWidth;
    this.y = (Math.random() - 0.5) * visibleHeight;
    
    // Movimiento más flotante y suave (menos nervioso)
    this.speed = 0.8 + Math.random() * 0.8; 
    this.angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(this.angle) * 0.4;
    this.vy = Math.sin(this.angle) * 0.4;
    
    // Tamaño base más grande para que se note el efecto de "lente"
    this.baseSize = 2.0 + Math.random() * 3.0; 
  }

  update(musicState) {
    const bass = musicState?.bass || 0;
    
    // El bajo empuja las partículas hacia el espectador
    this.z -= this.speed * (1 + bass * 2);

    this.x += this.vx;
    this.y += this.vy;

    // Reiniciar si sale de pantalla o pasa la cámara
    const fov = 400;
    const scale = fov / (fov + this.z);
    const limitX = (this.width / 2) / scale;
    const limitY = (this.height / 2) / scale;

    if (this.z < 10 || Math.abs(this.x) > limitX * 1.5 || Math.abs(this.y) > limitY * 1.5) {
      this.reset();
    }
  }

  draw(ctx, centerX, centerY, musicState) {
    const fov = 400;
    const scale = fov / (fov + this.z);
    
    this.x2d = this.x * scale + centerX;
    this.y2d = this.y * scale + centerY;
    
    const depthAlpha = Math.max(0, 1 - this.z / 1000); 
    if (depthAlpha < 0.05) return false;

    // Tamaño dinámico con la música
    const size = this.baseSize * scale * (1 + (musicState?.bass || 0) * 0.5);

    // DIBUJO DE LA "LENTE"
    // No usamos un color fijo. Usamos un gradiente blanco/gris con transparencia.
    // Al usar modos de fusión, esto "quemará" o "saturará" el video de fondo.
    
    const gradient = ctx.createRadialGradient(this.x2d, this.y2d, 0, this.x2d, this.y2d, size * 2);
    
    // Centro: Casi transparente o blanco muy suave para brillo especular
    gradient.addColorStop(0, `rgba(255, 255, 255, ${depthAlpha * 0.8})`); 
    
    // Borde: Cae a transparente
    gradient.addColorStop(1, 'rgba(128, 128, 128, 0)'); 

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x2d, this.y2d, size * 2, 0, Math.PI * 2);
    ctx.fill();
    
    return true;
  }
}

export class ParticleSystem {
  constructor(canvas, colorSampler, audioAnalyzer) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.audioAnalyzer = audioAnalyzer;
    
    this.particles = [];
    this.MAX_PARTICLES = 60; // Menos partículas pero más grandes
    this.CONNECTION_DISTANCE = 150;
    
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push(new LensParticle(this.canvas.width, this.canvas.height));
    }
    
    this.animate = this.animate.bind(this);
  }

  drawConnections(musicState) {
    const level = musicState?.level || 0;
    if (level < 0.15) return; 

    // Usaremos las líneas también como potenciadores de color
    const bassInfluence = musicState?.bass || 0;
    const dynamicReach = this.CONNECTION_DISTANCE * (1 + bassInfluence * 1.5);
    
    this.ctx.lineCap = 'round';
    
    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];
      if (p1.z > 800) continue;

      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        if (p2.z > 800) continue;

        const dx = p1.x2d - p2.x2d;
        const dy = p1.y2d - p2.y2d;
        if (Math.abs(dx) > dynamicReach || Math.abs(dy) > dynamicReach) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < dynamicReach) {
          const proximity = 1 - (dist / dynamicReach);
          const alpha = proximity * level; // Sin multiplicador 0.6 para que sea más intenso

          if (alpha > 0.1) {
            this.ctx.lineWidth = (1 + bassInfluence * 4) * proximity;
            
            // Color GRIS MEDIO (128,128,128) es neutro en modos de fusión como Overlay.
            // Blanco (255) aclara/satura. Negro (0) oscurece.
            // Usaremos blanco con transparencia para "iluminar" la conexión sobre el video.
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
            
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x2d, p1.y2d);
            this.ctx.lineTo(p2.x2d, p2.y2d);
            this.ctx.stroke();
          }
        }
      }
    }
  }

  animate() {
    let musicState = { bass: 0, mid: 0, treble: 0, level: 0 };
    try {
        if (this.audioAnalyzer) musicState = this.audioAnalyzer.getState();
    } catch(e) {}
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // --- MAGIA DE LOS MODOS DE FUSIÓN ---
    
    // 'overlay': Aumenta el contraste. Donde hay blanco, aclara. Donde hay gris, satura.
    // 'color-dodge': Quema el color, haciéndolo muy intenso (estilo neón).
    // 'soft-light': Más sutil.
    
    // Prueba 'overlay' primero. Si quieres más intensidad, cambia a 'color-dodge'.
    this.ctx.globalCompositeOperation = 'overlay'; 

    this.particles.forEach(p => p.update(musicState));
    
    // Dibujar conexiones (ahora son rayos de luz que intensifican el fondo)
    this.drawConnections(musicState);
    
    // Ordenar (aunque en overlay importa menos el orden)
    this.particles.sort((a, b) => b.z - a.z);
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    this.particles.forEach(p => {
        p.draw(this.ctx, centerX, centerY, musicState);
    });

    // Restaurar para no romper otros dibujos
    this.ctx.globalCompositeOperation = 'source-over';
    
    requestAnimationFrame(this.animate);
  }

  start() { this.animate(); }
  setConnectionDistance(d) { this.CONNECTION_DISTANCE = d; }
  setParticleCount(c) { /* lógica estándar */ }
}
