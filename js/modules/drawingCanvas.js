export class DrawingCanvas {
    constructor(canvas, cursorManager, audioBtn) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: true });
        this.cursorManager = cursorManager;
        this.audioBtn = audioBtn;

        this.isDrawing = false;
        this.points = [];
        this.hue = 0; // Variable para la animación de color
        
        // Referencia al video de fondo (Mantenida aunque no se use para color ahora)
        this.bgVideo = document.querySelector('video.main-video') || document.querySelector('#background-layer');
        
        // Canvas temporal (Mantenido por compatibilidad con tu código original)
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
        this.tempCanvas.width = 1; 
        this.tempCanvas.height = 1;

        // Configuración de Alta Resolución
        this.pixelRatio = window.devicePixelRatio || 1;
        this.resize();

        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Efecto visual: Superposición
        this.ctx.globalCompositeOperation = 'screen'; 
        
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

    // ELIMINADO: getNeonColor (ya no se usa, el color es animado)

    addPoint(x, y) {
        this.points.push({ x, y, time: Date.now() });
        this.drawCurve(x, y);
    }

    drawCurve(currentX, currentY) {
        if (this.points.length < 2) return;

        const p1 = this.points[this.points.length - 2];
        const p2 = this.points[this.points.length - 1];

        // --- CAMBIO ÚNICO AQUÍ: COLOR ANIMADO ---
        // Incrementamos el matiz (Hue) en cada segmento dibujado
        this.hue = (this.hue + 2) % 360; 
        const animatedColor = `hsl(${this.hue}, 100%, 60%)`;

        // 2. GROSOR MÍNIMO (MANTENIDO EXACTO)
        const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        const velocity = dist / (p2.time - p1.time || 1);
        const targetWidth = Math.max(0.8, 3 - velocity * 0.4);

        this.ctx.beginPath();
        this.ctx.lineWidth = targetWidth;
        
        // 3. EFECTO GLOW (COLOR MULTICOLOR)
        this.ctx.strokeStyle = animatedColor;
        this.ctx.shadowBlur = 3; // Un poco más de brillo para que el color destaque
        this.ctx.shadowColor = animatedColor;

        // Dibujo (MANTENIDO EXACTO)
        this.ctx.moveTo(p1.x, p1.y);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        this.ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
        this.ctx.lineTo(p2.x, p2.y);
        
        this.ctx.stroke();
    }

    animate() {
        // Borrado suave (MANTENIDO EXACTO)
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.02)'; 
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.restore();

        requestAnimationFrame(() => this.animate());
    }
}
