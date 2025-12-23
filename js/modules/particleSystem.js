import { ColorSampler } from '../utils/colorSampler.js';

class NeuralParticle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.history = []; 
    this.MAX_HISTORY = 10;
    
    // Color inicial blanco
    this.color = { r: 255, g: 255, b: 255 }; 
    
    this.reset(true);
  }

  reset(isInitial = false) {
    const fov = 400;
    this.z = isInitial ? Math.random() * 1200 : 800 + Math.random() * 400;
    
    const scale = fov / (fov + this.z);
    const visibleWidth = this.width / scale;
    const visibleHeight = this.height / scale;

    this.x = (Math.random() - 0.5) * visibleWidth;
    this.y = (Math.random() - 0.5) * visibleHeight;
    
    this.speed = 0.5 + Math.random() * 1.5; 
    this.angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(this.angle) * 0.5;
    this.vy = Math.sin(this.angle) * 0.5;
    
    this.baseSize = 0.6 + Math.random() * 1.4; 
    this.history = [];
  }

  // FUNCIÓN DE SUAVIZADO (La clave para quitar el parpadeo)
  lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }

  update(musicState, targetColor) {
    // 1. CAMBIO DE COLOR SUAVE (FIX DEL PARPADEO)
    // En lugar de copiar a lo bruto, nos acercamos un 10% (0.1) al color objetivo en cada frame.
    if (targetColor && targetColor.r !== undefined) {
        this.color.r = this.lerp(this.color.r, targetColor.r, 0.1);
        this.color.g = this.lerp(this.color.g, targetColor.g, 0.1);
        this.color.b = this.lerp(this.color.b, targetColor.b, 0.1);
    }

    // Guardar historial
    if (this.x2d && this.y2d) {
        this.history.push({ x: this.x2d, y: this.y2d });
        if (this.history.length > this.MAX_HISTORY) this.history.shift();
    }

    const bass = musicState?.bass || 0;
    const mid = musicState?.mid || 0;

    const speedMult = 1 + bass * 3; 
    this.z -= this.speed * speedMult;
    
    const turnSpeed = (Math.random() - 0.5) * 0.1 * (1 + mid);
    const currentAngle = Math.atan2(this.vy, this.vx);
    const newAngle = currentAngle + turnSpeed;
    
    const moveSpeed = 0.5 * (1 + mid * 2);
    this.vx = Math.cos(newAngle) * moveSpeed;
    this.vy = Math.sin(newAngle) * moveSpeed;

    this.x += this.vx;
    this.y += this.vy;

    const fov = 400;
    const scale = fov / (fov + this.z);
    const limitX = (this.width / 2) / scale;
    const limitY = (this.height / 2) / scale;

    if (this.z < 10 || Math.abs(this.x) > limitX * 1.2 || Math.abs(this.y) > limitY * 1.2) {
      this.reset();
      // Al reiniciar, sí copiamos el color directo para que no nazca blanca
      if(targetColor) this.color = { ...targetColor };
    }
  }

  draw(ctx, centerX, centerY, musicState) {
    const fov = 400;
    const scale = fov / (fov + this.z);
    
    this.x2d = this.x * scale + centerX;
    this.y2d = this.y * scale + centerY;
    
    const depthAlpha = Math.pow(Math.max(0, 1 - this.z / 1200), 1.5); 
    const musicAlpha = 0.4 + (musicState?.level || 0) * 0.6;
    const alpha = depthAlpha * musicAlpha;
    
    if (alpha < 0.01) return false;

    // Aseguramos que los valores sean enteros para mejor rendimiento de renderizado
    const r = Math.floor(this.color.r);
    const g = Math.floor(this.color.g);
    const b = Math.floor(this.color.b);

    // Estela (Trail)
    if (this.history.length > 2) {
        ctx.beginPath();
        ctx.moveTo(this.history[0].x, this.history[0].y);
        for (let i = 1; i < this.history.length; i++) ctx.lineTo(this.history[i].x, this.history[i].y);
        ctx.lineTo(this.x2d, this.y2d);
        ctx.lineCap = 'round';
        ctx.lineWidth = this.baseSize * scale * 0.8;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.4})`;
        ctx.stroke();
    }

    const size = Math.max(0.5, this.baseSize * scale * (1 + (musicState?.bass || 0)));
    
    // Glow
    if ((musicState?.level || 0) > 0.2) {
      const glowSize = size * 4;
      const gradient = ctx.createRadialGradient(this.x2d, this.y2d, 0, this.x2d, this.y2d, glowSize);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x2d, this.y2d, glowSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Núcleo (Añadimos un poco de blanco al color base para que brille pero mantenga el tono)
    ctx.fillStyle = `rgba(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(this.x2d, this.y2d, size, 0, Math.PI * 2);
    ctx.fill();
    
    return true;
  }
}

export class ParticleSystem {
  constructor(canvas, colorSampler, audioAnalyzer) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.colorSampler = colorSampler;
    this.audioAnalyzer = audioAnalyzer;
    
    this.particles = [];
    this.MAX_PARTICLES = 80;
    this.CONNECTION_DISTANCE = 130;
    this.MAX_CONNECTIONS_PER_PARTICLE = 4;
    
    this.currentColor = { r: 255, g: 255, b: 255 };

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push(new NeuralParticle(this.canvas.width, this.canvas.height));
    }
    
    this.animate = this.animate.bind(this);
  }

  drawConnections(musicState) {
    const level = musicState?.level || 0;
    if (level < 0.1) return; 

    const bassInfluence = musicState?.bass || 0;
    const dynamicReach = this.CONNECTION_DISTANCE * (1 + bassInfluence * 1.8);
    
    this.ctx.lineCap = 'round';
    
    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];
      if (!p1.x2d || p1.z > 900) continue;

      let connectionsMade = 0;

      for (let j = i + 1; j < this.particles.length; j++) {
        if (connectionsMade >= this.MAX_CONNECTIONS_PER_PARTICLE) break;
        const p2 = this.particles[j];
        if (!p2.x2d || p2.z > 900) continue;

        const dx = p1.x2d - p2.x2d;
        const dy = p1.y2d - p2.y2d;
        if (Math.abs(dx) > dynamicReach || Math.abs(dy) > dynamicReach) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < dynamicReach) {
          connectionsMade++;
          const proximity = 1 - (dist / dynamicReach);
          let alpha = proximity * level * 0.6;
          if ((musicState?.impact || 0) > 0.5) alpha += 0.3;
          
          const width = (0.2 + bassInfluence * 1.5) * proximity;

          if (alpha > 0.05) {
            this.ctx.lineWidth = width;
            
            const r = Math.floor((p1.color.r + p2.color.r) / 2);
            const g = Math.floor((p1.color.g + p2.color.g) / 2);
            const b = Math.floor((p1.color.b + p2.color.b) / 2);
            
            this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            
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
    let musicState = { bass: 0, mid: 0, treble: 0, level: 0, impact: 0 };
    try {
        if (this.audioAnalyzer) musicState = this.audioAnalyzer.getState();
    } catch(e) {}
    
    // Obtener color (intentar que sea el dominante o un promedio si es posible en el sampler)
    try {
        if (this.colorSampler) {
            const sampled = this.colorSampler.sampleColor(); 
            if (sampled && sampled.r !== undefined) {
                // Pequeña corrección: si el sampler devuelve negros puros por error, ignorar
                if (sampled.r + sampled.g + sampled.b > 10) {
                    this.currentColor = sampled;
                }
            }
        }
    } catch(e) {}

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = 'lighter'; 

    // Aquí es donde sucede la magia del suavizado
    this.particles.forEach(p => p.update(musicState, this.currentColor));
    
    this.drawConnections(musicState);
    
    this.particles.sort((a, b) => b.z - a.z);
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    this.particles.forEach(p => {
        p.draw(this.ctx, centerX, centerY, musicState);
    });

    this.ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(this.animate);
  }

  start() { this.animate(); }
  setConnectionDistance(d) { this.CONNECTION_DISTANCE = d; }
  setParticleCount(c) { 
      const current = this.particles.length;
      if(c > current) {
          for(let i=0; i<c-current; i++) this.particles.push(new NeuralParticle(this.canvas.width, this.canvas.height));
      } else {
          this.particles.length = c;
      }
  }
}
