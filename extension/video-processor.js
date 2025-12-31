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

    try {
      this.ctx.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);
      return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    } catch (error) {
      console.error('[ConfuSense Video] Capture error:', error);
      return null;
    }
  }

  processFrame(source) {
    if (!this.isReady) this.init();

    try {
      this.ctx.drawImage(source, 0, 0, this.canvas.width, this.canvas.height);
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const features = this.extractFeatures(imageData);
      const motion = this.detectMotion(imageData);

      this.previousFrame = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width, imageData.height
      );

      return { success: true, imageData, features, motion, timestamp: Date.now() };
    } catch (error) {
      console.error('[ConfuSense Video] Processing error:', error);
      return { success: false, error: error.message };
    }
  }
