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

const client = {
    get: async (url, headers = {}) => {
        const res = await fetch(`${BASE_URL}${url}`, {
            method: 'GET',
            headers: getHeaders(headers),
        });
        return res.json();
    },
    post: async (url, body, headers = {}) => {
        const res = await fetch(`${BASE_URL}${url}`, {
            method: 'POST',
            headers: getHeaders(headers),
            body: JSON.stringify(body),
        });
        return res.json();
    },
    put: async (url, body, headers = {}) => {
        const res = await fetch(`${BASE_URL}${url}`, {
            method: 'PUT',
            headers: getHeaders(headers),
            body: JSON.stringify(body),
        });
        return res.json();
    },
    delete: async (url, headers = {}) => {
        const res = await fetch(`${BASE_URL}${url}`, {
            method: 'DELETE',
            headers: getHeaders(headers),
        });
        return res.json();
    },
};

export default client;
