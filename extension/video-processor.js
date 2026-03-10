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
