import { ColorSampler } from '../utils/colorSampler.js';

class NeuralParticle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.history = []; 
    this.MAX_HISTORY = 10;
    // Iniciamos con un color temporal blanco hasta que reciba datos del video
    this.color = { r: 255, g: 255, b: 255 }; 
    this.reset(true, null);
  }

  reset(isInitial = false, currentPalette = null) {
    const fov = 400;
    
    // 1. Elegir profundidad primero
    // Si es inicial, en cualquier lugar. Si es respawn, al fondo o justo detrás de la cámara.
    this.z = isInitial ? Math.random() * 1200 : 800 + Math.random() * 400;
    
    // 2. CALCULAR EL ÁREA VISIBLE A ESA PROFUNDIDAD (Clave para dispersión total)
    // Cuanto más lejos (z mayor), más pequeño es el scale, así que necesitamos 
    // coordenadas X/Y más grandes para llenar la pantalla.
    const scale = fov / (fov + this.z);
    const visibleWidth = this.width / scale;
    const visibleHeight = this.height / scale;

    // 3. Posicionar aleatoriamente dentro del área visible calculada
    this.x = (Math.random() - 0.5) * visibleWidth;
    this.y = (Math.random() - 0.5) * visibleHeight;
    
    // Física de movimiento
    this.speed = 0.5 + Math.random() * 1.5; 
    this.angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(this.angle) * 0.5;
    this.vy = Math.sin(this.angle) * 0.5;
    
    this.baseSize = 0.6 + Math.random() * 1.4; 
    
    // 4. COLOR DEL FONDO (VIDEO)
    // Si nos pasan la paleta actual del video, tomamos un color de ahí.
    if (currentPalette && currentPalette.length > 0) {
        this.color = currentPalette[Math.floor(Math.random() * currentPalette.length)];
    }
    
    this.history = [];
  }

  update(musicState, currentPalette) {
    // Guardar historial para la estela
    if (this.x2d && this.y2d) {
        this.history.push({ x: this.x2d, y: this.y2d });
        if (this.history.length > this.MAX_HISTORY) this.history.shift();
    }

    // Movimiento influenciado por música
    const bass = musicState?.bass || 0;
    const mid = musicState?.mid || 0;

    const speedMult = 1 + bass * 3; 
    this.z -= this.speed * speedMult;
    
    // Rotación suave
    const turnSpeed = (Math.random() - 0.5) * 0.1 * (1 + mid);
    const currentAngle = Math.atan2(this.vy, this.vx);
    const newAngle = currentAngle + turnSpeed;
    
    const moveSpeed = 0.5 * (1 + mid * 2);
    this.vx = Math.cos(newAngle) * moveSpeed;
    this.vy = Math.sin(newAngle) * moveSpeed;

    this.x += this.vx;
    this.y += this.vy;

    // Lógica de reinicio:
    // Calculamos el scale actual para saber si se salió de la pantalla visualmente
    const fov = 400;
    const scale = fov / (fov + this.z);
    const limitX = (this.width / 2) / scale;
    const limitY = (this.height / 2) / scale;

    // Si la partícula pasa la cámara (z < 10) O se sale del marco visible
    if (this.z < 10 || Math.abs(this.x) > limitX * 1.2 || Math.abs(this.y) > limitY * 1.2) {
      // AQUÍ ES DONDE ACTUALIZAMOS EL COLOR SEGÚN EL VIDEO
      this.reset(false, currentPalette);
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

    const r = this.color.r || 255;
    const g = this.color.g || 255;
    const b = this.color.b || 255;

    // Estela
    if (this.history.length > 2) {
        ctx.beginPath();
        ctx.moveTo(this.history[0].x, this.history[0].y);
        for (let i = 1; i < this.history.length; i++) ctx.lineTo(this.history[i].x, this.history[i].y);
        ctx.lineTo(this.x2d, this.y2d);
        ctx.lineCap = 'round';
        ctx.lineWidth = this.baseSize * scale * 0.8;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`;
        ctx.stroke();
    }

    // Núcleo
    const size = Math.max(0.5, this.baseSize * scale * (1 + (musicState?.bass || 0)));
    
    // Glow si hay música
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

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(this.x2d, this.y2d, size, 0, Math.PI * 2);
    ctx.fill();
    
    return true;
  }
  
  distance2D(other) {
    if (!this.x2d || !other.x2d) return Infinity;
    const dx = this.x2d - other.x2d;
    const dy = this.y2d - other.y2d;
    return Math.sqrt(dx * dx + dy * dy);
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
    
    // Inicializar paleta vacía
    this.colorPalette = [{r:255,g:255,b:255}];
    
    // Intentar obtener colores inmediatamente
    this.updatePalette();

    // Actualizar paleta desde el video cada 100ms (muy rápido para que sea responsivo)
    if (this.colorSampler) {
        setInterval(() => this.updatePalette(), 100);
    }

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push(new NeuralParticle(this.canvas.width, this.canvas.height));
    }
    
    this.animate = this.animate.bind(this);
  }

  updatePalette() {
      try {
          if(!this.colorSampler) return;
          // Obtenemos varios colores para tener variedad (sombras, luces, medios)
          const newPalette = [];
          for(let i=0; i<3; i++) {
            const col = this.colorSampler.sampleColor();
            if(col) newPalette.push(col);
          }
          if(newPalette.length > 0) this.colorPalette = newPalette;
      } catch(e) {}
  }

  drawConnections(musicState) {
    const level = musicState?.level || 0;
    if (level < 0.1) return; // Silencio = sin conexiones

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
            // Usamos un color promedio de la paleta actual para la línea
            // O simplemente blanco azulado para que parezca electricidad
            this.ctx.strokeStyle = `rgba(220, 240, 255, ${alpha})`;
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
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = 'lighter'; // Mezcla aditiva para video

    // ACTUALIZAR: Pasamos this.colorPalette a update()
    this.particles.forEach(p => p.update(musicState, this.colorPalette));
    
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
