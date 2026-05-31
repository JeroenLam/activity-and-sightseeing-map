import axios from 'axios';

const api = axios.create({
    baseURL: (window as any).__APP_CONFIG__?.API_URL || import.meta.env.VITE_API_URL || '',
    withCredentials: true,
});

export default api;
