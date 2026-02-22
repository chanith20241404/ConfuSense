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

  extractFaceRegion(imageData, boundingBox) {
    if (!boundingBox) {
      const size = Math.min(imageData.width, imageData.height) * 0.6;
      boundingBox = {
        x: (imageData.width - size) / 2,
        y: (imageData.height - size) / 2,
        width: size, height: size
      };
    }

    const padding = 0.2;
    const padX = boundingBox.width * padding;
    const padY = boundingBox.height * padding;
    
    const x = Math.max(0, boundingBox.x - padX);
    const y = Math.max(0, boundingBox.y - padY);
    const width = Math.min(imageData.width - x, boundingBox.width + 2 * padX);
    const height = Math.min(imageData.height - y, boundingBox.height + 2 * padY);

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = this.config.targetSize.width;
    cropCanvas.height = this.config.targetSize.height;
    const cropCtx = cropCanvas.getContext('2d');

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);

    cropCtx.drawImage(tempCanvas, x, y, width, height, 0, 0, cropCanvas.width, cropCanvas.height);

    const croppedData = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
    const grayscale = this.toGrayscale(croppedData);

    return { imageData: grayscale, canvas: cropCanvas, boundingBox: { x, y, width, height } };
  }

  toGrayscale(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = data[i + 1] = data[i + 2] = gray;
    }
    return imageData;
  }

  extractFeatures(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const pixelCount = width * height;

    let sum = 0, sumSq = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      sum += gray;
      sumSq += gray * gray;
    }

    const brightness = sum / pixelCount / 255;
    const mean = sum / pixelCount;
    const variance = (sumSq / pixelCount) - (mean * mean);
    const contrast = Math.sqrt(variance) / 255;

    let edgeSum = 0;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const gx = data[idx + 4] - data[idx - 4];
        const gy = data[idx + width * 4] - data[idx - width * 4];
        edgeSum += Math.sqrt(gx * gx + gy * gy);
      }
    }
    const edgeDensity = edgeSum / ((width - 2) * (height - 2)) / 255;

    let symmetrySum = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < Math.floor(width / 2); x++) {
        const leftIdx = (y * width + x) * 4;
        const rightIdx = (y * width + (width - 1 - x)) * 4;
        symmetrySum += 1 - Math.abs(data[leftIdx] - data[rightIdx]) / 255;
      }
    }
    const symmetry = symmetrySum / (height * Math.floor(width / 2));

    return { brightness, contrast, edgeDensity, symmetry };
  }

  detectMotion(currentFrame) {
    if (!this.previousFrame) return { hasMotion: false, magnitude: 0, direction: 'none' };

    const current = currentFrame.data;
    const previous = this.previousFrame.data;
    const width = currentFrame.width;
    const height = currentFrame.height;

    let diffSum = 0;
    let leftDiff = 0;
    let rightDiff = 0;
    const pixelCount = current.length / 4;
    const halfWidth = Math.floor(width / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const diff = Math.abs(current[i] - previous[i]);
        diffSum += diff;
        if (x < halfWidth) leftDiff += diff;
        else rightDiff += diff;
      }
    }

    const avgDiff = diffSum / pixelCount;
    const direction = leftDiff > rightDiff * 1.3 ? 'left' : rightDiff > leftDiff * 1.3 ? 'right' : 'center';
    return { hasMotion: avgDiff > 10, magnitude: avgDiff / 255, direction };
  }

  getCanvas() { return this.canvas; }

  destroy() {
    this.canvas = null;
    this.ctx = null;
    this.previousFrame = null;
    this.isReady = false;
  }
}

window.ConfuSenseVideoProcessor = ConfuSenseVideoProcessor;
