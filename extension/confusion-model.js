/**
 * ConfuSense Confusion Detection Model
 * Heuristic-based detection + optional TensorFlow.js model
 * Sprint 2: ML Pipeline (Heuristic Fallback)
 */

class FaceDetector {
  constructor() {
    this.model = null;
    this.isLoaded = false;
  }

  async load() {
    if (this.isLoaded) return true;

    try {
      if (typeof blazeface !== 'undefined') {
        this.model = await blazeface.load();
        this.isLoaded = true;
        console.log('[ConfuSense] BlazeFace loaded');
        return true;
      }
    } catch (e) {
      console.warn('[ConfuSense] BlazeFace not available');
    }

    this.isLoaded = true;
    console.log('[ConfuSense] Using fallback face detection');
    return true;
  }

  async detectFaces(videoElement) {
    if (!this.isLoaded) await this.load();

    if (this.model) {
      try {
        const predictions = await this.model.estimateFaces(videoElement, false);
        return predictions.map(pred => ({
          topLeft: pred.topLeft,
          bottomRight: pred.bottomRight,
          landmarks: pred.landmarks,
          probability: pred.probability?.[0] || 0.9
        }));
      } catch (e) {
        console.error('[ConfuSense] Face detection error:', e);
      }
    }

    const width = videoElement.videoWidth || videoElement.width || 640;
    const height = videoElement.videoHeight || videoElement.height || 480;
    const faceSize = Math.min(width, height) * 0.6;
    const x = (width - faceSize) / 2;
    const y = (height - faceSize) / 2;

    return [{
      topLeft: [x, y],
      bottomRight: [x + faceSize, y + faceSize],
      landmarks: null,
      probability: 0.7
    }];
  }
}

class HeuristicAnalyzer {
  constructor() {
    this.history = [];
    this.maxHistory = 30;
  }

  analyzeFrame(faceData, features = {}) {
    const analysis = {
      timestamp: Date.now(),
      faceDetected: faceData !== null,
      confusionScore: 0,
      indicators: {}
