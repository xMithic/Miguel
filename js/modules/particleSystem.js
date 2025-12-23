// Opción B: Cálculo manual (Solo JS)
import { ColorSampler } from '../utils/colorSampler.js';

class NeuralParticle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.history = []; 
    this.MAX_HISTORY = 10;
    this.color = { r: 255, g: 0, b: 0 }; // Color debug inicial
    this.reset(true);
  }

  reset(isInitial = false) {
    // ... misma lógica de reset ...
    const fov = 400;
    this.z = isInitial ? Math.random() * 1200 : 800 + Math.random() * 400;
    const scale = fov / (fov + this.z);
    this.x = (Math.random() - 0.5) * (this.width / scale);
    this.y = (Math.random() - 0.5) * (this.height / scale);
    this.speed = 0.5 + Math.random() * 1.5; 
    this.angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(this.angle) * 0.5;
    this.vy = Math.sin(this.angle) * 0.5;
    this.baseSize = 0.6 + Math.random() * 1.4; 
    this.history = [];
  }

  lerp(start, end, amt) { return (1 - amt) * start + amt * end; }

  update(musicState, bgColor) {
    // --- LÓGICA DE NEGATIVO CORREGIDA ---
    if (bgColor && bgColor.r !== undefined) {
        // 1. Calcular negativo matemático
        let negR = 255 - bgColor.r;
        let negG = 255 - bgColor.g;
        let negB = 255 - bgColor.b;

        // 2. CORRECCIÓN DE CONTRASTE (Si el negativo es aburrido, lo forzamos)
        // Si el video es gris, el negativo es gris. Esto lo evita.
        // Saturamos el color alejándolo del gris medio (128)
        negR = (negR - 128) * 1.5 + 128;
        negG = (negG - 128) * 1.5 + 128;
        negB = (negB - 128) * 1.5 + 128;
        
        // Clampear valores 0-255
        negR = Math.max(0, Math.min(255, negR));
        negG = Math.max(0, Math.min(255, negG));
        negB = Math.max(0, Math.min(255, negB));

        // Interpolación para suavidad
        this.color.r = this.lerp(this.color.r, negR, 0.1);
        this.color.g = this.lerp(this.color.g, negG, 0.1);
        this.color.b = this.lerp(this.color.b, negB, 0.1);
    }

    // ... misma lógica de movimiento update ...
    if (this.x2d && this.y2d) {
        this.history.push({ x: this.x2d, y: this.y2d });
        if (this.history.length > this.MAX_HISTORY) this.history.shift();
    }
    const bass = musicState?.bass || 0;
    const mid = musicState?.mid || 0;
    this.z -= this.speed * (1 + bass * 3);
    const turnSpeed = (Math.random() - 0.5) * 0.1 * (1 + mid);
    const moveSpeed = 0.5 * (1 + mid * 2);
    this.vx = Math.cos(this.angle + turnSpeed) * moveSpeed;
    this.vy = Math.sin(this.angle + turnSpeed) * moveSpeed;
    this.x += this.vx; this.y += this.vy;
    
    const fov = 400;
    const scale = fov / (fov + this.z);
    if (this.z < 10 || Math.abs(this.x) > (this.width/2)/scale * 1.2) {
        this.reset();
        // Al resetear, forzar color inmediato para no flashear
        if(bgColor) {
             this.color.r = 255 - bgColor.r;
             this.color.g = 255 - bgColor.g;
             this.color.b = 255 - bgColor.b;
        }
    }
  }

  draw(ctx, centerX, centerY, musicState) {
    // ... misma lógica draw ...
    const fov = 400;
    const scale = fov / (fov + this.z);
    this.x2d = this.x * scale + centerX;
    this.y2d = this.y * scale + centerY;
    const depthAlpha = Math.pow(Math.max(0, 1 - this.z / 1200), 1.5); 
    if (depthAlpha < 0.01) return false;

    const r = Math.floor(this.color.r);
    const g = Math.floor(this.color.g);
    const b = Math.floor(this.color.b);
    const alpha = depthAlpha * (0.6 + (musicState?.level||0)*0.4);

    if (this.history.length > 2) {
        ctx.beginPath();
        ctx.moveTo(this.history[0].x, this.history[0].y);
        for (let i = 1; i < this.history.length; i++) ctx.lineTo(this.history[i].x, this.history[i].y);
        ctx.lineTo(this.x2d, this.y2d);
        ctx.lineCap = 'round';
        ctx.lineWidth = this.baseSize * scale * 0.8;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`;
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

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
    this.currentColor = { r: 0, g: 0, b: 0 }; 

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push(new NeuralParticle(this.canvas.width, this.canvas.height));
    }
    this.animate = this.animate.bind(this);
  }

  drawConnections(musicState) {
      // ... Copia tu drawConnections aquí ...
      // Asegúrate de usar this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      // calculando r,g,b como promedio de p1.color y p2.color
      const level = musicState?.level || 0;
      if (level < 0.1) return;
      const reach = this.CONNECTION_DISTANCE * (1 + (musicState?.bass||0)*1.8);
      this.ctx.lineCap = 'round';
      for(let i=0; i<this.particles.length; i++){
          const p1 = this.particles[i]; if(!p1.x2d) continue;
          for(let j=i+1; j<this.particles.length; j++){
              const p2 = this.particles[j]; if(!p2.x2d) continue;
              const dx = p1.x2d - p2.x2d; const dy = p1.y2d - p2.y2d;
              if(Math.abs(dx)>reach || Math.abs(dy)>reach) continue;
              const dist = Math.sqrt(dx*dx+dy*dy);
              if(dist < reach){
                  const alpha = (1 - dist/reach) * level * 0.8;
                  if(alpha > 0.05) {
                      this.ctx.lineWidth = (0.5 + (musicState?.bass||0))* (1-dist/reach);
                      const r = Math.floor((p1.color.r+p2.color.r)/2);
                      const g = Math.floor((p1.color.g+p2.color.g)/2);
                      const b = Math.floor((p1.color.b+p2.color.b)/2);
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
    let musicState = { bass: 0, mid: 0, treble: 0, level: 0 };
    try { if (this.audioAnalyzer) musicState = this.audioAnalyzer.getState(); } catch(e) {}
    
    try {
        if (this.colorSampler) {
            const sampled = this.colorSampler.sampleColor(); 
            // Validación extra: Si devuelve negro/undefined, ignorar
            if (sampled && (sampled.r>0 || sampled.g>0 || sampled.b>0)) {
                this.currentColor = sampled;
            }
        }
    } catch(e) {}

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = 'source-over'; 
    this.particles.forEach(p => p.update(musicState, this.currentColor));
    this.drawConnections(musicState);
    this.particles.sort((a, b) => b.z - a.z);
    this.particles.forEach(p => p.draw(this.ctx, this.canvas.width/2, this.canvas.height/2, musicState));
    requestAnimationFrame(this.animate);
  }

  start() { this.animate(); }
  setConnectionDistance(d) { this.CONNECTION_DISTANCE = d; }
  setParticleCount(c) { /*...*/ }
}
