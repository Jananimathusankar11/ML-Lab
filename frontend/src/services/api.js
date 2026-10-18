/**
 * RetinaAI API Service Layer
 * Clean REST Client for all Flask backend endpoints.
 */

const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.error || `HTTP ${response.status}: Request failed`;
      throw new Error(errorMsg);
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Health & Dashboard
  getHealth: () => request('/health'),
  getDashboard: () => request('/dashboard'),

  // Prediction & Preprocessing
  predictImage: (formData) =>
    request('/predict', {
      method: 'POST',
      body: formData,
    }),

  preprocessInspect: (formDataOrJson) => {
    if (formDataOrJson instanceof FormData) {
      return request('/preprocess', {
        method: 'POST',
        body: formDataOrJson,
      });
    }
    return request('/preprocess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formDataOrJson),
    });
  },

  // Dataset Ingestion & Validation
  getDatasetStats: () => request('/dataset/stats'),
  validateDataset: (dataset_dir) =>
    request('/dataset/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_dir }),
    }),
  getDatasetSamples: () => request('/dataset/samples'),
  setDatasetPath: (dataset_path) =>
    request('/dataset/set-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_path }),
    }),

  // Model Training
  startTraining: (config) =>
    request('/train', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }),
  getTrainingStatus: () => request('/train/status'),
  stopTraining: () =>
    request('/train/stop', {
      method: 'POST',
    }),

  // Model Evaluation
  getEvaluation: () => request('/evaluation'),
  runEvaluation: (dataset_dir) =>
    request('/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_dir }),
    }),

  // History & Reports
  getHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/history${query ? `?${query}` : ''}`);
  },
  getPredictionById: (id) => request(`/history/${id}`),
  deletePrediction: (id) =>
    request(`/history/${id}`, {
      method: 'DELETE',
    }),
  getReport: (id, format = 'json') => request(`/report/${id}?format=${format}`),

  // Features & Grad-CAM
  getArchitecture: () => request('/features/architecture'),
  getGradcam: (payload) =>
    request('/features/gradcam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  // System Settings
  getSettings: () => request('/settings'),
  updateSettings: (settings) =>
    request('/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }),
};
