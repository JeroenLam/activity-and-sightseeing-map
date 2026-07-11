import axios, { type AxiosError } from 'axios';

const baseURL = (window as any).__APP_CONFIG__?.API_URL || import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
});

export function isOfflineError(error: AxiosError): boolean {
  return error.code === 'ERR_NETWORK' || error.message === 'Network Error';
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    (error as any).isOffline = isOfflineError(error);
    return Promise.reject(error);
  },
);

export default api;
