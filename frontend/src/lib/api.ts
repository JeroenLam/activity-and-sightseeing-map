import axios, { type AxiosError } from 'axios';

const baseURL = (window as any).__APP_CONFIG__?.API_URL || import.meta.env.VITE_API_URL || '';
const corsOrigins = (window as any).__APP_CONFIG__?.CORS_ORIGINS || '';

console.info('[API] Initializing axios with baseURL:', baseURL || '(same origin)');
console.info('[API] Configured CORS origins:', corsOrigins || '(not set)');

const api = axios.create({
    baseURL,
    withCredentials: true,
});

// Error codes for connection issues
export const API_ERROR_CODES = {
    NETWORK_ERROR: 'ERR_NETWORK',
    TIMEOUT: 'ERR_TIMEOUT',
    CONNECTION_REFUSED: 'ERR_CONNECTION_REFUSED',
    SERVER_ERROR: 'ERR_SERVER',
    UNKNOWN: 'ERR_UNKNOWN',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export interface ApiConnectionError {
    code: ApiErrorCode;
    message: string;
    url?: string;
    status?: number;
}

export function isOfflineErrorLike(error: unknown): boolean {
    const axiosErr = error as AxiosError;
    return axiosErr?.code === 'ERR_NETWORK' || axiosErr?.message === 'Network Error';
}

/**
 * Classify an axios error into a specific error code.
 */
export function classifyError(error: AxiosError): ApiConnectionError {
    const url = error.config?.url;

    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        return {
            code: API_ERROR_CODES.NETWORK_ERROR,
            message: 'Unable to connect to the backend. The server may be down or unreachable.',
            url,
        };
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return {
            code: API_ERROR_CODES.TIMEOUT,
            message: 'Request timed out. The backend is not responding.',
            url,
        };
    }

    if (error.response && error.response.status >= 500) {
        return {
            code: API_ERROR_CODES.SERVER_ERROR,
            message: `Server error (HTTP ${error.response.status}).`,
            url,
            status: error.response.status,
        };
    }

    return {
        code: API_ERROR_CODES.UNKNOWN,
        message: error.message || 'An unknown error occurred.',
        url,
        status: error.response?.status,
    };
}

// Request interceptor — log outgoing requests
api.interceptors.request.use(
    (config) => {
        console.debug(`[API] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
            params: config.params,
            hasData: !!config.data,
        });
        return config;
    },
    (error) => {
        console.error('[API] Request setup error:', error);
        return Promise.reject(error);
    },
);

// Response interceptor — log responses and classify errors
api.interceptors.response.use(
    (response) => {
        console.debug(
            `[API] ← ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
            { dataSize: JSON.stringify(response.data).length },
        );
        return response;
    },
    (error: AxiosError) => {
        const classified = classifyError(error);

        if (classified.code === API_ERROR_CODES.NETWORK_ERROR || classified.code === API_ERROR_CODES.TIMEOUT) {
            console.error(
                `[API] ✖ Connection failed [${classified.code}]: ${classified.message}`,
                { url: classified.url },
            );
        } else if (classified.code === API_ERROR_CODES.SERVER_ERROR) {
            console.error(
                `[API] ✖ Server error [${classified.code}]: HTTP ${classified.status}`,
                { url: classified.url },
            );
        } else if (error.response) {
            console.warn(
                `[API] ← ${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
                { detail: error.response.data },
            );
        } else {
            console.error(`[API] ✖ Error [${classified.code}]: ${classified.message}`);
        }

        // Attach classified error info to the error object
        (error as any).apiError = classified;

        return Promise.reject(error);
    },
);

export default api;
