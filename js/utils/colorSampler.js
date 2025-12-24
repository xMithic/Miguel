import { ColorSampler } from '../utils/colorSampler.js';

// ==========================================
// CLASE 1: LA PARTÍCULA (El Actor)
// ==========================================
class NeuralParticle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.history = []; 
    this.MAX_HISTORY = 10;
    this.color = { r: 255, g: 255, b: 255 };
    this.x2d = 0;
    this.y2d = 0;
    this.reset(true);
  }

  reset(isInitial = false) {
    const fov = 400;
    // Distribuimos las partículas en profundidad (Z)
    this.z = isInitial ? Math.random() * 1200 : 800 + Math.random() * 400;
    const scale = fov / (fov + this.z);
    
    // Posición expandida para llenar pantallas grandes
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

  update(musicState, pixelData, bufferW, bufferH, canvasW, canvasH) {
    // --- EFECTO "BULLET TIME" (BRUTAL) ---
    const bass = musicState?.bass || 0;
    const level = musicState?.level || 0;
    
    // Si la música está tranquila, el tiempo se congela (0.2x)
    // Si explota el bajo, el tiempo acelera (hasta 3.0x)
    const timeScale = level < 0.1 ? 0.2 : 1 + bass * 2.0;

    // Aplicamos el timeScale a TODO el movimiento
    this.z -= this.speed * timeScale;
    
    const turnSpeed = (Math.random() - 0.5) * 0.1 * (1 + (musicState?.mid||0));
    this.vx = Math.cos(this.angle + turnSpeed) * 0.5; // Base speed fija
    this.vy = Math.sin(this.angle + turnSpeed) * 0.5;
    
    this.x += this.vx * timeScale; 
    this.y += this.vy * timeScale;

    // --- PROYECCIÓN 3D A 2D ---
    const fov = 400;
    const scale = fov / (fov + this.z);
    const screenX = this.x * scale + canvasW / 2;
    const screenY = this.y * scale + canvasH / 2;

    // --- COLOR INTELIGENTE Y RÁPIDO ---
    if (pixelData && bufferW > 0) {
        if(screenX >= 0 && screenX < canvasW && screenY >= 0 && screenY < canvasH) {
            
            // Mapeo coordenadas pantalla -> coordenadas video
            const pctX = screenX / canvasW;
            const pctY = screenY / canvasH;
            const bufX = Math.floor(pctX * bufferW);
            const bufY = Math.floor(pctY * bufferH);
            const index = (bufY * bufferW + bufX) * 4;

            if (index >= 0 && index < pixelData.length) {
                const tr = pixelData[index];
                const tg = pixelData[index + 1];
                const tb = pixelData[index + 2];

                // Detectamos cambios bruscos (Cortes de cámara)
                const diff = Math.abs(tr - this.color.r) + Math.abs(tg - this.color.g) + Math.abs(tb - this.color.b);
                
                // Velocidad de reacción variable
                let reactionSpeed = 0.1;
                if (diff > 50) reactionSpeed = 0.6;      // Corte de cámara -> Instantáneo
                else if (diff > 15) reactionSpeed = 0.25; // Movimiento -> Rápido
                else reactionSpeed = 0.08;                // Ruido -> Suave

                // Boost de color para que no se vea apagado
                const boost = 1.2; 
                const floor = 25;
                const finalR = Math.min(255, tr * boost + floor);
                const finalG = Math.min(255, tg * boost + floor);
                const finalB = Math.min(255, tb * boost + floor);

                this.color.r = this.lerp(this.color.r, finalR, reactionSpeed);
                this.color.g = this.lerp(this.color.g, finalG, reactionSpeed);
                this.color.b = this.lerp(this.color.b, finalB, reactionSpeed);
            }
        }
    }

    // Historial para estelas
    if (this.x2d && this.y2d) {
        this.history.push({ x: this.x2d, y: this.y2d });
        if (this.history.length > this.MAX_HISTORY) this.history.shift();
    }

    // Reset si se sale o pasa detrás de la cámara
    if (this.z < 10 || Math.abs(this.x) > (this.width/2)/scale * 1.2) {
        this.reset();
    }
  }

  draw(ctx, centerX, centerY, musicState) {
    const fov = 400;
    const scale = fov / (fov + this.z);
    this.x2d = this.x * scale + centerX;
    this.y2d = this.y * scale + centerY;
    
    // Profundidad de campo (desaparece si está muy lejos)
    const depthAlpha = Math.pow(Math.max(0, 1 - this.z / 1200), 1.5); 
    if (depthAlpha < 0.01) return false;

    const r = Math.floor(this.color.r);
    const g = Math.floor(this.color.g);
    const b = Math.floor(this.color.b);
    const alpha = depthAlpha * (0.8 + (musicState?.level||0)*0.2);

    // Dibujar Estela
    if (this.history.length > 2) {
        ctx.beginPath();
        ctx.moveTo(this.history[0].x, this.history[0].y);
        for (let i = 1; i < this.history.length; i++) ctx.lineTo(this.history[i].x, this.history[i].y);
        ctx.lineTo(this.x2d, this.y2d);
        ctx.lineCap = 'round';
        ctx.lineWidth = this.baseSize * scale * 0.8;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.4})`; // Estela más sutil
        ctx.stroke();
    }

    // Tamaño reactivo al bajo
    const size = Math.max(0.5, this.baseSize * scale * (1 + (musicState?.bass || 0) * 1.5));
    
    // Glow (Resplandor)
    if ((musicState?.level || 0) > 0.1) {
      const glowSize = size * 3;
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

// ==========================================
// CLASE 2: EL SISTEMA (El Director)
// ==========================================
export class ParticleSystem {
  constructor(canvas, colorSampler, audioAnalyzer) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.colorSampler = colorSampler;
    this.audioAnalyzer = audioAnalyzer;
    this.particles = [];
    
    // Configuración Minimalista
    this.MAX_PARTICLES = 80;        // Cantidad justa, no saturada
    this.CONNECTION_DISTANCE = 140; // Distancia media
    this.MAX_CONNECTIONS_PER_PARTICLE = 3; // Pocas líneas para limpieza visual

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push(new NeuralParticle(this.canvas.width, this.canvas.height));
    }
    this.animate = this.animate.bind(this);
  }

  drawConnections(musicState) {
      const level = musicState?.level || 0;
      if (level < 0.05) return; // Si no hay música, no hay líneas (minimalismo extremo)

      const bass = musicState?.bass || 0;
      // Las líneas se estiran con el bajo
      const reach = this.CONNECTION_DISTANCE * (1 + bass * 1.5);
      this.ctx.lineCap = 'round';

      for(let i = 0; i < this.particles.length; i++){
          const p1 = this.particles[i]; 
          if(!p1.x2d) continue;

          // Búsqueda de vecinos
          let candidates = [];
          for(let j = i + 1; j < this.particles.length; j++){
              const p2 = this.particles[j];
              if(!p2.x2d) continue;
              const dx = p1.x2d - p2.x2d;
              const dy = p1.y2d - p2.y2d;
              if(Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if(dist < reach){
                  candidates.push({ particle: p2, dist: dist });
              }
          }

          // Ordenar para estabilidad (anti-parpadeo)
          candidates.sort((a, b) => a.dist - b.dist);
          const count = Math.min(candidates.length, this.MAX_CONNECTIONS_PER_PARTICLE);

          for(let k = 0; k < count; k++){
              const target = candidates[k];
              const p2 = target.particle;
              const dist = target.dist;
              const alpha = (1 - dist/reach) * level * 0.7;
              
              if(alpha > 0.05) {
                  const lineWidth = (0.5 + bass) * (1 - dist/reach);
                  this.ctx.lineWidth = lineWidth;

                  // --- EFECTO ABERRACIÓN CROMÁTICA (GLITCH) ---
                  // Solo ocurre si el bajo golpea fuerte (> 0.4)
                  if (bass > 0.4) {
                      const offset = bass * 4; // Desplazamiento
                      
                      // Canal ROJO desplazado
                      this.ctx.strokeStyle = `rgba(255, 50, 50, ${alpha * 0.6})`;
                      this.ctx.beginPath();
                      this.ctx.moveTo(p1.x2d - offset, p1.y2d - offset);
                      this.ctx.lineTo(p2.x2d - offset, p2.y2d - offset);
                      this.ctx.stroke();

                      // Canal CYAN desplazado
                      this.ctx.strokeStyle = `rgba(50, 255, 255, ${alpha * 0.6})`;
                      this.ctx.beginPath();
                      this.ctx.moveTo(p1.x2d + offset, p1.y2d + offset);
                      this.ctx.lineTo(p2.x2d + offset, p2.y2d + offset);
                      this.ctx.stroke();
                  }

                  // Línea Principal (Color Real)
                  const grad = this.ctx.createLinearGradient(p1.x2d, p1.y2d, p2.x2d, p2.y2d);
                  grad.addColorStop(0, `rgba(${p1.color.r},${p1.color.g},${p1.color.b},${alpha})`);
                  grad.addColorStop(1, `rgba(${p2.color.r},${p2.color.g},${p2.color.b},${alpha})`);
                  
                  this.ctx.strokeStyle = grad;
                  this.ctx.beginPath();
                  this.ctx.moveTo(p1.x2d, p1.y2d);
                  this.ctx.lineTo(p2.x2d, p2.y2d);
                  this.ctx.stroke();
              }
          }
      }
  }

  animate() {
    let musicState = { bass: 0, mid: 0, treble: 0, level: 0 };
    try { if (this.audioAnalyzer) musicState = this.audioAnalyzer.getState(); } catch(e) {}
    
    // Obtener datos visuales
    let pixelData = null;
    let bufferW = 0; 
    let bufferH = 0;

    try {
        if (this.colorSampler) {
            pixelData = this.colorSampler.getPixelData();
            bufferW = this.colorSampler.width;
            bufferH = this.colorSampler.height;
        }
    } catch(e) {}

    // Limpiar canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = 'source-over'; 
    
    // 1. Actualizar (Física + Color)
    this.particles.forEach(p => p.update(
        musicState, 
        pixelData, 
        bufferW, 
        bufferH, 
        this.canvas.width, 
        this.canvas.height
    ));
    
    // 2. Dibujar Conexiones (Fondo)
    this.drawConnections(musicState);
    
    // 3. Dibujar Partículas (Frente, ordenadas por Z)
    const sortedParticles = [...this.particles].sort((a, b) => b.z - a.z);
    sortedParticles.forEach(p => p.draw(this.ctx, this.canvas.width/2, this.canvas.height/2, musicState));
    
    requestAnimationFrame(this.animate);
  }

  start() { this.animate(); }
  
  resize(width, height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.particles.forEach(p => { p.width = width; p.height = height; });
  }
}
