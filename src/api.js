import axios from 'axios';

// API utility for Flask backend
const API_BASE = 'http://localhost:5000' // Flask backend URL

export async function apiGet(path) {
  const res = await fetch(API_BASE + path, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost(path, data, isForm = false) {
  // If registering, use /api/register; if logging in, use /api/login
  if (path === '/login' && data && data.register) {
    path = '/api/register';
  } else if (path === '/login') {
    path = '/api/login';
  }
  const options = {
    method: 'POST',
    credentials: 'include',
    headers: {},
    body: null,
  };
  if (isForm) {
    options.body = data;
  } else {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }
  const res = await fetch(API_BASE + path, options);
  if (!res.ok) {
    let errMsg = 'Authentication failed';
    try {
      const errJson = await res.json();
      errMsg = errJson.error || errJson.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
  return res.json();
}

export async function apiLogout() {
  await fetch(API_BASE + '/logout', { method: 'GET', credentials: 'include' });
}

export async function apiDelete(path) {
  const res = await fetch(API_BASE + path, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const googleAuth = async (token) => {
  try {
    const response = await axios.post(`${API_BASE}/api/google-auth`, { token }, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
}; 