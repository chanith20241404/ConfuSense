/**
 * ConfuSense Federated Learning Client
 * Privacy-preserving local training and model sync
 * Sprint 3: Federated Learning
 */

class ConfuSenseFLClient {
  constructor(options = {}) {
    this.options = {
      clientId: this.generateClientId(),
      serverUrl: 'https://confusense-api.onrender.com',
      minSamplesForTraining: 20,
      localEpochs: 3,
      learningRate: 0.01,
      useDifferentialPrivacy: true,
      dpNoiseMultiplier: 0.1,
      dpL2NormClip: 1.0,
      syncInterval: 60000,
      ...options
    };

    this.trainingData = [];
    this.localModel = null;
    this.globalModelVersion = 0;
    this.isTraining = false;
    this.lastSyncTime = 0;
    this.syncInterval = null;

    this.onModelUpdated = null;
    this.onTrainingComplete = null;
    this.onSyncComplete = null;
  }

  generateClientId() {
    return 'client_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  async initialize(globalWeights = null) {
    console.log('[ConfuSense FL] Initializing client:', this.options.clientId);
    
    if (globalWeights) {
      this.localModel = this.cloneWeights(globalWeights);
    } else {
      await this.syncWithServer();
    }

    this.startPeriodicSync();
    return this;
  }

  addTrainingSample(features, label, metadata = {}) {
    this.trainingData.push({
      features: Array.isArray(features) ? features : Array.from(features),
      label: label,
      timestamp: Date.now(),
      ...metadata
    });

    if (this.trainingData.length > 1000) {
      this.trainingData = this.trainingData.slice(-1000);
    }

    if (this.trainingData.length >= this.options.minSamplesForTraining && !this.isTraining) {
      this.trainLocal();
    }
  }

  async trainLocal() {
    if (this.isTraining || this.trainingData.length < this.options.minSamplesForTraining) return null;

    this.isTraining = true;
    console.log('[ConfuSense FL] Starting local training with', this.trainingData.length, 'samples');

    try {
      const X = this.trainingData.map(s => s.features);
      const y = this.trainingData.map(s => s.label);
      const weightUpdates = await this.simulateTraining(X, y);

      let finalUpdates = weightUpdates;
      if (this.options.useDifferentialPrivacy) {
        finalUpdates = this.applyDifferentialPrivacy(weightUpdates);
      }

      const metrics = this.calculateMetrics(X, y);

      const update = {
        clientId: this.options.clientId,
        weights: finalUpdates,
        numSamples: this.trainingData.length,
        metrics: metrics,
