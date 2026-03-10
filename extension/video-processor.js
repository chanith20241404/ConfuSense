// ConfuSense Video Processor v4.0 — batch mode (10 frames)

(function () {
  'use strict';

  class ConfuSenseVideoProcessor {
    constructor() {
      this.stream = null;
      this.video = null;
      this.canvas = null;
      this.ctx = null;
      this.captureTimer = null;
      this.isRunning = false;
      this.isPaused = false;
      this.serverUrl = 'http://localhost:3000';
      this.uuid = null;
      this.meetingId = null;

      this.CAPTURE_INTERVAL_MS = 1000; // capture 1 frame per second
      this.BATCH_SIZE = 10;            // send batch of 10 frames
      this.frameBuffer = [];

      this.onCameraLost = null;
    }

    async start(uuid, meetingId, serverUrl) {
      if (this.isRunning) return;
      this.uuid = uuid;
      this.meetingId = meetingId;
      if (serverUrl) this.serverUrl = serverUrl;

      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user', frameRate: { ideal: 15 } },
          audio: false
        });

        for (const track of this.stream.getTracks()) {
          track.addEventListener('ended', () => {
            if (this.isRunning) {
              console.warn('[VideoProcessor] Camera track ended unexpectedly');
              this.stop();
              if (this.onCameraLost) this.onCameraLost();
            }
          });
        }

        this.video = document.createElement('video');
        this.video.srcObject = this.stream;
        this.video.autoplay = true;
        this.video.playsInline = true;
        this.video.muted = true;
        this.video.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:320px;height:240px;opacity:0;pointer-events:none;';
        document.body.appendChild(this.video);

        this.canvas = document.createElement('canvas');
        this.canvas.width  = 320;
        this.canvas.height = 240;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        await this.video.play();

        this.isRunning = true;
        this.frameBuffer = [];

        this.captureTimer = setInterval(() => this._captureFrame(), this.CAPTURE_INTERVAL_MS);

        console.log(`[VideoProcessor] Started — capturing 1 frame/sec, sending batch of ${this.BATCH_SIZE} every ${this.BATCH_SIZE}s`);
      } catch (err) {
        console.error('[VideoProcessor] Failed to start:', err.message);
        throw err;
      }
    }

    stop() {
      if (!this.isRunning) return;
      this.isRunning = false;

      clearInterval(this.captureTimer);
      this.captureTimer = null;
      this.frameBuffer = [];

      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
      }
      if (this.video) {
        this.video.remove();
        this.video = null;
      }

      console.log('[VideoProcessor] Stopped');
    }

    pause() {
      this.isPaused = true;
      console.log('[VideoProcessor] Paused (cooldown)');
    }

    resume() {
