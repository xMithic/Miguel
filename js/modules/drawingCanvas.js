export class DrawingCanvas {
    constructor(canvas, cursorManager, audioBtn) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: true });
        this.cursorManager = cursorManager;
        this.audioBtn = audioBtn;

        this.isDrawing = false;
        this.points = [];
        this.hue = 0;
        this.bgVideo = document.querySelector('video.main-video') || document.querySelector('#background-layer');
        this.pixelRatio = window.devicePixelRatio || 1;

        // --- CORRECCIÓN 1: Evitar gestos de navegador en el canvas ---
        this.canvas.style.touchAction = 'none';

        this.resize();

        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        window.addEventListener('resize', () => this.resize());
        this.setupEventListeners();
        this.animate();
    }

    resize() {
        const parent = this.canvas.parentElement || document.body;
        this.width = parent.clientWidth;
        this.height = parent.clientHeight;
        this.canvas.width = this.width * this.pixelRatio;
        this.canvas.height = this.height * this.pixelRatio;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.scale(this.pixelRatio, this.pixelRatio);
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    setupEventListeners() {
        // --- CORRECCIÓN 2: Eventos Unificados y Bloqueo de Scroll ---
        
        // Usamos el canvas directamente para 'start' para evitar conflictos con botones externos
        this.canvas.addEventListener('pointerdown', (e) => {
            // Permitir solo botón izquierdo o toque principal
            if (!e.isPrimary && e.button !== 0) return;

            this.isDrawing = true;
            this.points = [];
            
            // Captura el puntero para que si te sales del canvas, sigas dibujando
            this.canvas.setPointerCapture(e.pointerId);
            
            this.addPoint(e.clientX, e.clientY);
            
            // IMPORTANTE: Evita que el navegador intente hacer scroll o zoom
            e.preventDefault(); 
        });

        // 'move' en window para fluidez, pero comprobando isDrawing
        window.addEventListener('pointermove', (e) => {
            if (this.isDrawing) {
                // Prevenir scroll si estamos dibujando
                if (e.cancelable) e.preventDefault(); 
                this.addPoint(e.clientX, e.clientY);
            }
        });

        const stopDrawing = (e) => {
            if (this.isDrawing) {
                this.isDrawing = false;
                this.points = [];
                // Liberar captura si existe
                if (e.pointerId && this.canvas.hasPointerCapture(e.pointerId)) {
                    this.canvas.releasePointerCapture(e.pointerId);
                }
            }
        };

        window.addEventListener('pointerup', stopDrawing);
        window.addEventListener('pointercancel', stopDrawing);
    }

    addPoint(x, y) {
        // Aseguramos coordenadas relativas correctas si el canvas tuviera offset (opcional pero seguro)
        // Como es full screen, clientX/Y suelen estar bien, pero esto es más robusto:
        // const rect = this.canvas.getBoundingClientRect();
        // const relX = x - rect.left;
        // const relY = y - rect.top;
        // this.points.push({ x: relX, y: relY, time: Date.now() });
        // this.drawCurve(relX, relY);

        // Usamos clientX directo como en tu original ya que parece ser pantalla completa
        this.points.push({ x, y, time: Date.now() });
        this.drawCurve(x, y);
    }

    drawCurve(currentX, currentY) {
        if (this.points.length < 2) return;
        
        const p1 = this.points[this.points.length - 2];
        const p2 = this.points[this.points.length - 1];

        this.ctx.globalCompositeOperation = 'source-over';
        
        this.hue = (this.hue + 5) % 360;
        const animatedColor = `hsl(${this.hue}, 100%, 60%)`;

        const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        const velocity = dist / (p2.time - p1.time || 1);
        const targetWidth = Math.max(0.5, 2 - velocity * 0.2);

        this.ctx.beginPath();
        this.ctx.lineWidth = targetWidth;
        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = animatedColor;

        this.ctx.moveTo(p1.x, p1.y);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        this.ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
    }

    animate() {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.restore();
        requestAnimationFrame(() => this.animate());
    }
}
