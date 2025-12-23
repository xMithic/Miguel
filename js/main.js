import { ColorSampler } from './utils/colorSampler.js';
import { AudioAnalyzer } from './modules/audioAnalyzer.js';
import { ParticleSystem } from './modules/particleSystem.js';
import { CursorManager } from './modules/cursorManager.js';
import { DrawingCanvas } from './modules/drawingCanvas.js';
import { VideoController } from './modules/videoController.js';

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

  // Resize handler
  const resize = () => {
    pCanvas.width = window.innerWidth;
    pCanvas.height = window.innerHeight;
    dCanvas.width = window.innerWidth;
    dCanvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resize);
  resize();

  // Inicializar módulos
  const colorSampler = new ColorSampler(mainVideo);
  const audioAnalyzer = new AudioAnalyzer(mainVideo);
  const cursorManager = new CursorManager(cursor, cardWrapper, shine);
  const drawingCanvas = new DrawingCanvas(dCanvas, cursorManager, audioBtn);
  const videoController = new VideoController(mainVideo, bgVideo, audioBtn, audioAnalyzer);
  const particleSystem = new ParticleSystem(pCanvas, colorSampler, audioAnalyzer);

  // Iniciar sistema de partículas
  particleSystem.start();

  // Loop de actualización de audio
  function audioLoop() {
    audioAnalyzer.update();
    requestAnimationFrame(audioLoop);
  }
  audioLoop();
});
