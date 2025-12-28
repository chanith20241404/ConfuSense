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
