export class CursorManager {
    constructor(cursorElement, cardWrapper, shine) {
        this.cursor = cursorElement;
        this.cardWrapper = cardWrapper;
        this.shine = shine;
        
        // Coordenadas
        this.clientX = window.innerWidth / 2;
        this.clientY = window.innerHeight / 2;
        
        this.isFlipped = false;
        
        this.init();
    }

    init() {
        // 1. Crear Cursor
        this.cursor.innerHTML = '<div class="cursor-inner"></div><div class="cursor-outer"></div>';

        // 2. BLOQUEO DE ARRASTRE NATIVO (El Fix Real)
        window.addEventListener('dragstart', e => e.preventDefault(), { passive: false });
        
        // 3. BUCLE VISUAL (Render Loop)
        // Desacopla la vista de los eventos. Si el evento se traba, esto sigue pintando.
        const render = () => {
            this.cursor.style.transform = `translate3d(${this.clientX}px, ${this.clientY}px, 0)`;
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);

        // 4. EVENTOS (Pointer API - Unificada y Robusta)
        this.setupEventListeners();
    }

    setupEventListeners() {
        // MOVIMIENTO (Funciona para Mouse, Touch y Pen a la vez)
        window.addEventListener('pointermove', (e) => {
            this.clientX = e.clientX;
            this.clientY = e.clientY;
            
            // Lógica visual extra
            this.cursor.classList.remove('hidden');
            this.updateCardTilt(e.clientX, e.clientY);
            
            // Reset timer inactividad
            clearTimeout(this.cursorTimer);
            this.cursorTimer = setTimeout(() => this.cursor.classList.add('hidden'), 3000);
        }, { passive: true });

        // CLICKS (MANTENER PRESIONADO)
        window.addEventListener('pointerdown', (e) => {
            this.cursor.classList.add('clicked'); // Activa la animación CSS
            
            if (!this.isFlipped && this.cardWrapper) {
                this.cardWrapper.style.transform += ' scale(0.98)';
            }
        }, { passive: true });

        // SOLTAR CLICK
        window.addEventListener('pointerup', () => {
            this.cursor.classList.remove('clicked');
            
            if (!this.isFlipped && this.cardWrapper) {
                // Limpieza segura del scale
                const current = this.cardWrapper.style.transform;
                this.cardWrapper.style.transform = current.replace(' scale(0.98)', '');
            }
        }, { passive: true });

        // HOVER INTELIGENTE
        setTimeout(() => {
            const targets = document.querySelectorAll('a, button, .interactive, #audio-btn');
            targets.forEach(el => {
                el.addEventListener('pointerenter', () => this.cursor.classList.add('hovered'));
                el.addEventListener('pointerleave', () => this.cursor.classList.remove('hovered'));
            });
        }, 500);

        // CLICK TARJETA
        if (this.cardWrapper) {
            this.cardWrapper.addEventListener('click', (e) => this.handleCardClick(e));
        }
    }

    // --- MÉTODOS AUXILIARES ---
    updateCardTilt(x, y) {
        if (this.isFlipped || !this.cardWrapper) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        
        if (this.shine) {
            this.shine.style.setProperty('--x', `${(x / w) * 100}%`);
            this.shine.style.setProperty('--y', `${(y / h) * 100}%`);
        }

        const rx = ((h/2) - y) / 30;
        const ry = (x - (w/2)) / 30;
        this.cardWrapper.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    }

    handleCardClick(e) {
        if (!this.cardWrapper) return;
        const rect = this.cardWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const dir = (Math.abs(x - rect.width/2) > Math.abs(y - rect.height/2))
            ? (x < rect.width/2 ? 'left' : 'right')
            : (y < rect.height/2 ? 'top' : 'bottom');
            
        this.flipCard(dir);
    }

    flipCard(dir) {
        this.isFlipped = !this.isFlipped;
        const deg = this.isFlipped ? 180 : 0;
        const axis = (dir === 'left' || dir === 'right') ? 'Y' : 'X';
        this.cardWrapper.style.transition = 'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)';
        this.cardWrapper.style.transform = `rotate${axis}(${deg}deg)`;
        setTimeout(() => {
            if (!this.isFlipped) this.cardWrapper.style.transition = '';
        }, 800);
    }
}
