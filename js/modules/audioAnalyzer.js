// Módulo mejorado para análisis de audio
export class AudioAnalyzer {
  constructor(videoElement, options = {}) {
    this.videoElement = videoElement;
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.source = null;
    
    // Configuración personalizable
    this.config = {
      fftSize: options.fftSize || 2048, // Mayor resolución en graves
      smoothing: options.smoothing || 0.75,
      impactThreshold: options.impactThreshold || 0.15,
      minLevel: options.minLevel || 0.05,
      ...options
    };
    
    this.musicState = {
      bass: 0,
      mid: 0,
      treble: 0,
      level: 0,
      impact: 0,
      beat: false,
      bpm: 0
    };
    
    // Históricos para cálculos
    this.prevBass = 0;
    this.avgBass = 0;
    this.lastBeatTime = 0;
    this.beatIntervals = [];
    
    // Arrays pre-asignados para mejor rendimiento
    this.bassIndices = { start: 0, end: 0 };
    this.midIndices = { start: 0, end: 0 };
    this.trebleIndices = { start: 0, end: 0 };
    
    this.isInitialized = false;
  }

  async init() {
    if (this.audioContext) return true;
    
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API no soportada');
        return false;
      }

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = this.config.smoothing;

      this.source = this.audioContext.createMediaElementSource(this.videoElement);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      // Calcular índices de frecuencia más precisos
      this.calculateFrequencyRanges();
      
      this.isInitialized = true;
      return true;
      
    } catch(e) {
      console.error('Error inicializando audio analyzer:', e);
      return false;
    }
  }

  calculateFrequencyRanges() {
    // Calcula rangos basados en frecuencias reales
    const nyquist = this.audioContext.sampleRate / 2;
    const binWidth = nyquist / this.analyser.frequencyBinCount;
    
    // Bass: 20-250 Hz
    this.bassIndices.start = Math.floor(20 / binWidth);
    this.bassIndices.end = Math.floor(250 / binWidth);
    
    // Mid: 250-2000 Hz
    this.midIndices.start = this.bassIndices.end;
    this.midIndices.end = Math.floor(2000 / binWidth);
    
    // Treble: 2000-20000 Hz
    this.trebleIndices.start = this.midIndices.end;
    this.trebleIndices.end = Math.min(
      Math.floor(20000 / binWidth),
      this.analyser.frequencyBinCount
    );
  }

  update() {
    if (!this.analyser || !this.isInitialized) return;
    
    this.analyser.getByteFrequencyData(this.dataArray);

    // Calcular promedios por rango
    const bass = this.getAverageFrequency(this.bassIndices.start, this.bassIndices.end);
    const mid = this.getAverageFrequency(this.midIndices.start, this.midIndices.end);
    const treble = this.getAverageFrequency(this.trebleIndices.start, this.trebleIndices.end);

    // Suavizado con diferentes velocidades
    this.musicState.bass += (bass - this.musicState.bass) * 0.3;
    this.musicState.mid += (mid - this.musicState.mid) * 0.2;
    this.musicState.treble += (treble - this.musicState.treble) * 0.2;
    this.musicState.level = (this.musicState.bass + this.musicState.mid + this.musicState.treble) / 3;

    // Actualizar promedio de bass para detección de beats
    this.avgBass += (this.musicState.bass - this.avgBass) * 0.05;

    // Detector de impacto mejorado
    const bassDelta = this.musicState.bass - this.prevBass;
    if (bassDelta > this.config.impactThreshold) {
      this.musicState.impact = 1;
    }
    this.musicState.impact *= 0.92;

    // Detector de beats con threshold adaptativo
    this.musicState.beat = this.detectBeat();
    
    this.prevBass = this.musicState.bass;

    // Actualizar UI
    this.updateUI();
  }

  getAverageFrequency(start, end) {
    let sum = 0;
    const count = end - start;
    
    for (let i = start; i < end; i++) {
      sum += this.dataArray[i];
    }
    
    return count > 0 ? (sum / count) / 255 : 0;
  }

  detectBeat() {
    const now = Date.now();
    const timeSinceLastBeat = now - this.lastBeatTime;
    
    // Threshold adaptativo basado en promedio
    const threshold = this.musicState.bass > (this.avgBass * 1.4) && 
                      this.musicState.bass > 0.3;
    
    // Evitar detecciones dobles (mínimo 300ms entre beats)
    if (threshold && timeSinceLastBeat > 300) {
      // Calcular BPM basado en intervalos
      this.beatIntervals.push(timeSinceLastBeat);
      if (this.beatIntervals.length > 8) {
        this.beatIntervals.shift();
      }
      
      // Promedio de intervalos para estimar BPM
      if (this.beatIntervals.length > 3) {
        const avgInterval = this.beatIntervals.reduce((a, b) => a + b) / this.beatIntervals.length;
        this.musicState.bpm = Math.round(60000 / avgInterval);
      }
      
      this.lastBeatTime = now;
      return true;
    }
    
    return false;
  }

  updateUI() {
    const isPlaying = !this.videoElement.muted && 
                      this.musicState.level > this.config.minLevel;
    
    if (isPlaying) {
      document.body.classList.add('playing');
      
      // Añadir clase temporal en beats para efectos visuales
      if (this.musicState.beat) {
        document.body.classList.add('beat');
        setTimeout(() => document.body.classList.remove('beat'), 100);
      }
    } else {
      document.body.classList.remove('playing');
    }
    
    // Actualizar variables CSS para efectos visuales
    document.documentElement.style.setProperty('--audio-bass', this.musicState.bass);
    document.documentElement.style.setProperty('--audio-mid', this.musicState.mid);
    document.documentElement.style.setProperty('--audio-treble', this.musicState.treble);
    document.documentElement.style.setProperty('--audio-level', this.musicState.level);
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  pause() {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  getState() {
    return { ...this.musicState };
  }

  // Obtener datos de frecuencia crudos para visualizadores personalizados
  getRawFrequencyData() {
    return this.dataArray ? Array.from(this.dataArray) : [];
  }

  // Obtener espectro simplificado (útil para visualizadores)
  getSpectrum(barCount = 32) {
    if (!this.dataArray) return new Array(barCount).fill(0);
    
    const spectrum = [];
    const samplesPerBar = Math.floor(this.dataArray.length / barCount);
    
    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      const start = i * samplesPerBar;
      const end = start + samplesPerBar;
      
      for (let j = start; j < end; j++) {
        sum += this.dataArray[j];
      }
      
      spectrum.push(sum / samplesPerBar / 255);
    }
    
    return spectrum;
  }

  // Limpieza de recursos
  destroy() {
    try {
      if (this.source) {
        this.source.disconnect();
        this.source = null;
      }
      
      if (this.analyser) {
        this.analyser.disconnect();
        this.analyser = null;
      }
      
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
      
      this.dataArray = null;
      this.isInitialized = false;
      
    } catch(e) {
      console.error('Error limpiando audio analyzer:', e);
    }
  }
}

// Ejemplo de uso:
/*
const video = document.querySelector('video');
const analyzer = new AudioAnalyzer(video, {
  fftSize: 2048,
  smoothing: 0.75,
  impactThreshold: 0.15,
  minLevel: 0.05
});

await analyzer.init();

function animate() {
  analyzer.update();
  
  const state = analyzer.getState();
  console.log('Bass:', state.bass, 'BPM:', state.bpm, 'Beat:', state.beat);
  
  requestAnimationFrame(animate);
}

video.addEventListener('play', () => {
  analyzer.resume();
  animate();
});

// Al terminar:
// analyzer.destroy();
*/
