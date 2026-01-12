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
    
