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
        this.setupEventListeners();
        this.initializeCursor();
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
            this.cursor.style.display = 'none';
            document.body.style.cursor = 'auto';
        } else {
            this.cursor.classList.add('hidden');
        }
    }

    setupEventListeners() {
        if (this.isTouchDevice) {
            return;
        }

        window.addEventListener('pointermove', (e) => this.handleMove(e));
        window.addEventListener('pointerdown', () => this.handleDown());
        window.addEventListener('pointerup', () => this.handleUp());
        
        // Detectar hover sobre elementos interactivos después de un pequeño delay
        setTimeout(() => {
            document.querySelectorAll('a, button, [role="button"], .interactive, #audio-btn').forEach(el => {
                el.addEventListener('mouseenter', () => this.handleHoverEnter());
                el.addEventListener('mouseleave', () => this.handleHoverLeave());
            });
        }, 100);
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
        const width = window.innerWidth;
        const height = window.innerHeight;
        const centerX = width / 2;
        const centerY = height / 2;
        const rotateX = (centerY - e.clientY) / 25;
        const rotateY = (e.clientX - centerX) / 25;

        this.cardWrapper.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        this.shine.style.setProperty('--x', `${(e.clientX / width) * 100}%`);
        this.shine.style.setProperty('--y', `${(e.clientY / height) * 100}%`);
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
