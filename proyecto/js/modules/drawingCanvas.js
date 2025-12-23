export class DrawingCanvas {
  constructor(canvas, cursorManager, audioBtn) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.cursorManager = cursorManager;
    this.audioBtn = audioBtn;
    
    this.isDrawing = false;
    this.lastPoint = null;
    
    this.setupEventListeners();
    this.animate();
  }

  setupEventListeners() {
    window.addEventListener('pointerdown', (e) => this.startDrawing(e));
    window.addEventListener('pointerup', () => this.stopDrawing());
  }

  startDrawing(e) {
    if (e.target === this.audioBtn) return;
    this.isDrawing = true;
    this.lastPoint = { x: e.clientX, y: e.clientY };
  }

  stopDrawing() {
    this.isDrawing = false;
    this.lastPoint = null;
  }

  animate() {
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.globalCompositeOperation = 'source-over';

    if (this.isDrawing && this.lastPoint) {
      const mousePos = this.cursorManager.getMousePosition();
      const hue = (performance.now() * 0.15) % 360;
      
      this.ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 1)`;
      this.ctx.lineWidth = 4;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.8)`;

      this.ctx.beginPath();
      this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
      this.ctx.lineTo(mousePos.x, mousePos.y);
      this.ctx.stroke();
      
      this.ctx.shadowBlur = 0;
      
      this.lastPoint = { x: mousePos.x, y: mousePos.y };
    }
    
    requestAnimationFrame(() => this.animate());
  }
}

