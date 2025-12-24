import { ColorSampler } from '../utils/colorSampler.js';

class NeuralParticle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.history = []; 
    this.MAX_HISTORY = 10;
    // Iniciamos con colores aleatorios para que no se vean todas blancas al inicio
    this.color = { 
        r: Math.random() * 255, 
        g: Math.random() * 255, 
        b: Math.random() * 255 
    };
    
    this.x2d = 0;
    this.y2d = 0;
    
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

  // Función lerp estándar
  lerp(start, end, amt) { return (1 - amt) * start + amt * end; }

  update(musicState, pixelData, bufferWidth, bufferHeight, canvasWidth, canvasHeight) {
    // 1. Movimiento físico (sin cambios)
    const bass = musicState?.bass || 0;
    const mid = musicState?.mid || 0;

    this.z -= this.speed * (1 + bass * 3);
    
    const turnSpeed = (Math.random() - 0.5) * 0.1 * (1 + mid);
    const moveSpeed = 0.5 * (1 + mid * 2);
    this.vx = Math.cos(this.angle + turnSpeed) * moveSpeed;
    this.vy = Math.sin(this.angle + turnSpeed) * moveSpeed;
    this.x += this.vx; 
    this.y += this.vy;

    const fov = 400;
    const scale = fov / (fov + this.z);

    const screenX = this.x * scale + canvasWidth / 2;
    const screenY = this.y * scale + canvasHeight / 2;

    // 2. Muestreo de Color "Spatial" (MEJORADO PARA VELOCIDAD)
    if (pixelData && screenX >= 0 && screenX < canvasWidth && screenY >= 0 && screenY < canvasHeight) {
        
        // Mapeo directo de coordenadas pantalla -> buffer
        // Usamos Math.floor para obtener el píxel entero más cercano rápidamente
        const xPct = screenX / canvasWidth;
        const yPct = screenY / canvasHeight;
        
        const bufferX = Math.floor(xPct * bufferWidth);
        const bufferY = Math.floor(yPct * bufferHeight);
        
        // Cálculo del índice en el array Uint8ClampedArray (RGBA = 4 valores)
        const index = (bufferY * bufferWidth + bufferX) * 4;

        if (index >= 0 && index < pixelData.length) {
            let targetR = pixelData[index];
            let targetG = pixelData[index + 1];
            let targetB = pixelData[index + 2];

            // Brightness Boost ajustado: Más sensible al color original
            const minBrightness = 20; // Reducido para permitir colores oscuros si el video es oscuro
            const boost = 1.3;        // Aumentado ligeramente para vividez

            targetR = Math.min(255, targetR * boost + minBrightness);
            targetG = Math.min(255, targetG * boost + minBrightness);
            targetB = Math.min(255, targetB * boost + minBrightness);

            // --- CAMBIO CLAVE AQUÍ ---
            // Velocidad de reacción: 
            // 0.05 = muy lento (suave)
            // 0.2  = medio
            // 0.8  = muy rápido (casi instantáneo)
            // Usamos 0.5 para un equilibrio entre rapidez y evitar "ruido" excesivo
            const reactionSpeed = 0.5; 

            this.color.r = this.lerp(this.color.r, targetR, reactionSpeed);
            this.color.g = this.lerp(this.color.g, targetG, reactionSpeed);
            this.color.b = this.lerp(this.color.b, targetB, reactionSpeed);
        }
    }

    // Historial y Reset (sin cambios mayores)
    if (this.x2d && this.y2d) {
        this.history.push({ x: this.x2d, y: this.y2d });
        if (this.history.length > this.MAX_HISTORY) this.history.shift();
    }

    if (this.z < 10 || Math.abs(this.x) > (this.width/2)/scale * 1.2) {
        this.reset();
    }
  }

  draw(ctx, centerX, centerY, musicState) {
    // ... (El resto de tu método draw está bien, no requiere cambios para el color)
    const fov = 400;
    const scale = fov / (fov + this.z);
    
    this.x2d = this.x * scale + centerX;
    this.y2d = this.y * scale + centerY;
    
    const depthAlpha = Math.pow(Math.max(0, 1 - this.z / 1200), 1.5); 
    if (depthAlpha < 0.01) return false;

    // Usamos Math.round para dibujar, es ligeramente más rápido que floor en algunos motores
    const r = Math.round(this.color.r);
    const g = Math.round(this.color.g);
    const b = Math.round(this.color.b);
    const alpha = depthAlpha * (0.6 + (musicState?.level||0)*0.4);

    if (this.history.length > 2) {
        ctx.beginPath();
        ctx.moveTo(this.history[0].x, this.history[0].y);
        for (let i = 1; i < this.history.length; i++) ctx.lineTo(this.history[i].x, this.history[i].y);
        ctx.lineTo(this.x2d, this.y2d);
        ctx.lineCap = 'round';
        ctx.lineWidth = this.baseSize * scale * 0.8;
        // La estela hereda el color actual rápidamente
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`;
        ctx.stroke();
    }

    const size = Math.max(0.5, this.baseSize * scale * (1 + (musicState?.bass || 0)));
    
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
    
    this.MAX_PARTICLES = 100; // Puedes aumentar esto ligeramente si quieres más densidad
    this.CONNECTION_DISTANCE = 130;
    this.MAX_CONNECTIONS_PER_PARTICLE = 3; 

    // Aumentamos resolución del buffer para mayor precisión de color
    // 64x64 es muy poco, los colores se mezclan mucho. 
    // 128x128 o 200x200 da mejor detalle individual.
    this.bufferCanvas = document.createElement('canvas');
    this.bufferCanvas.width = 150;  
    this.bufferCanvas.height = 150;
    this.bufferCtx = this.bufferCanvas.getContext('2d', { willReadFrequently: true });

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push(new NeuralParticle(this.canvas.width, this.canvas.height));
    }
    this.animate = this.animate.bind(this);
  }

  drawConnections(musicState) {
      // ... (Tu lógica de conexiones está perfecta, mantenla igual)
      const level = musicState?.level || 0;
      if (level < 0.1) return;

      const reach = this.CONNECTION_DISTANCE * (1 + (musicState?.bass||0)*1.8);
      this.ctx.lineCap = 'round';

      for(let i = 0; i < this.particles.length; i++){
          const p1 = this.particles[i]; 
          if(!p1.x2d) continue;

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

          candidates.sort((a, b) => a.dist - b.dist);

          const connectionsToDraw = Math.min(candidates.length, this.MAX_CONNECTIONS_PER_PARTICLE);

          for(let k = 0; k < connectionsToDraw; k++){
              const target = candidates[k];
              const p2 = target.particle;
              const dist = target.dist;
              
              const alpha = (1 - dist/reach) * level * 0.8;
              
              if(alpha > 0.05) {
                  this.ctx.lineWidth = (0.5 + (musicState?.bass||0)) * (1 - dist/reach);
                  
                  // Gradiente entre las dos partículas para conexiones suaves
                  const grad = this.ctx.createLinearGradient(p1.x2d, p1.y2d, p2.x2d, p2.y2d);
                  grad.addColorStop(0, `rgba(${Math.floor(p1.color.r)}, ${Math.floor(p1.color.g)}, ${Math.floor(p1.color.b)}, ${alpha})`);
                  grad.addColorStop(1, `rgba(${Math.floor(p2.color.r)}, ${Math.floor(p2.color.g)}, ${Math.floor(p2.color.b)}, ${alpha})`);

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
    
    let pixelData = null;
    try {
        const videoSource = this.colorSampler.video || 
                            this.colorSampler.source || 
                            this.colorSampler.element || 
                            document.querySelector('video');

        if (videoSource && videoSource.readyState >= 2) {
            this.bufferCtx.drawImage(videoSource, 0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
            const imageData = this.bufferCtx.getImageData(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
            pixelData = imageData.data;
        }
    } catch(e) {}

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = 'source-over'; 
    
    this.particles.forEach(p => p.update(
        musicState, 
        pixelData, 
        this.bufferCanvas.width, 
        this.bufferCanvas.height, 
        this.canvas.width, 
        this.canvas.height
    ));
    
    this.drawConnections(musicState);
    
    const sortedParticles = [...this.particles].sort((a, b) => b.z - a.z);
    
    sortedParticles.forEach(p => p.draw(this.ctx, this.canvas.width/2, this.canvas.height/2, musicState));
    
    requestAnimationFrame(this.animate);
  }

  start() { this.animate(); }
  setConnectionDistance(d) { this.CONNECTION_DISTANCE = d; }
  
  resize(width, height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.particles.forEach(p => {
          p.width = width;
          p.height = height;
      });
  }
}
