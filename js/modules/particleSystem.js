// Opción B: Cálculo manual (Solo JS) - CÓDIGO COMPLETO
import { ColorSampler } from '../utils/colorSampler.js';

class NeuralParticle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.history = []; 
    this.MAX_HISTORY = 10;
    this.color = { r: 255, g: 255, b: 255 }; // Blanco inicial neutro
    this.reset(true);
  }

  reset(isInitial = false) {
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

  // Función de interpolación lineal
  lerp(start, end, amt) { 
    return (1 - amt) * start + amt * end; 
  }

  update(musicState, bgColor) {
    // =========================================================
    // LÓGICA DE COLOR OPTIMIZADA (Sincronización vs Parpadeo)
    // =========================================================
    if (bgColor && bgColor.r !== undefined) {
        // 1. Color Base: Usamos el color del video directo (sin invertir/negativo)
        let targetR = bgColor.r;
        let targetG = bgColor.g;
        let targetB = bgColor.b;

        // 2. Brightness Boost (Mejora de visibilidad)
        // Evita que las partículas sean negras invisibles si el video es oscuro.
        // Aumenta el brillo un 20% y asegura un piso mínimo de luz (40).
        const brighten = 1.2; 
        const minLight = 40;  
        
        targetR = Math.min(255, targetR * brighten + minLight);
        targetG = Math.min(255, targetG * brighten + minLight);
        targetB = Math.min(255, targetB * brighten + minLight);

        // 3. Anti-Parpadeo Adaptativo
        // Calculamos cuánto cambia el color respecto al frame anterior.
        const diff = Math.abs(targetR - this.color.r) + 
                     Math.abs(targetG - this.color.g) + 
                     Math.abs(targetB - this.color.b);
        
        // Si el cambio es grande (cambio de escena), cambiamos rápido (0.3).
        // Si es pequeño (ruido de video), cambiamos lento (0.1) para suavizar.
        const lerpFactor = diff > 50 ? 0.3 : 0.1; 

        this.color.r = this.lerp(this.color.r, targetR, lerpFactor);
        this.color.g = this.lerp(this.color.g, targetG, lerpFactor);
        this.color.b = this.lerp(this.color.b, targetB, lerpFactor);
    }

    // =========================================================
    // LÓGICA DE MOVIMIENTO
    // =========================================================
    if (this.x2d && this.y2d) {
        this.history.push({ x: this.x2d, y: this.y2d });
        if (this.history.length > this.MAX_HISTORY) this.history.shift();
    }

    const bass = musicState?.bass || 0;
    const mid = musicState?.mid || 0;

    // Movimiento en Z (hacia la cámara)
    this.z -= this.speed * (1 + bass * 3);
    
    // Movimiento ondulante
    const turnSpeed = (Math.random() - 0.5) * 0.1 * (1 + mid);
    const moveSpeed = 0.5 * (1 + mid * 2);
    this.vx = Math.cos(this.angle + turnSpeed) * moveSpeed;
    this.vy = Math.sin(this.angle + turnSpeed) * moveSpeed;
    this.x += this.vx; 
    this.y += this.vy;
    
    // Reset si sale de pantalla o pasa la cámara
    const fov = 400;
    const scale = fov / (fov + this.z);
    
    // Condición de reinicio
    if (this.z < 10 || Math.abs(this.x) > (this.width/2)/scale * 1.2) {
        this.reset();
        // Al resetear, podemos forzar el color actual para evitar "pop-in" visual
        // pero mantenemos el calculado arriba para suavidad.
    }
  }

  draw(ctx, centerX, centerY, musicState) {
    const fov = 400;
    const scale = fov / (fov + this.z);
    this.x2d = this.x * scale + centerX;
    this.y2d = this.y * scale + centerY;
    
    // Profundidad (Depth of Field simulado)
    const depthAlpha = Math.pow(Math.max(0, 1 - this.z / 1200), 1.5); 
    if (depthAlpha < 0.01) return false;

    const r = Math.floor(this.color.r);
    const g = Math.floor(this.color.g);
    const b = Math.floor(this.color.b);
    const alpha = depthAlpha * (0.6 + (musicState?.level||0)*0.4);

    // Dibujar Estela (Trail)
    if (this.history.length > 2) {
        ctx.beginPath();
        ctx.moveTo(this.history[0].x, this.history[0].y);
        for (let i = 1; i < this.history.length; i++) {
            ctx.lineTo(this.history[i].x, this.history[i].y);
        }
        ctx.lineTo(this.x2d, this.y2d);
        ctx.lineCap = 'round';
        ctx.lineWidth = this.baseSize * scale * 0.8;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`;
        ctx.stroke();
    }

    const size = Math.max(0.5, this.baseSize * scale * (1 + (musicState?.bass || 0)));
    
    // Dibujar Glow (Resplandor)
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

    // Dibujar Núcleo
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
      const level = musicState?.level || 0;
      if (level < 0.1) return; // Optimización: no dibujar si no hay música

      const reach = this.CONNECTION_DISTANCE * (1 + (musicState?.bass||0)*1.8);
      this.ctx.lineCap = 'round';

      for(let i = 0; i < this.particles.length; i++){
          const p1 = this.particles[i]; 
          if(!p1.x2d) continue;

          // Loop anidado optimizado (j = i + 1) para no duplicar líneas
          for(let j = i + 1; j < this.particles.length; j++){
              const p2 = this.particles[j]; 
              if(!p2.x2d) continue;

              const dx = p1.x2d - p2.x2d; 
              const dy = p1.y2d - p2.y2d;
              
              // Pre-chequeo rápido con valor absoluto (más rápido que sqrt)
              if(Math.abs(dx) > reach || Math.abs(dy) > reach) continue;

              const dist = Math.sqrt(dx*dx + dy*dy);
              if(dist < reach){
                  const alpha = (1 - dist/reach) * level * 0.8;
                  
                  if(alpha > 0.05) {
                      this.ctx.lineWidth = (0.5 + (musicState?.bass||0)) * (1 - dist/reach);
                      
                      // Color promedio entre las dos partículas conectadas
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
    let musicState = { bass: 0, mid: 0, treble: 0, level: 0 };
    
    // Obtener estado del audio
    try { 
        if (this.audioAnalyzer) musicState = this.audioAnalyzer.getState(); 
    } catch(e) {}
    
    // Muestrear color del video
    try {
        if (this.colorSampler) {
            const sampled = this.colorSampler.sampleColor(); 
            // Validación: Si devuelve negro puro o undefined, ignoramos para no apagar todo
            if (sampled && (sampled.r > 5 || sampled.g > 5 || sampled.b > 5)) {
                this.currentColor = sampled;
            }
        }
    } catch(e) {}

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = 'source-over'; 
    
    // Actualizar todas las partículas
    this.particles.forEach(p => p.update(musicState, this.currentColor));
    
    // Dibujar conexiones (detrás de las partículas)
    this.drawConnections(musicState);
    
    // Ordenar por profundidad (Z-sort) para que las lejanas se pinten primero
    this.particles.sort((a, b) => b.z - a.z);
    
    // Dibujar partículas
    this.particles.forEach(p => p.draw(this.ctx, this.canvas.width/2, this.canvas.height/2, musicState));
    
    requestAnimationFrame(this.animate);
  }

  start() { this.animate(); }
  setConnectionDistance(d) { this.CONNECTION_DISTANCE = d; }
  
  // Método útil para redimensionar si la ventana cambia
  resize(width, height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.particles.forEach(p => {
          p.width = width;
          p.height = height;
      });
  }
}
