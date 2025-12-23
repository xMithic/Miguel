// Módulo para análisis de audio
export class AudioAnalyzer {
  constructor(videoElement) {
    this.videoElement = videoElement;
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.source = null;
    
    this.musicState = {
      bass: 0,
      mid: 0,
      treble: 0,
      level: 0,
      impact: 0
    };
    
    this.prevBass = 0;
  }

  async init() {
    if (this.audioContext) return;
    
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioCtx();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;

    this.source = this.audioContext.createMediaElementSource(this.videoElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  update() {
    if (!this.analyser) return;
    
    this.analyser.getByteFrequencyData(this.dataArray);

    const bassRange = this.dataArray.slice(0, 10);
    const midRange = this.dataArray.slice(10, 80);
    const trebleRange = this.dataArray.slice(80, 200);

    const avg = arr => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);

    const b = avg(bassRange) / 255;
    const m = avg(midRange) / 255;
    const t = avg(trebleRange) / 255;

    this.musicState.bass += (b - this.musicState.bass) * 0.3;
    this.musicState.mid += (m - this.musicState.mid) * 0.2;
    this.musicState.treble += (t - this.musicState.treble) * 0.2;
    this.musicState.level = (this.musicState.bass + this.musicState.mid + this.musicState.treble) / 3;

    // Detector de impacto
    const bassDelta = this.musicState.bass - this.prevBass;
    if (bassDelta > 0.15) {
      this.musicState.impact = 1;
    }
    this.musicState.impact *= 0.92;
    this.prevBass = this.musicState.bass;

    // Actualizar UI
    if (!this.videoElement.muted && this.musicState.level > 0.05) {
      document.body.classList.add('playing');
    } else {
      document.body.classList.remove('playing');
    }
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  getState() {
    return this.musicState;
  }
}

