import { ColorSampler } from '../utils/colorSampler.js';

class NeuralParticle {
  constructor(colorPalette, width, height) {
    this.colorPalette = colorPalette;
    this.width = width;
    this.height = height;
    // ✨ MEJORA: Historial para el efecto de estela (trail)
    this.history = []; 
    this.MAX_HISTORY = 8; // Qué tan larga es la cola
    this.reset(true);
  }

  reset(isInitial = false) {
    const spreadX = this.width || 800; 
    const spreadY = this.height || 800;

    this.x = (Math.random() - 0.5) * spreadX * 1.5;
    this.y = (Math.random() - 0.5) * spreadY * 1.5;
    this.z = isInitial ? Math.random() * 1200 : 800 + Math.random() * 400;
    
    // ✨ MEJORA: Movimiento más orgánico (menos lineal)
    this.speed = 0.5 + Math.random() * 1.2; // Un poco más lentas para apreciar la estela
    this.angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(this.angle) * 0.5;
    this.vy = Math.sin(this.angle) * 0.5;
    
    this.baseSize = 0.5 + Math.random() * 1.5; // Pequeñitas y elegantes
    this.color = this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    
    this.history = []; // Limpiar estela al resetear
  }

  update(musicState) {
    // 1. Guardar posición actual en el historial antes de moverse
    if (this.x2d && this.y2d) {
        this.history.push({ x: this.x2d, y: this.y2d, alpha: 1 });
        if (this.history.length > this.MAX_HISTORY) {
            this.history.shift();
        }
    }

    // 2. Movimiento influenciado por música
    const speedMult = 1 + (musicState?.bass || 0) * 3; // El bajo empuja fuerte
    this.z -= this.speed * speedMult;
    
    // ✨ MEJORA: Rotación suave basada en el 'mid' de la música
    const turnSpeed = (Math.random() - 0.5) * 0.1 * (1 + (musicState?.mid || 0));
    this.vx = Math.cos(this.angle + turnSpeed);
    this.vy = Math.sin(this.angle + turnSpeed);

    this.x += this.vx * (1 + (musicState?.mid || 0) * 2);
    this.y += this.vy * (1 + (musicState?.mid || 0) * 2);

    if (this.z < 10 || Math.abs(this.x) > this.width || Math.abs(this.y) > this.height) {
      this.reset();
    }
  }

  draw(ctx, centerX, centerY, musicState) {
    const fov = 400;
    const scale = fov / (fov + this.z);
    
    this.x2d = Math.floor(this.x * scale + centerX);
    this.y2d = Math.floor(this.y * scale + centerY);
    
    // ✨ MEJORA: Opacidad basada en profundidad más dramática
    const depthAlpha = Math.pow(Math.max(0, 1 - this.z / 1200), 1.5); 
    const musicLevel = musicState?.level || 0.5;
    const alpha = depthAlpha * (0.4 + musicLevel * 0.6); // Más reactivo a la música
    
    if (alpha < 0.01) return false;

    const r = this.color.r || 255;
    const g = this.color.g || 255;
    const b = this.color.b || 255;

    // ✨ MEJORA: DIBUJAR LA ESTELA (TRAIL)
    if (this.history.length > 2) {
        ctx.beginPath();
        ctx.moveTo(this.history[0].x, this.history[0].y);
        for (let i = 1; i < this.history.length; i++) {
            ctx.lineTo(this.history[i].x, this.history[i].y);
        }
        ctx.lineTo(this.x2d, this.y2d); // Conectar con la posición actual
        
        // La estela se desvanece
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`;
        ctx.lineWidth = this.baseSize * scale;
        ctx.stroke();
    }

    // DIBUJAR LA CABEZA (La partícula)
    const size = Math.max(0.5, this.baseSize * scale * (1 + (musicState?.bass || 0)));

    // Glow intenso solo si hay música fuerte
    if (musicLevel > 0.3) {
      const glowSize = size * 4;
      const gradient = ctx.createRadialGradient(this.x2d, this.y2d, 0, this.x2d, this.y2d, glowSize);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x2d, this.y2d, glowSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Núcleo blanco brillante (hace que parezca luz real)
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
    // ✨ MEJORA: 'alpha: false' a veces mejora rendimiento si hay un fondo fijo, 
    // pero como es video overlay, usamos alpha: true.
    this.ctx = canvas.getContext('2d', { alpha: true });
    
    this.colorSampler = colorSampler;
    this.audioAnalyzer = audioAnalyzer;
    
    this.particles = [];
    this.MAX_PARTICLES = 70; // Menos partículas pero más bonitas
    this.CONNECTION_DISTANCE = 110;
    this.MAX_CONNECTIONS_PER_PARTICLE = 4;
    
    // Inicialización de colores y partículas (Igual que antes)
    this.colorPalette = [{ r: 255, g: 255, b: 255 }]; // Default blanco hasta cargar
    this.updatePalette();
    
    // Actualizar paleta periódicamente para que coincida con el video
    if (this.colorSampler) {
        setInterval(() => this.updatePalette(), 2000);
    }

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push(new NeuralParticle(this.colorPalette, this.canvas.width, this.canvas.height));
    }
    
    this.animate = this.animate.bind(this);
  }

  updatePalette() {
      try {
          // Intentar sacar 5 colores del video
          const newPalette = [];
          for(let i=0; i<5; i++) {
            if(this.colorSampler) newPalette.push(this.colorSampler.sampleColor());
          }
          if(newPalette.length > 0) this.colorPalette = newPalette;
          // Actualizar colores de partículas existentes gradualmente sería ideal,
          // pero por ahora las nuevas que nazcan tendrán los nuevos colores.
      } catch(e) {}
  }

  // ✨ MEJORA: Conexiones más sutiles
  drawConnections(musicState) {
    const connectionIntensity = Math.max(0, (musicState?.level || 0) - 0.2); // Solo se conectan si hay suficiente volumen
    if (connectionIntensity <= 0) return; // Si está silencio, no dibujar líneas (limpieza visual)

    // ... (Lógica de bucles igual que antes) ...
    // Solo cambia el dibujo de la línea:
    
    // Al dibujar la línea dentro del bucle for:
    // this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`; // Líneas siempre blancas/brillantes se ven mejor sobre video
    // this.ctx.lineWidth = 0.2; // Muy finas
  }

  // Para que el código funcione sin copiar todo, usa tu drawConnections anterior 
  // pero cambia el color de la línea a blanco con baja opacidad.
  
  // Mantenemos mixColors, drawFlash, drawEdgePulse iguales o los quitamos si distraen mucho del video.

  animate() {
    let musicState = this.audioAnalyzer?.getState() || { bass: 0, mid: 0, treble: 0, level: 0 };
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // ✨ MEJORA: Global Composite Operation 'lighter' es CLAVE para video.
    // Hace que las partículas sumen luz al video en lugar de taparlo.
    this.ctx.globalCompositeOperation = 'lighter'; // O 'screen'
    
    // Ordenar partículas para que las del fondo se dibujen primero (Z-sort)
    // Esto es vital para que el efecto de profundidad funcione bien
    this.particles.sort((a, b) => b.z - a.z);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    this.particles.forEach(p => {
        p.update(musicState);
        p.draw(this.ctx, centerX, centerY, musicState);
    });
    
    // Dibujar conexiones al final (opcional, sobre las partículas)
    // this.drawConnections(musicState); // Descomentar si quieres líneas

    this.ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(this.animate);
  }

  start() { this.animate(); }
  setConnectionDistance(d) { this.CONNECTION_DISTANCE = d; }
  setParticleCount(c) { /* lógica igual */ }
  setConnectionComplexity(c) { /* lógica igual */ }
}
