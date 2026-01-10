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
    };

    if (!faceData) {
      analysis.indicators.noFace = true;
      analysis.confusionScore = 40;
      this.updateHistory(analysis);
      return analysis;
    }

    let score = 0;

    if (faceData.topLeft && faceData.bottomRight) {
      const faceCenter = {
        x: (faceData.topLeft[0] + faceData.bottomRight[0]) / 2,
        y: (faceData.topLeft[1] + faceData.bottomRight[1]) / 2
      };
      
      const frameWidth = features.frameWidth || 640;
      const centerOffset = Math.abs(faceCenter.x - frameWidth / 2) / frameWidth;
      
      if (centerOffset > 0.3) {
        score += 20;
        analysis.indicators.lookingAway = true;
      }
    }

    if (faceData.landmarks && faceData.landmarks.length >= 6) {
      const leftEye = faceData.landmarks[0];
      const rightEye = faceData.landmarks[1];
      
      if (leftEye && rightEye) {
        const eyeTilt = Math.abs(leftEye[1] - rightEye[1]);
        if (eyeTilt > 10) {
          score += 15;
          analysis.indicators.headTilt = true;
        }
      }
    }

    if (features.brightness !== undefined && features.brightness < 0.3) {
      score += 10;
      analysis.indicators.lowBrightness = true;
    }

    if (features.symmetry !== undefined && features.symmetry < 0.6) {
      score += 15;
      analysis.indicators.asymmetric = true;
    }

    const recentConfusion = this.getRecentConfusionAverage();
    if (recentConfusion > 50) score += 10;

    score += (Math.random() - 0.5) * 20;
    analysis.confusionScore = Math.max(0, Math.min(100, score));
    
    this.updateHistory(analysis);
    return analysis;
  }

  updateHistory(analysis) {
    this.history.push(analysis);
    if (this.history.length > this.maxHistory) this.history.shift();
  }

  getRecentConfusionAverage(frames = 10) {
    const recent = this.history.slice(-frames);
    if (recent.length === 0) return 0;
    return recent.reduce((acc, a) => acc + a.confusionScore, 0) / recent.length;
  }

  getSmoothedConfusion() {
    if (this.history.length === 0) return 0;
    
    let weightedSum = 0;
    let weightTotal = 0;
    
    this.history.forEach((analysis, index) => {
      const weight = index + 1;
      weightedSum += analysis.confusionScore * weight;
      weightTotal += weight;
    });
    
    return Math.round(weightedSum / weightTotal);
  }

  reset() { this.history = []; }
}

class ConfuSenseDetector {
  constructor(options = {}) {
    this.options = {
      detectionInterval: 1000,
      confusionThreshold: 70,
      sustainedDuration: 20000,
      useTFModel: false,
      ...options
    };

    this.faceDetector = new FaceDetector();
    this.analyzer = new HeuristicAnalyzer();
    
    this.isInitialized = false;
    this.isRunning = false;
    this.videoElement = null;
    this.canvas = null;
    this.ctx = null;

    this.currentConfusion = 0;
    this.sustainedConfusionStart = null;
    this.lastDetectionTime = 0;

    this.onConfusionUpdate = null;
    this.onConfusionAlert = null;
    this.onError = null;
  }

  async initialize() {
    if (this.isInitialized) return true;

    try {
      console.log('[ConfuSense] Initializing detector...');
      await this.faceDetector.load();
      
      this.canvas = document.createElement('canvas');
      this.canvas.width = 320;
      this.canvas.height = 240;
      this.ctx = this.canvas.getContext('2d');

      this.isInitialized = true;
      console.log('[ConfuSense] Detector initialized');
      return true;
    } catch (error) {
      console.error('[ConfuSense] Init error:', error);
      if (this.onError) this.onError(error);
      return false;
    }
  }

  async start(videoElement) {
    if (!this.isInitialized) await this.initialize();
    if (this.isRunning) { console.log('[ConfuSense] Already running'); return; }

    this.videoElement = videoElement;
    this.isRunning = true;
    this.analyzer.reset();

    console.log('[ConfuSense] Detection started');
    this.runDetectionLoop();
  }

  stop() {
    this.isRunning = false;
    this.analyzer.reset();
    console.log('[ConfuSense] Detection stopped');
  }

  async runDetectionLoop() {
    if (!this.isRunning) return;

    const now = Date.now();
    if (now - this.lastDetectionTime >= this.options.detectionInterval) {
      await this.detectConfusion();
      this.lastDetectionTime = now;
    }

    requestAnimationFrame(() => this.runDetectionLoop());
  }

  async detectConfusion() {
    if (!this.videoElement || this.videoElement.readyState < 2) return;

    try {
      this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
      const faces = await this.faceDetector.detectFaces(this.videoElement);
      const features = this.extractFeatures();

      let analysis;
      if (faces.length > 0) {
        analysis = this.analyzer.analyzeFrame(faces[0], features);
      } else {
        analysis = this.analyzer.analyzeFrame(null, features);
      }

      this.currentConfusion = this.analyzer.getSmoothedConfusion();
      this.checkSustainedConfusion();
