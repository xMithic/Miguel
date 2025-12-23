export class CursorManager {
  constructor(cursorElement, cardWrapper, shine) {
    this.cursor = cursorElement;
    this.cardWrapper = cardWrapper;
    this.shine = shine;
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;
    this.cursorTimer = null;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('pointermove', (e) => this.handleMove(e));
    window.addEventListener('pointerdown', () => this.handleDown());
    window.addEventListener('pointerup', () => this.handleUp());
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
    }, 2500);

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

  getMousePosition() {
    return { x: this.mouseX, y: this.mouseY };
  }
}

