const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  try {
    return localStorage.getItem('token') || '';
  } catch {
    return '';
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

// ── Auth ──
export function loginUser(email, password) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function registerUser(payload) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getMe() {
  return apiRequest('/auth/me');
}

// ── Persons ──
export function getPersons(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiRequest(`/persons${qs ? `?${qs}` : ''}`);
}

export function getPersonByCaseId(caseId) {
  return apiRequest(`/persons/${caseId}`);
}

export function createPerson(payload) {
  return apiRequest('/persons', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePersonStatus(personId, status, note) {
  return apiRequest(`/persons/${personId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  });
}

export function updatePersonFlags(personId, flags) {
  return apiRequest(`/persons/${personId}/flags`, {
    method: 'PATCH',
    body: JSON.stringify(flags),
  });
}

// ----------------------------------------------------------------------------
// Triage/Translation endpoints
// ----------------------------------------------------------------------------

export async function translateText(text, sourceLang = 'Autodetect', targetLang = 'en') {
  return await apiRequest('/translate', {
    method: 'POST',
    body: JSON.stringify({ text, source: sourceLang, target: targetLang }),
  });
}

export async function translatePersonData(personId, targetLang) {
  return await apiRequest(`/translate/person/${personId}`, {
    method: 'POST',
    body: JSON.stringify({ targetLang }),
  });
}

// ── Cases ──
export function getStats() {
  return apiRequest('/cases/stats/overview');
}

export function addCaseNote(personId, content) {
  return apiRequest(`/cases/${personId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export function getFamilyLinks(personId) {
  return apiRequest(`/cases/family/${personId}`);
}

// ── Documents ──
export function getDocuments(personId) {
  return apiRequest(`/documents/${personId}`);
}

export function uploadDocument(personId, payload) {
  return apiRequest(`/documents/${personId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Triage ──
export function runTriage(personId) {
  return apiRequest(`/triage/${personId}`, { method: 'POST' });
}
