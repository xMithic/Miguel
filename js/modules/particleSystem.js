import { ColorSampler } from '../utils/colorSampler.js';

class NeuralParticle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.history = []; 
    this.MAX_HISTORY = 10;
    this.color = { r: 255, g: 255, b: 255 };
    // Variables para la posición 2D proyectada (necesarias para leer el color)
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

  // AHORA RECIBE 'pixelData' (array de todos los píxeles) y dimensiones del video fuente
  update(musicState, pixelData, srcWidth, srcHeight, canvasWidth, canvasHeight) {
    // 1. PRIMERO Calculamos la posición futura para saber DÓNDE leer el color
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
    
    // Proyección 2D temporal para muestreo de color
    // (Centrada en pantalla)
    const tempX2d = this.x * scale + canvasWidth / 2;
    const tempY2d = this.y * scale + canvasHeight / 2;

    // 2. LÓGICA DE COLOR INDEPENDIENTE
    // Si tenemos datos de píxeles y la partícula está dentro de la pantalla
    if (pixelData && tempX2d >= 0 && tempX2d < canvasWidth && tempY2d >= 0 && tempY2d < canvasHeight) {
        
        // Mapear coordenadas de pantalla -> coordenadas de video fuente
        // (Por si el video fuente tiene diferente tamaño que el canvas de partículas)
        const vidX = Math.floor((tempX2d / canvasWidth) * srcWidth);
        const vidY = Math.floor((tempY2d / canvasHeight) * srcHeight);
        
        // Índice en el array Uint8ClampedArray (R, G, B, A por cada pixel)
        const index = (vidY * srcWidth + vidX) * 4;

        if (index >= 0 && index < pixelData.length) {
            let targetR = pixelData[index];
            let targetG = pixelData[index + 1];
            let targetB = pixelData[index + 2];

            // Brightness Boost (Evitar negro invisible)
            const brighten = 1.3; 
            const minLight = 30;  
            targetR = Math.min(255, targetR * brighten + minLight);
            targetG = Math.min(255, targetG * brighten + minLight);
            targetB = Math.min(255, targetB * brighten + minLight);

            // Interpolación suave individual
            this.color.r = this.lerp(this.color.r, targetR, 0.1);
            this.color.g = this.lerp(this.color.g, targetG, 0.1);
            this.color.b = this.lerp(this.color.b, targetB, 0.1);
        }
    }

    // Lógica de historial
    if (this.x2d && this.y2d) {
        this.history.push({ x: this.x2d, y: this.y2d });
        if (this.history.length > this.MAX_HISTORY) this.history.shift();
    }

    // Reset si se sale
    if (this.z < 10 || Math.abs(this.x) > (this.width/2)/scale * 1.2) {
        this.reset();
    }
  }

  draw(ctx, centerX, centerY, musicState) {
    const fov = 400;
    const scale = fov / (fov + this.z);
    
    // Guardamos la posición 2D real para usarla en conexiones y update siguiente
    this.x2d = this.x * scale + centerX;
    this.y2d = this.y * scale + centerY;
    
    const depthAlpha = Math.pow(Math.max(0, 1 - this.z / 1200), 1.5); 
    if (depthAlpha < 0.01) return false;

    const r = Math.floor(this.color.r);
    const g = Math.floor(this.color.g);
    const b = Math.floor(this.color.b);
    const alpha = depthAlpha * (0.6 + (musicState?.level||0)*0.4);

    // Trail
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
    
    // Configuración estricta de conexiones
    this.MAX_CONNECTIONS_PER_PARTICLE = 4;

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push(new NeuralParticle(this.canvas.width, this.canvas.height));
    }
    this.animate = this.animate.bind(this);
  }

  drawConnections(musicState) {
      const level = musicState?.level || 0;
      if (level < 0.1) return;

      const reach = this.CONNECTION_DISTANCE * (1 + (musicState?.bass||0)*1.8);
      this.ctx.lineCap = 'round';

      // ARRAY CONTADOR DE CONEXIONES (Reinicio cada frame)
      // Esto lleva la cuenta de cuántas líneas tiene cada partícula
      const connectionCounts = new Uint8Array(this.particles.length).fill(0);

      for(let i = 0; i < this.particles.length; i++){
          const p1 = this.particles[i]; 
          if(!p1.x2d) continue;

          // Si la partícula 'i' ya tiene 4 líneas, saltamos
          if (connectionCounts[i] >= this.MAX_CONNECTIONS_PER_PARTICLE) continue;

          for(let j = i + 1; j < this.particles.length; j++){
              const p2 = this.particles[j]; 
              if(!p2.x2d) continue;

              // Si la partícula 'j' ya tiene 4 líneas, no podemos conectar con ella
              if (connectionCounts[j] >= this.MAX_CONNECTIONS_PER_PARTICLE) continue;

              const dx = p1.x2d - p2.x2d; 
              const dy = p1.y2d - p2.y2d;
              
              if(Math.abs(dx) > reach || Math.abs(dy) > reach) continue;

              const dist = Math.sqrt(dx*dx + dy*dy);
              if(dist < reach){
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

                      // ¡IMPORTANTE! Aumentamos el contador para ambas
                      connectionCounts[i]++;
                      connectionCounts[j]++;
                      
                      // Si 'i' se llenó durante este bucle interno, rompemos el bucle interno
                      if (connectionCounts[i] >= this.MAX_CONNECTIONS_PER_PARTICLE) break;
                  }
              }
          }
      }
  }

  animate() {
    let musicState = { bass: 0, mid: 0, treble: 0, level: 0 };
    try { if (this.audioAnalyzer) musicState = this.audioAnalyzer.getState(); } catch(e) {}
    
    // --- LÓGICA DE CAPTURA DE PIXELES ---
    let pixelData = null;
    let srcWidth = 0;
    let srcHeight = 0;

    try {
        // Intentamos obtener el contexto del sampler (video fuente)
        const sourceCtx = this.colorSampler.ctx || this.colorSampler.context;
        
        if (sourceCtx) {
            srcWidth = sourceCtx.canvas.width;
            srcHeight = sourceCtx.canvas.height;
            // Obtenemos una foto instantánea de todos los pixeles del video
            // Nota: getImageData puede ser pesado en 4K. Si va lento, reduce el tamaño del canvas fuente.
            const imageData = sourceCtx.getImageData(0, 0, srcWidth, srcHeight);
            pixelData = imageData.data;
        } else {
            // Fallback: Si no hay acceso a pixeles, usamos el método antiguo
            // pero esto NO dará colores independientes espaciales perfectos
            const simpleColor = this.colorSampler.sampleColor();
            // Creamos un array falso con un solo color si falla lo anterior
            // (Esto es solo para que no crashee, pero perderás la independencia)
        }
    } catch(e) {
        // Silencio errores de cors o contexto nulo
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = 'source-over'; 
    
    // Pasamos los datos de píxeles a CADA partícula para que busquen SU color
    this.particles.forEach(p => p.update(musicState, pixelData, srcWidth, srcHeight, this.canvas.width, this.canvas.height));
    
    this.drawConnections(musicState);
    this.particles.sort((a, b) => b.z - a.z);
    this.particles.forEach(p => p.draw(this.ctx, this.canvas.width/2, this.canvas.height/2, musicState));
    
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
