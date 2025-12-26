export class CursorManager {
    constructor(cursorElement, cardWrapper, shine) {
        this.cursor = cursorElement;
        this.cursorInner = null;
        this.cursorOuter = null;
        this.cardWrapper = cardWrapper;
        this.shine = shine;
        this.mouseX = window.innerWidth / 2;
        this.mouseY = window.innerHeight / 2;
        this.cursorTimer = null;
        this.isTouchDevice = this.detectTouch();
        
        this.createCursorElements();
        this.initializeCursor();
        this.setupEventListeners();
    }

    detectTouch() {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (navigator.msMaxTouchPoints > 0);
    }

    createCursorElements() {
        // Limpiar cursor existente
        this.cursor.innerHTML = '';
        
        // Crear inner cursor (punto central)
        this.cursorInner = document.createElement('div');
        this.cursorInner.className = 'cursor-inner';
        
        // Crear outer cursor (anillo exterior)
        this.cursorOuter = document.createElement('div');
        this.cursorOuter.className = 'cursor-outer';
        
        // Agregar al contenedor principal
        this.cursor.appendChild(this.cursorInner);
        this.cursor.appendChild(this.cursorOuter);
    }

    initializeCursor() {
        if (this.isTouchDevice) {
            // En móvil, ocultar el cursor personalizado inicialmente
            this.cursor.classList.add('hidden');
            // Permitir cursor nativo del sistema
            document.body.style.cursor = 'auto';
        } else {
            // En desktop, ocultar inicialmente hasta que haya movimiento
            this.cursor.classList.add('hidden');
        }
    }

    setupEventListeners() {
        if (!this.isTouchDevice) {
            // Eventos para desktop (mouse)
            window.addEventListener('pointermove', (e) => this.handleMove(e));
            window.addEventListener('pointerdown', () => this.handleDown());
            window.addEventListener('pointerup', () => this.handleUp());
            
            // Detectar hover sobre elementos interactivos
            setTimeout(() => {
                document.querySelectorAll('a, button, [role="button"], .interactive, #audio-btn').forEach(el => {
                    el.addEventListener('mouseenter', () => this.handleHoverEnter());
                    el.addEventListener('mouseleave', () => this.handleHoverLeave());
                });
            }, 100);
        } else {
            // Eventos para dispositivos táctiles
            window.addEventListener('touchstart', (e) => this.handleTouchStart(e));
            window.addEventListener('touchmove', (e) => this.handleTouchMove(e));
            window.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        }
    }

    handleMove(e) {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        
        // Posicionar cursor
        this.cursor.style.left = e.clientX + 'px';
        this.cursor.style.top = e.clientY + 'px';
        
        // Mostrar cursor con animación suave
        this.cursor.classList.remove('hidden');
        
        // Reiniciar timer de ocultación
        clearTimeout(this.cursorTimer);
        this.cursorTimer = setTimeout(() => {
            this.cursor.classList.add('hidden');
        }, 2000);

        // Efectos 3D en la tarjeta
        this.apply3DEffects(e.clientX, e.clientY);
    }

    handleTouchStart(e) {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            this.mouseX = touch.clientX;
            this.mouseY = touch.clientY;
            
            // Mostrar cursor en la posición del toque
            this.cursor.style.left = touch.clientX + 'px';
            this.cursor.style.top = touch.clientY + 'px';
            this.cursor.classList.remove('hidden');
            this.cursor.classList.add('active');
            
            // Aplicar efectos 3D
            this.apply3DEffects(touch.clientX, touch.clientY);
        }
    }

    handleTouchMove(e) {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            this.mouseX = touch.clientX;
            this.mouseY = touch.clientY;
            
            // Actualizar posición del cursor
            this.cursor.style.left = touch.clientX + 'px';
            this.cursor.style.top = touch.clientY + 'px';
            this.cursor.classList.remove('hidden');
            
            // Aplicar efectos 3D
            this.apply3DEffects(touch.clientX, touch.clientY);
        }
    }

    handleTouchEnd(e) {
        // Ocultar cursor después de soltar el toque
        this.cursor.classList.add('hidden');
        this.cursor.classList.remove('active');
        
        // Resetear transformación de la tarjeta
        this.cardWrapper.style.transform = 'rotateX(0deg) rotateY(0deg)';
    }

    apply3DEffects(clientX, clientY) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const centerX = width / 2;
        const centerY = height / 2;
        const rotateX = (centerY - clientY) / 25;
        const rotateY = (clientX - centerX) / 25;

        this.cardWrapper.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        this.shine.style.setProperty('--x', `${(clientX / width) * 100}%`);
        this.shine.style.setProperty('--y', `${(clientY / height) * 100}%`);
    }

    handleDown() {
        this.cursor.classList.add('active');
        this.cardWrapper.style.transform += ' scale(0.985)';
    }

    handleUp() {
        this.cursor.classList.remove('active');
    }

    handleHoverEnter() {
        this.cursor.classList.add('hover');
    }

    handleHoverLeave() {
        this.cursor.classList.remove('hover');
    }

    getMousePosition() {
        return { x: this.mouseX, y: this.mouseY };
    }
}
