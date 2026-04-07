import axios from 'axios';

// In dev, use same-origin `/api` so Vite proxies to Express (see vite.config.js).
// Set VITE_API_URL in .env to override (e.g. production API URL).
const baseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? '/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
