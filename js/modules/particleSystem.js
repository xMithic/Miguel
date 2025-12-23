import { ColorSampler } from '../utils/colorSampler.js';

/**
 * Clase que representa una "neurona" individual.
 * Tiene historial de movimiento para dejar rastro y reacciona a la música.
 */
class NeuralParticle {
  constructor(colorPalette, width, height) {
    this.colorPalette = colorPalette;
    this.width = width;
    this.height = height;
    this.history = []; // Para el efecto de estela (trail)
    this.MAX_HISTORY = 10; // Longitud de la cola
    this.reset(true);
  }

  reset(isInitial = false) {
    // Esparcir por toda la pantalla (coordenadas centradas en 0,0)
    const spreadX = this.width || 800; 
    const spreadY = this.height || 800;

    this.x = (Math.random() - 0.5) * spreadX;
    this.y = (Math.random() - 0.5) * spreadY;
    
    // Si es inicio, aparecen en cualquier profundidad. Si es respawn, al fondo.
    this.z = isInitial ? Math.random() * 1200 : 800 + Math.random() * 400;
    
    // Movimiento orgánico
    this.speed = 0.5 + Math.random() * 1.5; 
    this.angle = Math.random() * Math.PI * 2;
    
    // Velocidad vectorial inicial
    this.vx = Math.cos(this.angle) * 0.5;
    this.vy = Math.sin(this.angle) * 0.5;
    
    // Tamaño pequeño para elegancia
    this.baseSize = 0.6 + Math.random() * 1.4; 
    
    this.color = this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    this.history = [];
  }

  update(musicState) {
    // 1. Guardar posición para la estela (Trail)
    if (this.x2d && this.y2d) {
        this.history.push({ x: this.x2d, y: this.y2d });
        if (this.history.length > this.MAX_HISTORY) {
            this.history.shift();
        }
    }

    // 2. Factores musicales
    const bass = musicState?.bass || 0;
    const mid = musicState?.mid || 0;

    // Velocidad afectada por el bajo (BASS)
    const speedMult = 1 + bass * 3; 
    this.z -= this.speed * speedMult;
    
    // Rotación suave afectada por los medios (MID)
    const turnSpeed = (Math.random() - 0.5) * 0.1 * (1 + mid);
    const currentAngle = Math.atan2(this.vy, this.vx);
    const newAngle = currentAngle + turnSpeed;
    
    // Calcular nueva velocidad
    const moveSpeed = 0.5 * (1 + mid * 2);
    this.vx = Math.cos(newAngle) * moveSpeed;
    this.vy = Math.sin(newAngle) * moveSpeed;

    this.x += this.vx;
    this.y += this.vy;

    // Reiniciar si sale de la pantalla o pasa la cámara
    if (this.z < 10 || Math.abs(this.x) > this.width/1.5 || Math.abs(this.y) > this.height/1.5) {
      this.reset();
    }
  }

  draw(ctx, centerX, centerY, musicState) {
    const fov = 400;
    const scale = fov / (fov + this.z);
    
    // Proyección 3D a 2D
    this.x2d = this.x * scale + centerX;
    this.y2d = this.y * scale + centerY;
    
    // Opacidad basada en profundidad y música
    const depthAlpha = Math.pow(Math.max(0, 1 - this.z / 1200), 1.5); 
    const musicAlpha = 0.4 + (musicState?.level || 0) * 0.6;
    const alpha = depthAlpha * musicAlpha;
    
    if (alpha < 0.01) return false;

    const r = this.color.r || 255;
    const g = this.color.g || 255;
    const b = this.color.b || 255;

    // --- DIBUJAR ESTELA (COLA) ---
    if (this.history.length > 2) {
        ctx.beginPath();
        // Empezar desde el punto más antiguo
        ctx.moveTo(this.history[0].x, this.history[0].y);
        
        for (let i = 1; i < this.history.length; i++) {
            // Curva cuadrática para suavidad extra (opcional, lineTo también sirve)
            ctx.lineTo(this.history[i].x, this.history[i].y);
        }
        ctx.lineTo(this.x2d, this.y2d);
        
        ctx.lineCap = 'round';
        ctx.lineWidth = this.baseSize * scale * 0.8;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.2})`; // Cola tenue
        ctx.stroke();
    }

    // --- DIBUJAR NÚCLEO (La bolita) ---
    // El tamaño pulsa con el bajo
    const size = Math.max(0.5, this.baseSize * scale * (1 + (musicState?.bass || 0)));

    // Brillo exterior (Glow)
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

    // Centro blanco brillante (estilo energía)
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

/**
 * Sistema principal que maneja las partículas y las conexiones neuronales.
 */
export class ParticleSystem {
  constructor(canvas, colorSampler, audioAnalyzer) {
    console.log('🎨 Inicializando Neural System...');
    
    this.canvas = canvas;
    // alpha: true es vital para ver el video de fondo
    this.ctx = canvas.getContext('2d', { alpha: true });
    
    this.colorSampler = colorSampler;
    this.audioAnalyzer = audioAnalyzer;
    
    this.particles = [];
    this.MAX_PARTICLES = 75; // Cantidad equilibrada
    this.CONNECTION_DISTANCE = 130; // Distancia base de conexión
    this.MAX_CONNECTIONS_PER_PARTICLE = 4;
    
    // Paleta inicial (blanco/azul eléctrico por defecto)
    this.colorPalette = [
        { r: 200, g: 230, b: 255 }, 
        { r: 100, g: 200, b: 255 }
    ];
    
    // Intentar actualizar paleta con el video periódicamente
    if (this.colorSampler) {
        setInterval(() => this.updatePalette(), 2000);
    }

    // Crear partículas
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push(
          new NeuralParticle(this.colorPalette, this.canvas.width, this.canvas.height)
      );
    }
    
    // Bind para no perder el contexto 'this' en el loop
    this.animate = this.animate.bind(this);
  }

  updatePalette() {
      try {
          const newPalette = [];
          for(let i=0; i<3; i++) {
            const col = this.colorSampler.sampleColor();
            if(col) newPalette.push(col);
          }
          if(newPalette.length > 0) this.colorPalette = newPalette;
      } catch(e) {}
  }

  /**
   * Dibuja las líneas entre partículas simulando sinapsis.
   * La distancia de conexión aumenta con el BAJO de la música.
   */
  drawConnections(musicState) {
    const level = musicState?.level || 0;
    
    // Si la música es muy baja, no dibujamos conexiones (ahorro de recursos + estética limpia)
    if (level < 0.1) return;

    // ALCANCE DINÁMICO: 
    // Si hay bajo, las neuronas se "estiran" para conectar más lejos
    const bassInfluence = musicState?.bass || 0;
    const dynamicReach = this.CONNECTION_DISTANCE * (1 + bassInfluence * 1.8);
    
    this.ctx.lineCap = 'round';
    
    // Recorremos las partículas para encontrar vecinos
    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];
      if (!p1.x2d || p1.z > 900) continue; // Ignorar si está muy al fondo

      let connectionsMade = 0;

      for (let j = i + 1; j < this.particles.length; j++) {
        if (connectionsMade >= this.MAX_CONNECTIONS_PER_PARTICLE) break;

        const p2 = this.particles[j];
        if (!p2.x2d || p2.z > 900) continue;

        // Check rápido de distancia
        const dx = p1.x2d - p2.x2d;
        const dy = p1.y2d - p2.y2d;
        if (Math.abs(dx) > dynamicReach || Math.abs(dy) > dynamicReach) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < dynamicReach) {
          connectionsMade++;

          // Opacidad de la línea
          // 1. proximity: más cerca = más opaco
          // 2. level: más volumen = más opaco
          const proximity = 1 - (dist / dynamicReach);
          let alpha = proximity * level * 0.6;
          
          // Si hay golpe fuerte (impact), brillan más
          if ((musicState?.impact || 0) > 0.5) alpha += 0.3;
          
          // Grosor dinámico (eléctrico)
          const width = (0.2 + bassInfluence * 1.5) * proximity;

          if (alpha > 0.05) {
            this.ctx.lineWidth = width;
            // Color casi blanco para parecer electricidad
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
    // Obtener estado del audio
    let musicState = { bass: 0, mid: 0, treble: 0, level: 0, impact: 0 };
    try {
        if (this.audioAnalyzer) musicState = this.audioAnalyzer.getState();
    } catch(e) {}
    
    // Limpiar canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // EFECTO DE LUZ: 'lighter' suma los colores, ideal para overlay en video oscuro
    this.ctx.globalCompositeOperation = 'lighter';

    // 1. Actualizar posiciones (física)
    this.particles.forEach(p => p.update(musicState));
    
    // 2. Dibujar conexiones (Neuronas) - VAN PRIMERO
    this.drawConnections(musicState);
    
    // 3. Dibujar partículas - VAN ENCIMA
    // Ordenar por profundidad (Z) para que las cercanas tapen a las lejanas
    this.particles.sort((a, b) => b.z - a.z);
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    this.particles.forEach(p => {
        p.draw(this.ctx, centerX, centerY, musicState);
    });

    // Restaurar modo normal por si acaso se usa el context fuera
    this.ctx.globalCompositeOperation = 'source-over';
    
    requestAnimationFrame(this.animate);
  }

  start() {
    this.animate();
  }
  
  // Setters para control externo
  setConnectionDistance(d) { this.CONNECTION_DISTANCE = d; }
  setParticleCount(c) { 
      // Ajuste simple de cantidad
      const current = this.particles.length;
      if(c > current) {
          for(let i=0; i<c-current; i++) this.particles.push(new NeuralParticle(this.colorPalette, this.canvas.width, this.canvas.height));
      } else {
          this.particles.length = c;
      }
  }
}
