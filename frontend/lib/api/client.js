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
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data.error || 'API Error');
        error.status = res.status;
        error.details = data.details;
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
