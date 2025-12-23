export class VideoController {
  constructor(mainVideo, bgVideo, audioBtn, audioAnalyzer) {
    this.mainVideo = mainVideo;
    this.bgVideo = bgVideo;
    this.audioBtn = audioBtn;
    this.audioAnalyzer = audioAnalyzer;
    
    this.setupVideoSync();
    this.setupAudioButton();
  }

  setupVideoSync() {
    this.mainVideo.addEventListener('play', () => {
      try {
        if (this.mainVideo.captureStream) {
          this.bgVideo.srcObject = this.mainVideo.captureStream();
        } else {
          this.bgVideo.src = this.mainVideo.currentSrc;
        }
        this.bgVideo.play().catch(() => {});
      } catch(e) {}
    }, { once: true });
  }

  setupAudioButton() {
    this.audioBtn.addEventListener('click', () => {
      this.audioAnalyzer.init().then(() => {
        this.audioAnalyzer.resume();
      });

      this.mainVideo.muted = !this.mainVideo.muted;
      this.audioBtn.classList.toggle('muted', this.mainVideo.muted);

      this.updateButtonIcon();
    });
  }

  updateButtonIcon() {
    const path = this.audioBtn.querySelector('path');
    if (this.mainVideo.muted) {
      path.setAttribute('d', 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9zM12 4L9.91 6.09 12 8.18V4z');
    } else {
      path.setAttribute('d', 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z');
    }
  }
}

