import axios from 'axios';

const baseURL = (window as any).__APP_CONFIG__?.API_URL || import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL,
    withCredentials: true,
});

export default api;
