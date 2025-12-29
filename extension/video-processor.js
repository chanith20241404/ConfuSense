class ConfuSenseVideoProcessor {
  constructor() {
    this.isReady = false;
    this.config = {
      targetSize: { width: 48, height: 48 },
      captureSize: { width: 320, height: 240 }
    };
    this.canvas = null;
    this.ctx = null;
    this.previousFrame = null;
  }

  async init() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.captureSize.width;
    this.canvas.height = this.config.captureSize.height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.isReady = true;
    console.log('[ConfuSense Video] Processor initialized');
    return true;
  }

  captureFrame(videoElement) {
    if (!this.isReady) this.init();
    if (!videoElement || videoElement.readyState < 2) return null;
