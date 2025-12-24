import { ColorSampler } from '../utils/colorSampler.js';

// ==========================================
// 1. CLASE NEURAL PARTICLE (Lógica interna)
// ==========================================
class NeuralParticle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.history = []; 
    this.MAX_HISTORY = 10;
    // Inician en negro para evitar flashes blancos
    this.color = { r: 0, g: 0, b: 0 };
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

  lerp(start, end, amt) { return (1 - amt) * start + amt * end; }

  update(musicState, pixelData, bufferWidth, bufferHeight, canvasWidth, canvasHeight) {
    // --- 1. Física y Movimiento ---
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

    // --- 2. Lógica de Color (Efecto Negativo) ---
    if (pixelData && bufferWidth > 0) {
        if (screenX >= 0 && screenX < canvasWidth && screenY >= 0 && screenY < canvasHeight) {
            
            const pctX = screenX / canvasWidth;
            const pctY = screenY / canvasHeight;
            
            const bufferX = Math.floor(pctX * bufferWidth);
            const bufferY = Math.floor(pctY * bufferHeight);
            
            const index = (bufferY * bufferWidth + bufferX) * 4;

            if (index >= 0 && index < pixelData.length) {
                let targetR = pixelData[index];
                let targetG = pixelData[index + 1];
                let targetB = pixelData[index + 2];

                // Calculamos brillo promedio (0-255)
                const brightness = (targetR + targetG + targetB) / 3;
                
                let finalR, finalG, finalB;

                // === REGLA DE NEGATIVO ===
                // Si el fondo es blanco/claro (>180), la partícula se vuelve NEGRA
                if (brightness > 180) {
                    finalR = 0;
                    finalG = 0;
                    finalB = 0;
                } else {
                    // Si el fondo es oscuro o de color, la partícula brilla
                    const boost = 1.3; 
                    finalR = Math.min(255, targetR * boost);
                    finalG = Math.min(255, targetG * boost);
                    finalB = Math.min(255, targetB * boost);
                }

                // Interpolación rápida (0.4) para que reaccione al instante
                this.color.r = this.lerp(this.color.r, finalR, 0.4);
                this.color.g = this.lerp(this.color.g, finalG, 0.4);
                this.color.b = this.lerp(this.color.b, finalB, 0.4);
            }
        }
    }

    // Historial
    if (this.x2d && this.y2d) {
        this.history.push({ x: this.x2d, y: this.y2d });
        if (this.history.length > this.MAX_HISTORY) this.history.shift();
    }

    // Reset si sale de límites
    if (this.z < 10 || Math.abs(this.x) > (this.width/2)/scale * 1.2) {
        this.reset();
    }
  }

  draw(ctx, centerX, centerY, musicState) {
    const fov = 400;
    const scale = fov / (fov + this.z);
    
    this.x2d = this.x * scale + centerX;
    this.y2d = this.y * scale + centerY;
    
    const depthAlpha = Math.pow(Math.max(0, 1 - this.z / 1200), 1.5); 
    if (depthAlpha < 0.01) return false;

    const r = Math.floor(this.color.r);
    const g = Math.floor(this.color.g);
    const b = Math.floor(this.color.b);
    
    // Alpha base + reactividad al audio
    const alpha = depthAlpha * (0.8 + (musicState?.level||0)*0.2);

    // Dibujar Estela
    if (this.history.length > 2) {
        ctx.beginPath();
        ctx.moveTo(this.history[0].x, this.history[0].y);
        for (let i = 1; i < this.history.length; i++) ctx.lineTo(this.history[i].x, this.history[i].y);
        ctx.lineTo(this.x2d, this.y2d);
        ctx.lineCap = 'round';
        ctx.lineWidth = this.baseSize * scale * 0.8;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`;
        ctx.stroke();
    }

    const size = Math.max(0.5, this.baseSize * scale * (1 + (musicState?.bass || 0)));
    
    // Dibujar Núcleo
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(this.x2d, this.y2d, size, 0, Math.PI * 2);
    ctx.fill();
    
    return true;
  }
}

// ==========================================
// 2. CLASE PARTICLE SYSTEM
// ==========================================
export class ParticleSystem {
  constructor(canvas, colorSampler, audioAnalyzer) {
    this.canvas = canvas;
    // IMPORTANTE: alpha true para ver el video de fondo a través del canvas
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.colorSampler = colorSampler;
    this.audioAnalyzer = audioAnalyzer;
    this.particles = [];
    
    this.MAX_PARTICLES = 80; // Cantidad de partículas
    this.CONNECTION_DISTANCE = 130;
    this.MAX_CONNECTIONS_PER_PARTICLE = 3; 

    // Inicializamos las partículas
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push(new NeuralParticle(this.canvas.width, this.canvas.height));
    }
    
    // Bind para animaciones
    this.animate = this.animate.bind(this);
  }

  drawConnections(musicState) {
      const level = musicState?.level || 0;
      if (level < 0.1) return;

      const reach = this.CONNECTION_DISTANCE * (1 + (musicState?.bass||0)*1.8);
      this.ctx.lineCap = 'round';

      for(let i = 0; i < this.particles.length; i++){
          const p1 = this.particles[i]; 
          if(!p1.x2d) continue;

          // NO CONECTAR SI ES NEGRO (Evita líneas negras cruzando zonas blancas)
          // Suma RGB < 30 es prácticamente negro
          if ((p1.color.r + p1.color.g + p1.color.b) < 30) continue;

          let candidates = [];
          
          for(let j = i + 1; j < this.particles.length; j++){
              const p2 = this.particles[j];
              if(!p2.x2d) continue;
              
              // Tampoco conectar con partículas negras
              if ((p2.color.r + p2.color.g + p2.color.b) < 30) continue;

              const dx = p1.x2d - p2.x2d;
              const dy = p1.y2d - p2.y2d;
              
              if(Math.abs(dx) > reach || Math.abs(dy) > reach) continue;

              const dist = Math.sqrt(dx*dx + dy*dy);
              if(dist < reach){
                  candidates.push({ particle: p2, dist: dist });
              }
          }

          // Ordenar por distancia
          candidates.sort((a, b) => a.dist - b.dist);

          const connectionsToDraw = Math.min(candidates.length, this.MAX_CONNECTIONS_PER_PARTICLE);

          for(let k = 0; k < connectionsToDraw; k++){
              const target = candidates[k];
              const p2 = target.particle;
              const dist = target.dist;
              
              const alpha = (1 - dist/reach) * level * 0.8;
              
              if(alpha > 0.05) {
                  this.ctx.lineWidth = (0.5 + (musicState?.bass||0)) * (1 - dist/reach);
                  
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
    let bufferW = 0; 
    let bufferH = 0;

    try {
        if (this.colorSampler) {
            // Obtenemos los datos del ColorSampler externo
            pixelData = this.colorSampler.getPixelData();
            bufferW = this.colorSampler.width;
            bufferH = this.colorSampler.height;
        }
    } catch(e) {}

    // IMPORTANTE: Limpiamos el canvas para que sea transparente
    // Esto permite que se vea el <video id="background-layer"> que pusiste en el HTML
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = 'source-over'; 
    
    this.particles.forEach(p => p.update(
        musicState, 
        pixelData, 
        bufferW, 
        bufferH, 
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
