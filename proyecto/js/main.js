// Utilidad para muestrear colores del video
export class ColorSampler {
  constructor(videoElement) {
    this.videoElement = videoElement;
    this.smCanvas = new OffscreenCanvas(64, 64);
    this.smCtx = this.smCanvas.getContext('2d', { willReadFrequently: true });
    
    // Actualizar muestra cada 180ms
    setInterval(() => this.updateSample(), 180);
  }

  updateSample() {
    const video = this.videoElement;
    if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
      this.smCtx.drawImage(video, 0, 0, this.smCanvas.width, this.smCanvas.height);
    }
  }

  sampleColor() {
    const w = this.smCanvas.width;
    const h = this.smCanvas.height;
    
    if (!w || !h) return { r: 255, g: 255, b: 255 };
    
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h);
    const data = this.smCtx.getImageData(x, y, 1, 1).data;
    
    return { r: data[0], g: data[1], b: data[2] };
  }

  static rgba(color, alpha) {
    return `rgba(${color.r},${color.g},${color.b},${alpha})`;
  }
}
