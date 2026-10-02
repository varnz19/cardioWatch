/**
 * CardioWatch Frontend API Service
 * Handles all communication with the FastAPI backend.
 */

const API_BASE = '/api';

export async function uploadDataset(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload dataset.');
  }

  return await res.json();
}

export async function analyzeDataset({ file = null, sampleName = null } = {}) {
  let url = `${API_BASE}/analyze`;
  let options = { method: 'POST' };

  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    options.body = formData;
  } else if (sampleName) {
    url += `?sample_name=${encodeURIComponent(sampleName)}`;
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Analysis failed on backend.');
  }

  return await res.json();
}

export async function loadSample(sampleName) {
  const res = await fetch(`${API_BASE}/sample/${sampleName}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to load sample dataset.');
  }
  return await res.json();
}

export async function getCurrentAnalysis() {
  const res = await fetch(`${API_BASE}/analysis/current`);
  if (!res.ok) {
    return null;
  }
  return await res.json();
}

export async function predictPatientRisk(patientData) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Prediction failed.');
  }

  return await res.json();
}

export async function runMonitoringSimulation() {
  const res = await fetch(`${API_BASE}/simulate-monitoring`, {
    method: 'POST'
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Simulation failed.');
  }

  return await res.json();
}

export function getExportDownloadUrl(exportType) {
  return `${API_BASE}/export/${exportType}`;
}
