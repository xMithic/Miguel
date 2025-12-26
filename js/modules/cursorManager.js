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
        this.isFlipped = false;
        
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
        this.cursor.innerHTML = '';
        
        this.cursorInner = document.createElement('div');
        this.cursorInner.className = 'cursor-inner';
        
        this.cursorOuter = document.createElement('div');
        this.cursorOuter.className = 'cursor-outer';
        
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
            // En móvil, solo agregar evento de click para el flip
            this.cardWrapper.style.pointerEvents = 'auto';
            this.cardWrapper.addEventListener('click', (e) => this.handleCardClick(e));
            return;
        }

        // En PC, agregar todos los eventos
        window.addEventListener('pointermove', (e) => this.handleMove(e));
        window.addEventListener('pointerdown', (e) => this.handleDown(e));
        window.addEventListener('pointerup', () => this.handleUp());
        
        // Hacer la tarjeta clickeable
        this.cardWrapper.style.pointerEvents = 'auto';
        
        // Detectar hover sobre elementos interactivos
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
        
        this.cursor.style.left = e.clientX + 'px';
        this.cursor.style.top = e.clientY + 'px';
        
        this.cursor.classList.remove('hidden');
        
        clearTimeout(this.cursorTimer);
        this.cursorTimer = setTimeout(() => {
            this.cursor.classList.add('hidden');
        }, 2000);

        const width = window.innerWidth;
        const height = window.innerHeight;
        const centerX = width / 2;
        const centerY = height / 2;
        const rotateX = (centerY - e.clientY) / 25;
        const rotateY = (e.clientX - centerX) / 25;

        if (!this.isFlipped) {
            this.cardWrapper.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        }
        
        this.shine.style.setProperty('--x', `${(e.clientX / width) * 100}%`);
        this.shine.style.setProperty('--y', `${(e.clientY / height) * 100}%`);
    }

    handleDown(e) {
        this.cursor.classList.add('active');
        
        // Verificar si el click fue en la tarjeta
        if (e.target.closest('.card-wrapper')) {
            this.handleCardClick(e);
        } else {
            this.cardWrapper.style.transform += ' scale(0.985)';
        }
    }

    handleUp() {
        this.cursor.classList.remove('active');
    }

    handleCardClick(e) {
        // Obtener la posición del click relativa a la tarjeta
        const rect = this.cardWrapper.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Calcular el centro de la tarjeta
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Determinar la dirección del flip basado en dónde se hizo click
        let flipDirection = '';
        const threshold = 50; // píxeles desde el centro para determinar dirección
        
        if (Math.abs(clickX - centerX) > Math.abs(clickY - centerY)) {
            // Flip horizontal
            flipDirection = clickX < centerX ? 'left' : 'right';
        } else {
            // Flip vertical
            flipDirection = clickY < centerY ? 'top' : 'bottom';
        }
        
        // Aplicar el flip
        this.flipCard(flipDirection);
    }

    flipCard(direction) {
        this.isFlipped = !this.isFlipped;
        
        let transform = '';
        const flipDegrees = this.isFlipped ? 180 : 0;
        
        switch(direction) {
            case 'left':
            case 'right':
                transform = `rotateY(${flipDegrees}deg)`;
                break;
            case 'top':
            case 'bottom':
                transform = `rotateX(${flipDegrees}deg)`;
                break;
        }
        
        this.cardWrapper.style.transition = 'transform 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)';
        this.cardWrapper.style.transform = transform;
        
        // Restaurar transición después de la animación
        setTimeout(() => {
            if (!this.isFlipped) {
                this.cardWrapper.style.transition = '';
            }
        }, 800);
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
