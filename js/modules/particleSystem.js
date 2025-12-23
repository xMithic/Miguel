import { ColorSampler } from '../utils/colorSampler.js';

class NeuralParticle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.history = []; 
    this.MAX_HISTORY = 10;
    this.color = { r: 255, g: 255, b: 255 };
    
    // Coordenadas 2D proyectadas
    this.x2d = 0;
    this.y2d = 0;
    
    this.reset(true);
  }

  reset(isInitial = false) {
    const fov = 400;
    // Z distribuidas para profundidad
    this.z = isInitial ? Math.random() * 1200 : 800 + Math.random() * 400;
    const scale = fov / (fov + this.z);
    
    // Posición expandida
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
    // 1. Movimiento físico
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

    // Calculamos la posición 2D temporal para saber qué color le toca
    const screenX = this.x * scale + canvasWidth / 2;
    const screenY = this.y * scale + canvasHeight / 2;

    // 2. Muestreo de Color "Spatial" (Espacial)
    // Si tenemos datos del mini-canvas (buffer), buscamos el color exacto en esa posición
    if (pixelData && screenX >= 0 && screenX < canvasWidth && screenY >= 0 && screenY < canvasHeight) {
        // Mapear coordenada de pantalla (ej 1920x1080) a buffer (ej 64x64)
        const xPct = screenX / canvasWidth;
        const yPct = screenY / canvasHeight;
        
        const bufferX = Math.floor(xPct * bufferWidth);
        const bufferY = Math.floor(yPct * bufferHeight);
        
        const index = (bufferY * bufferWidth + bufferX) * 4;

        if (index >= 0 && index < pixelData.length) {
            let targetR = pixelData[index];
            let targetG = pixelData[index + 1];
            let targetB = pixelData[index + 2];

            // Brightness Boost: Asegura que no se pierdan en fondos negros
            // (Si el fondo es negro puro, las sube a un gris oscuro visible)
            const minBrightness = 40;
            const boost = 1.2;

            targetR = Math.min(255, targetR * boost + minBrightness);
            targetG = Math.min(255, targetG * boost + minBrightness);
            targetB = Math.min(255, targetB * boost + minBrightness);

            // Interpolación rápida para respuesta inmediata (0.2)
            this.color.r = this.lerp(this.color.r, targetR, 0.2);
            this.color.g = this.lerp(this.color.g, targetG, 0.2);
            this.color.b = this.lerp(this.color.b, targetB, 0.2);
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
    const alpha = depthAlpha * (0.6 + (musicState?.level||0)*0.4);

    // Dibujar Estela
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
    
    // Configuración
    this.MAX_PARTICLES = 80;
    this.CONNECTION_DISTANCE = 130;
    this.MAX_CONNECTIONS_PER_PARTICLE = 3; // Límite estricto solicitado

    // SISTEMA DE CAPTURA DE COLOR INTERNO
    // Creamos un canvas pequeño invisible para procesar el video rápido
    this.bufferCanvas = document.createElement('canvas');
    this.bufferCanvas.width = 64;  // Baja resolución es suficiente para color ambiental
    this.bufferCanvas.height = 64;
    this.bufferCtx = this.bufferCanvas.getContext('2d', { willReadFrequently: true }); // Optimización clave

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push(new NeuralParticle(this.canvas.width, this.canvas.height));
    }
    this.animate = this.animate.bind(this);
  }

  // MÉTODO NUEVO: Dibuja conexiones estables sin parpadeo
  drawConnections(musicState) {
      const level = musicState?.level || 0;
      if (level < 0.1) return;

      const reach = this.CONNECTION_DISTANCE * (1 + (musicState?.bass||0)*1.8);
      this.ctx.lineCap = 'round';

      // Para evitar parpadeos, en lugar de conectar "al primero que encuentre",
      // buscamos los vecinos CERCANOS y elegimos los 3 mejores.
      // Esto evita que las líneas salten aleatoriamente.
      
      // Nota: Iteramos sobre todas, pero solo dibujamos desde p1 hacia adelante
      // para evitar duplicar líneas y mantener rendimiento.
      
      for(let i = 0; i < this.particles.length; i++){
          const p1 = this.particles[i]; 
          if(!p1.x2d) continue;

          // 1. Encontrar candidatos válidos
          let candidates = [];
          
          for(let j = i + 1; j < this.particles.length; j++){
              const p2 = this.particles[j];
              if(!p2.x2d) continue;

              const dx = p1.x2d - p2.x2d;
              const dy = p1.y2d - p2.y2d;
              
              // Filtro rápido de caja
              if(Math.abs(dx) > reach || Math.abs(dy) > reach) continue;

              const dist = Math.sqrt(dx*dx + dy*dy);
              if(dist < reach){
                  candidates.push({ particle: p2, dist: dist });
              }
          }

          // 2. Ordenar por cercanía (ESTO SOLUCIONA EL PARPADEO)
          // Al ordenar, siempre conectamos con los más cercanos primero.
          candidates.sort((a, b) => a.dist - b.dist);

          // 3. Dibujar solo las 3 mejores conexiones
          const connectionsToDraw = Math.min(candidates.length, this.MAX_CONNECTIONS_PER_PARTICLE);

          for(let k = 0; k < connectionsToDraw; k++){
              const target = candidates[k];
              const p2 = target.particle;
              const dist = target.dist;
              
              const alpha = (1 - dist/reach) * level * 0.8;
              
              if(alpha > 0.05) {
                  this.ctx.lineWidth = (0.5 + (musicState?.bass||0)) * (1 - dist/reach);
                  
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

  animate() {
    let musicState = { bass: 0, mid: 0, treble: 0, level: 0 };
    try { if (this.audioAnalyzer) musicState = this.audioAnalyzer.getState(); } catch(e) {}
    
    // --- LÓGICA ROBUSTA DE COLOR ---
    let pixelData = null;
    try {
        // Intentamos encontrar el video fuente automáticamente
        const videoSource = this.colorSampler.video || 
                            this.colorSampler.source || 
                            this.colorSampler.element || 
                            document.querySelector('video'); // Fallback final

        if (videoSource && videoSource.readyState >= 2) {
            // Dibujamos el video en nuestro mini-canvas interno
            this.bufferCtx.drawImage(videoSource, 0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
            // Extraemos los datos de color
            const imageData = this.bufferCtx.getImageData(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
            pixelData = imageData.data;
        }
    } catch(e) {
        // Si falla (ej. CORS), las partículas seguirán funcionando en blanco/gris
        // console.warn("No se pudo muestrear video", e);
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = 'source-over'; 
    
    // Pasamos los datos del buffer interno a las partículas
    this.particles.forEach(p => p.update(
        musicState, 
        pixelData, 
        this.bufferCanvas.width, 
        this.bufferCanvas.height, 
        this.canvas.width, 
        this.canvas.height
    ));
    
    // IMPORTANTE: Primero calculamos posiciones (update), luego dibujamos conexiones, luego partículas
    // Sin sortear antes de las conexiones para evitar saltos raros en la iteración de conexiones
    
    // 1. Dibujar conexiones (Fondo)
    this.drawConnections(musicState);
    
    // 2. Ordenar partículas por profundidad (Z) para que las cercanas tapen a las lejanas
    // Hacemos una copia o reordenamos solo para el dibujo de puntos
    const sortedParticles = [...this.particles].sort((a, b) => b.z - a.z);
    
    // 3. Dibujar partículas (Frente)
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
