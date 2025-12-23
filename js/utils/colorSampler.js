// ==========================================
// 1. CLASE COLOR SAMPLER (OPTIMIZADA)
// ==========================================
export class ColorSampler {
  constructor(videoElement) {
    this.videoElement = videoElement;
    // Usamos OffscreenCanvas para rendimiento
    this.width = 64;
    this.height = 64;
    this.smCanvas = new OffscreenCanvas(this.width, this.height);
    this.smCtx = this.smCanvas.getContext('2d', { willReadFrequently: true });
    // NOTA: Eliminamos el setInterval de 180ms. 
    // La actualización la controlará el ParticleSystem frame a frame.
  }

  // Método nuevo: Devuelve TODOS los píxeles del frame actual
  getPixelData() {
    const video = this.videoElement;
    if (video && video.readyState >= 2) {
      // Dibujamos el video reducido
      this.smCtx.drawImage(video, 0, 0, this.width, this.height);
      // Devolvemos los datos brutos (R,G,B,A, R,G,B,A...)
      return this.smCtx.getImageData(0, 0, this.width, this.height).data;
    }
    return null;
  }
}

// ==========================================
// 2. CLASE NEURAL PARTICLE
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

  // Recibe los datos de píxeles (pixelData) y dimensiones del buffer (64x64)
  update(musicState, pixelData, bufferW, bufferH, canvasW, canvasH) {
    // --- Física ---
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
    
    // Calculamos dónde está la partícula en la pantalla (Screen coordinates)
    const screenX = this.x * scale + canvasW / 2;
    const screenY = this.y * scale + canvasH / 2;

    // --- Lógica de Color Espacial ---
    if (pixelData && screenX >= 0 && screenX < canvasW && screenY >= 0 && screenY < canvasH) {
        // Mapeamos: Coordenada Pantalla (ej 1920) -> Coordenada Buffer (64)
        const bx = Math.floor((screenX / canvasW) * bufferW);
        const by = Math.floor((screenY / canvasH) * bufferH);
        
        // Obtenemos el índice del array de píxeles
        const index = (by * bufferW + bx) * 4;

        if (index >= 0 && index < pixelData.length) {
            let tr = pixelData[index];
            let tg = pixelData[index + 1];
            let tb = pixelData[index + 2];

            // Brightness Boost (Evitar negro invisible)
            const boost = 1.3; 
            const min = 35;
            tr = Math.min(255, tr * boost + min);
            tg = Math.min(255, tg * boost + min);
            tb = Math.min(255, tb * boost + min);

            // Interpolación rápida (0.2) para que el color cambie casi al instante
            this.color.r = this.lerp(this.color.r, tr, 0.2);
            this.color.g = this.lerp(this.color.g, tg, 0.2);
            this.color.b = this.lerp(this.color.b, tb, 0.2);
        }
    }

    if (this.x2d && this.y2d) {
        this.history.push({ x: this.x2d, y: this.y2d });
        if (this.history.length > this.MAX_HISTORY) this.history.shift();
    }

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

// ==========================================
// 3. CLASE PARTICLE SYSTEM (PRINCIPAL)
// ==========================================
export class ParticleSystem {
  constructor(canvas, colorSampler, audioAnalyzer) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.colorSampler = colorSampler;
    this.audioAnalyzer = audioAnalyzer;
    this.particles = [];
    
    this.MAX_PARTICLES = 80;
    this.CONNECTION_DISTANCE = 130;
    this.MAX_CONNECTIONS_PER_PARTICLE = 3; // Límite estricto a 3 líneas

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push(new NeuralParticle(this.canvas.width, this.canvas.height));
    }
    this.animate = this.animate.bind(this);
  }

  // Dibuja conexiones estables (sin parpadeo)
  drawConnections(musicState) {
      const level = musicState?.level || 0;
      if (level < 0.1) return;

      const reach = this.CONNECTION_DISTANCE * (1 + (musicState?.bass||0)*1.8);
      this.ctx.lineCap = 'round';

      for(let i = 0; i < this.particles.length; i++){
          const p1 = this.particles[i]; 
          if(!p1.x2d) continue;

          // 1. Buscamos TODOS los candidatos posibles
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

          // 2. Ordenamos por distancia (Lo más cercano primero)
          // Esto evita el parpadeo porque siempre elegimos las mismas conexiones
          candidates.sort((a, b) => a.dist - b.dist);

          // 3. Limitamos a 3 líneas
          const count = Math.min(candidates.length, this.MAX_CONNECTIONS_PER_PARTICLE);

          for(let k = 0; k < count; k++){
              const target = candidates[k];
              const p2 = target.particle;
              const dist = target.dist;
              const alpha = (1 - dist/reach) * level * 0.8;
              
              if(alpha > 0.05) {
                  this.ctx.lineWidth = (0.5 + (musicState?.bass||0)) * (1 - dist/reach);
                  // Gradiente de línea entre los dos colores de las partículas
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
    
    // --- OBTENCIÓN DE DATOS DE COLOR ---
    // Llamamos directamente al método optimizado en cada frame
    let pixelData = null;
    let bufferW = 64; 
    let bufferH = 64;

    try {
        if (this.colorSampler) {
            // Asumimos que colorSampler tiene width/height definidos, sino usamos 64 por defecto
            bufferW = this.colorSampler.width || 64;
            bufferH = this.colorSampler.height || 64;
            pixelData = this.colorSampler.getPixelData();
        }
    } catch(e) {}

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = 'source-over'; 
    
    // Actualizamos partículas pasando los datos de color de este frame
    this.particles.forEach(p => p.update(
        musicState, 
        pixelData, 
        bufferW, 
        bufferH, 
        this.canvas.width, 
        this.canvas.height
    ));
    
    this.drawConnections(musicState);
    
    // Z-Sort para profundidad
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
