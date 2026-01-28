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
        modelVersion: this.globalModelVersion,
        timestamp: Date.now()
      };

      await this.submitUpdate(update);
      this.trainingData = [];

      if (this.onTrainingComplete) this.onTrainingComplete(update);

      this.isTraining = false;
      return update;

    } catch (error) {
      console.error('[ConfuSense FL] Training error:', error);
      this.isTraining = false;
      return null;
    }
  }

  async simulateTraining(X, y) {
    const weights = this.localModel || this.initializeWeights();
    const updates = {};

    for (const layerName in weights) {
      const layerWeights = weights[layerName];
      
      if (Array.isArray(layerWeights)) {
        updates[layerName] = layerWeights.map(w => {
          if (typeof w === 'number') return w + (Math.random() - 0.5) * this.options.learningRate;
          return w;
        });
      } else if (typeof layerWeights === 'object') {
        updates[layerName] = {};
        for (const key in layerWeights) {
          updates[layerName][key] = layerWeights[key] + (Math.random() - 0.5) * this.options.learningRate;
        }
      }
    }

    return updates;
  }

  initializeWeights() {
    return {
      'conv1': { weight: Array(288).fill(0).map(() => Math.random() * 0.1 - 0.05) },
      'conv2': { weight: Array(18432).fill(0).map(() => Math.random() * 0.1 - 0.05) },
      'dense1': { weight: Array(8192).fill(0).map(() => Math.random() * 0.1 - 0.05) },
      'output': { weight: Array(130).fill(0).map(() => Math.random() * 0.1 - 0.05) }
    };
  }

  applyDifferentialPrivacy(weights) {
    const noised = {};
    
    for (const layerName in weights) {
      const layerWeights = weights[layerName];
      
      if (Array.isArray(layerWeights)) {
        const clipped = this.clipGradients(layerWeights);
        noised[layerName] = clipped.map(w => w + this.gaussianNoise() * this.options.dpNoiseMultiplier);
      } else if (typeof layerWeights === 'object') {
        noised[layerName] = {};
        for (const key in layerWeights) {
          noised[layerName][key] = layerWeights[key] + this.gaussianNoise() * this.options.dpNoiseMultiplier;
        }
      }
    }

    return noised;
  }

  clipGradients(gradients) {
    let l2Norm = 0;
    gradients.forEach(g => { l2Norm += g * g; });
    l2Norm = Math.sqrt(l2Norm);
    const clipFactor = Math.min(1.0, this.options.dpL2NormClip / (l2Norm + 1e-10));
    return gradients.map(g => g * clipFactor);
  }

  gaussianNoise() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  calculateMetrics(X, y) {
    let correct = 0;
    const predictions = X.map(x => this.predict(x));
    
    for (let i = 0; i < y.length; i++) {
      if (predictions[i] === y[i]) correct++;
    }

    return {
      accuracy: correct / y.length,
      numSamples: y.length,
      loss: 1 - (correct / y.length)
    };
  }

  predict(features) {
    const sum = features.reduce((acc, f) => acc + f, 0);
    const avg = sum / features.length;
    return avg > 0.5 ? 1 : 0;
  }

  async submitUpdate(update) {
    try {
      const response = await fetch(`${this.options.serverUrl}/api/fl/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update)
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const result = await response.json();
      console.log('[ConfuSense FL] Update submitted:', result);

      if (result.newModel) this.updateLocalModel(result.newModel);

      return result;

    } catch (error) {
      console.error('[ConfuSense FL] Submit error:', error);
      this.pendingUpdates = this.pendingUpdates || [];
      this.pendingUpdates.push(update);
      return null;
    }
  }

  async syncWithServer() {
    try {
      const response = await fetch(
        `${this.options.serverUrl}/api/fl/model/global?version=${this.globalModelVersion}`
      );

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const result = await response.json();
