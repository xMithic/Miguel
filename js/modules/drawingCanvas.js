export class DrawingCanvas {
  constructor(canvas, cursorManager, audioBtn) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: false });
    this.cursorManager = cursorManager;
    this.audioBtn = audioBtn;
    
    this.isDrawing = false;
    this.lastPoint = null;
    this.points = []; // Para curvas suaves
    this.particles = []; // Sistema de partículas
    
    this.setupEventListeners();
    this.animate();
  }

  setupEventListeners() {
    window.addEventListener('pointerdown', (e) => this.startDrawing(e));
    window.addEventListener('pointerup', () => this.stopDrawing());
    window.addEventListener('pointermove', (e) => this.handleMove(e));
  }

  startDrawing(e) {
    if (e.target === this.audioBtn) return;
    this.isDrawing = true;
    this.lastPoint = { x: e.clientX, y: e.clientY };
    this.points = [{ x: e.clientX, y: e.clientY }];
  }

  handleMove(e) {
    if (this.isDrawing) {
      this.points.push({ x: e.clientX, y: e.clientY });
      // Mantener solo los últimos 6 puntos para curvas suaves
      if (this.points.length > 6) {
        this.points.shift();
      }
    }
  }

  stopDrawing() {
    this.isDrawing = false;
    this.lastPoint = null;
    this.points = [];
  }

  createParticles(x, y, hue) {
    // Crear partículas en el punto de dibujo
    const particleCount = 3;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      const size = Math.random() * 3 + 2;
      
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        alpha: 1,
        hue: hue,
        decay: Math.random() * 0.02 + 0.02
      });
    }
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Actualizar posición y propiedades
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // Gravedad ligera
      p.alpha -= p.decay;
      p.size *= 0.97;
      
      // Dibujar partícula con glow
      this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.alpha})`;
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = `hsla(${p.hue}, 100%, 50%, ${p.alpha})`;
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Eliminar partículas muertas
      if (p.alpha <= 0 || p.size <= 0.5) {
        this.particles.splice(i, 1);
      }
    }
    this.ctx.shadowBlur = 0;
  }

  drawSmoothLine() {
    if (this.points.length < 2) return;
    
    const mousePos = this.cursorManager.getMousePosition();
    const hue = (performance.now() * 0.15) % 360;
    const time = performance.now() * 0.001;
    
    // Crear partículas en la posición actual
    if (Math.random() < 0.5) {
      this.createParticles(mousePos.x, mousePos.y, hue);
    }
    
    // Dibujar múltiples líneas paralelas para efecto de "pincel"
    const brushLines = 5;
    for (let j = 0; j < brushLines; j++) {
      const offset = (j - brushLines / 2) * 2;
      const alphaVariation = 1 - (Math.abs(offset) / brushLines) * 0.5;
      const widthVariation = 1 - (Math.abs(offset) / brushLines) * 0.3;
      
      // Color con variación de matiz
      const hueVariation = hue + (j * 10);
      this.ctx.strokeStyle = `hsla(${hueVariation}, 100%, ${60 + j * 4}%, ${0.6 * alphaVariation})`;
      this.ctx.lineWidth = (5 + Math.sin(time * 2) * 2) * widthVariation;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      // Efecto de resplandor intenso
      this.ctx.shadowBlur = 25 + Math.sin(time * 3) * 5;
      this.ctx.shadowColor = `hsla(${hueVariation}, 100%, 50%, 0.9)`;
      this.ctx.globalCompositeOperation = 'lighter';
      
      this.ctx.beginPath();
      
      // Usar curvas de Bézier para suavidad
      if (this.points.length >= 3) {
        this.ctx.moveTo(
          this.points[0].x + offset * Math.cos(time),
          this.points[0].y + offset * Math.sin(time)
        );
        
        for (let i = 1; i < this.points.length - 1; i++) {
          const xc = (this.points[i].x + this.points[i + 1].x) / 2 + offset * Math.cos(time);
          const yc = (this.points[i].y + this.points[i + 1].y) / 2 + offset * Math.sin(time);
          this.ctx.quadraticCurveTo(
            this.points[i].x + offset * Math.cos(time),
            this.points[i].y + offset * Math.sin(time),
            xc,
            yc
          );
        }
        
        // Línea final hasta la posición actual del mouse
        const lastIdx = this.points.length - 1;
        this.ctx.quadraticCurveTo(
          this.points[lastIdx].x + offset * Math.cos(time),
          this.points[lastIdx].y + offset * Math.sin(time),
          mousePos.x + offset * Math.cos(time),
          mousePos.y + offset * Math.sin(time)
        );
      } else {
        // Línea simple si no hay suficientes puntos
        this.ctx.moveTo(
          this.points[0].x + offset * Math.cos(time),
          this.points[0].y + offset * Math.sin(time)
        );
        this.ctx.lineTo(
          mousePos.x + offset * Math.cos(time),
          mousePos.y + offset * Math.sin(time)
        );
      }
      
      this.ctx.stroke();
    }
    
    // Dibujar línea central más brillante
    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.strokeStyle = `hsla(${hue}, 100%, 90%, 0.8)`;
    this.ctx.lineWidth = 2;
    this.ctx.shadowBlur = 30;
    this.ctx.shadowColor = `hsla(${hue}, 100%, 70%, 1)`;
    
    this.ctx.beginPath();
    if (this.points.length >= 3) {
      this.ctx.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length - 1; i++) {
        const xc = (this.points[i].x + this.points[i + 1].x) / 2;
        const yc = (this.points[i].y + this.points[i + 1].y) / 2;
        this.ctx.quadraticCurveTo(this.points[i].x, this.points[i].y, xc, yc);
      }
      const lastIdx = this.points.length - 1;
      this.ctx.quadraticCurveTo(
        this.points[lastIdx].x,
        this.points[lastIdx].y,
        mousePos.x,
        mousePos.y
      );
    }
    this.ctx.stroke();
    
    this.ctx.shadowBlur = 0;
    this.lastPoint = { x: mousePos.x, y: mousePos.y };
  }

  animate() {
    // Efecto de desvanecimiento más suave y gradual
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.025)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.globalCompositeOperation = 'source-over';

    // Actualizar y dibujar partículas
    this.updateParticles();

    // Dibujar línea principal si está dibujando
    if (this.isDrawing && this.points.length > 0) {
      this.drawSmoothLine();
    }
    
    requestAnimationFrame(() => this.animate());
  }
}
