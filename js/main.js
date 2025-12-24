import { ColorSampler } from './utils/colorSampler.js';
import { AudioAnalyzer } from './modules/audioAnalyzer.js';
import { ParticleSystem } from './modules/particleSystem.js';
import { CursorManager } from './modules/cursorManager.js';
import { DrawingCanvas } from './modules/drawingCanvas.js';
import { VideoController } from './modules/videoController.js';
import { SurpriseSystem } from './modules/surpriseSystem.js'; // Asegúrate de importar esto

document.addEventListener('DOMContentLoaded', () => {
  // Elementos del DOM
  const mainVideo = document.getElementById('main-video');
  const bgVideo = document.getElementById('background-layer');
  const cardWrapper = document.getElementById('card-wrapper');
  const shine = document.querySelector('.card-shine');
  const cursor = document.getElementById('custom-cursor');
  const audioBtn = document.getElementById('audio-btn');
  const pCanvas = document.getElementById('particle-canvas');
  const dCanvas = document.getElementById('drawing-canvas');

  // Inicializar módulos
  const colorSampler = new ColorSampler(mainVideo);
  const audioAnalyzer = new AudioAnalyzer(mainVideo);
  const cursorManager = new CursorManager(cursor, cardWrapper, shine);
  const drawingCanvas = new DrawingCanvas(dCanvas, cursorManager, audioBtn);
  const particleSystem = new ParticleSystem(pCanvas, colorSampler, audioAnalyzer);
  
  // Instancia de Sorpresa
  const surpriseSystem = new SurpriseSystem();

  // Inicializar VideoController (Maneja el audio normal)
  const videoController = new VideoController(mainVideo, bgVideo, audioBtn, audioAnalyzer);

  /* ----------------------------------------------------
     LÓGICA DEL BOTÓN (Pulsación Larga vs Click Normal)
     ---------------------------------------------------- */
  let pressTimer;
  let isLongPress = false;

  const startPress = (e) => {
      if (e.type === 'mousedown' && e.button !== 0) return; // Ignorar clic derecho
      
      isLongPress = false;
      
      // Esperar 2 segundos
      pressTimer = setTimeout(() => {
          isLongPress = true;
          
          // 1. Disparar sorpresa
          surpriseSystem.trigger(); 
          
          // 2. IMPORTANTE: Evitar que el botón corte la música
          // Hack temporal: Le quitamos el evento de clic al VideoController un momento
          audioBtn.style.pointerEvents = "none"; 
          setTimeout(() => { audioBtn.style.pointerEvents = "auto"; }, 500);

      }, 2000); 
  };

  const cancelPress = (e) => {
      clearTimeout(pressTimer);
  };

  // Asignar eventos
  audioBtn.addEventListener('mousedown', startPress);
  audioBtn.addEventListener('touchstart', startPress, { passive: true });
  
  audioBtn.addEventListener('mouseup', cancelPress);
  audioBtn.addEventListener('mouseleave', cancelPress);
  audioBtn.addEventListener('touchend', cancelPress);

  // Resize handler básico
  const resize = () => {
    pCanvas.width = window.innerWidth;
    pCanvas.height = window.innerHeight;
    dCanvas.width = window.innerWidth;
    dCanvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resize);
  resize();

  // Iniciar sistema de partículas
  particleSystem.start();

  // Loop de audio
  function audioLoop() {
    audioAnalyzer.update();
    requestAnimationFrame(audioLoop);
  }
  audioLoop();
});
