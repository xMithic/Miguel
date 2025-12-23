export class DrawingCanvas {
  constructor(canvas, cursorManager, audioBtn) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.cursorManager = cursorManager;
    this.audioBtn = audioBtn;
    
    this.isDrawing = false;
    this.points = []; // Para curvas suaves
    
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
    this.points = [{ x: e.clientX, y: e.clientY }];
  }

  handleMove(e) {
    if (this.isDrawing) {
      this.points.push({ x: e.clientX, y: e.clientY });
      // Mantener solo los últimos 5 puntos para curvas suaves
      if (this.points.length > 5) {
        this.points.shift();
      }
    }
  }

  stopDrawing() {
    this.isDrawing = false;
    this.points = [];
  }

  drawSmoothStroke() {
    if (this.points.length < 2) return;
    
    const mousePos = this.cursorManager.getMousePosition();
    const time = performance.now() * 0.001;
    const hue = (performance.now() * 0.1) % 360;
    
    // Calcular velocidad del trazo para grosor dinámico
    const lastPoint = this.points[this.points.length - 1];
    const dx = mousePos.x - lastPoint.x;
    const dy = mousePos.y - lastPoint.y;
    const velocity = Math.sqrt(dx * dx + dy * dy);
    const baseWidth = Math.max(1, 3 - velocity * 0.2); // Más delgado
    
    // Dibujar trazo principal con resplandor
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.globalCompositeOperation = 'screen';
    
    // Capa de resplandor exterior
    this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.3)`;
    this.ctx.lineWidth = baseWidth * 2.5;
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.5)`;
    this.drawCurve(mousePos);
    
    // Capa intermedia
    this.ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.6)`;
    this.ctx.lineWidth = baseWidth * 1.5;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.7)`;
    this.drawCurve(mousePos);
    
    // Núcleo brillante
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.strokeStyle = `hsla(${hue}, 100%, 85%, 0.9)`;
    this.ctx.lineWidth = baseWidth;
    this.ctx.shadowBlur = 6;
    this.ctx.shadowColor = `hsla(${hue}, 100%, 70%, 1)`;
    this.drawCurve(mousePos);
    
    // Línea central ultra brillante
    this.ctx.strokeStyle = `hsla(${hue + 30}, 100%, 95%, 0.8)`;
    this.ctx.lineWidth = baseWidth * 0.3;
    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = 'white';
    this.drawCurve(mousePos);
    
    this.ctx.shadowBlur = 0;
    this.ctx.globalCompositeOperation = 'source-over';
  }

  drawCurve(mousePos) {
    this.ctx.beginPath();
    
    if (this.points.length >= 3) {
      // Empezar desde el primer punto
      this.ctx.moveTo(this.points[0].x, this.points[0].y);
      
      // Dibujar curvas cuadráticas suaves entre puntos
      for (let i = 1; i < this.points.length - 1; i++) {
        const xc = (this.points[i].x + this.points[i + 1].x) / 2;
        const yc = (this.points[i].y + this.points[i + 1].y) / 2;
        this.ctx.quadraticCurveTo(this.points[i].x, this.points[i].y, xc, yc);
      }
      
      // Curva final hasta el mouse
      const lastIdx = this.points.length - 1;
      this.ctx.quadraticCurveTo(
        this.points[lastIdx].x,
        this.points[lastIdx].y,
        mousePos.x,
        mousePos.y
      );
    } else {
      // Línea simple si solo hay 2 puntos
      this.ctx.moveTo(this.points[0].x, this.points[0].y);
      this.ctx.lineTo(mousePos.x, mousePos.y);
    }
    
    this.ctx.stroke();
  }

  animate() {
    // Efecto de rastro - fillRect con transparencia
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.03)'; // Rastro más duradero
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.globalCompositeOperation = 'source-over';

    // Dibujar trazo si está dibujando
    if (this.isDrawing && this.points.length > 0) {
      this.drawSmoothStroke();
    }
    
    requestAnimationFrame(() => this.animate());
  }
}
