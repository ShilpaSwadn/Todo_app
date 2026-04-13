import { getToken } from '@/lib/auth/client';

const BASE_URL = '/api';

const getHeaders = (headers = {}) => {
    const token = getToken();
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

    return {
        'Content-Type': 'application/json',
        ...authHeader,
        ...headers,
    };
};

const handleResponse = async (res) => {
    let data = {};
    try {
        data = await res.json();
    } catch (e) {
        // Fallback for non-JSON responses
        if (!res.ok) {
            throw new Error(`Server Error (${res.status}): ${res.statusText || 'Unknown Error'}`);
        }
    }

    if (!res.ok) {
        // Prioritize descriptive messages from the backend
        const errorMessage = data.message || data.error || (data.details ? JSON.stringify(data.details) : null) || `API Error (${res.status})`;
        const error = new Error(errorMessage);
        error.status = res.status;
        error.details = data.details || data;
        throw error;
    }
    return data;
};

const client = {
    get: async (url, headers = {}) => {
        const res = await fetch(`${BASE_URL}${url}`, {
            method: 'GET',
            headers: getHeaders(headers),
        });
        return handleResponse(res);
    },
    post: async (url, body, headers = {}) => {
        const res = await fetch(`${BASE_URL}${url}`, {
            method: 'POST',
            headers: getHeaders(headers),
            body: JSON.stringify(body),
        });
        return handleResponse(res);
    },
    put: async (url, body, headers = {}) => {
        const res = await fetch(`${BASE_URL}${url}`, {
            method: 'PUT',
            headers: getHeaders(headers),
            body: JSON.stringify(body),
        });
        return handleResponse(res);
    },
    delete: async (url, headers = {}) => {
        const res = await fetch(`${BASE_URL}${url}`, {
            method: 'DELETE',
            headers: getHeaders(headers),
        });
        return handleResponse(res);
    },
};

export default client;
