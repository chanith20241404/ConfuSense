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
