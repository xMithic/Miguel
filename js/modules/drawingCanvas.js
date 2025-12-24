export class DrawingCanvas {
    constructor(canvas, cursorManager, audioBtn) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: true });
        this.cursorManager = cursorManager;
        this.audioBtn = audioBtn;
        this.isDrawing = false;
        this.points = [];
        this.hue = 0; // Variable para la animación de color

        // Referencia al video de fondo
        this.bgVideo = document.querySelector('video.main-video') || document.querySelector('#background-layer');

        // Configuración de Alta Resolución
        this.pixelRatio = window.devicePixelRatio || 1;
        this.resize();

        // Configuración inicial de estilo
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
        
        // Restauramos estilos tras el resize
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    setupEventListeners() {
        window.addEventListener('pointerdown', (e) => {
            if (e.target && (e.target === this.audioBtn || e.target.closest('#audio-btn'))) return;
            this.isDrawing = true;
            this.points = [];
            this.addPoint(e.clientX, e.clientY);
        });

        window.addEventListener('pointermove', (e) => {
            if (this.isDrawing) this.addPoint(e.clientX, e.clientY);
        });

        window.addEventListener('pointerup', () => {
            this.isDrawing = false;
            this.points = [];
        });
    }

    addPoint(x, y) {
        this.points.push({ x, y, time: Date.now() });
        this.drawCurve(x, y);
    }

    drawCurve(currentX, currentY) {
        if (this.points.length < 2) return;

        const p1 = this.points[this.points.length - 2];
        const p2 = this.points[this.points.length - 1];

        // --- CORRECCIÓN CLAVE: Asegurar modo de pintura ---
        // Esto evita que se quede en modo "borrar" del animate()
        this.ctx.globalCompositeOperation = 'source-over';

        // Incrementamos el matiz (Hue)
        this.hue = (this.hue + 5) % 360; // +5 para que cambie de color más rápido
        const animatedColor = `hsl(${this.hue}, 100%, 60%)`;

        // Cálculo de grosor basado en velocidad
        const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        const velocity = dist / (p2.time - p1.time || 1);
        const targetWidth = Math.max(0.5, 2 - velocity * 0.2); // Grosor ajustado

        this.ctx.beginPath();
        this.ctx.lineWidth = targetWidth;
        
        // --- SIN BLUR PARA EVITAR RASTRO SUCIO ---
        this.ctx.shadowBlur = 0; 
        this.ctx.strokeStyle = animatedColor;

        // Dibujo curva cuadrática para suavidad
        this.ctx.moveTo(p1.x, p1.y);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        this.ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
        this.ctx.lineTo(p2.x, p2.y);
        
        this.ctx.stroke();
    }

    animate() {
        this.ctx.save();
        
        // --- BORRADO LIMPIO Y RÁPIDO ---
        this.ctx.globalCompositeOperation = 'destination-out';
        
        // 0.25 hace que desaparezca en ~0.3 segundos (muy rápido y sin rastro)
        // Si lo quieres UN PELÍN más lento, usa 0.15
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'; 
        
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.restore();

        requestAnimationFrame(() => this.animate());
    }
}
