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

const handleResponse = async (res, originalRequest = null) => {
    let data = {};
    try {
        data = await res.json();
    } catch (e) {
        if (!res.ok) {
            throw new Error(`Server Error (${res.status}): ${res.statusText || 'Unknown Error'}`);
        }
    }

    // Handle Token Expiration (401 Unauthorized)
    if (res.status === 401 && originalRequest) {
        console.warn('API: Token expired, attempting refresh...');
        try {
            const { auth } = await import('@/lib/firebase');
            if (auth.currentUser) {
                // Force refresh token
                const newToken = await auth.currentUser.getIdToken(true);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('token', newToken);
                }
                
                // Retry the original request with the new token
                const { method, url, body, headers } = originalRequest;
                const newHeaders = { ...headers, 'Authorization': `Bearer ${newToken}` };
                
                const retryRes = await fetch(url, {
                    method,
                    headers: newHeaders,
                    body: body ? JSON.stringify(body) : undefined
                });
                
                // Recursively call handleResponse but WITHOUT originalRequest to avoid infinite loops
                return handleResponse(retryRes);
            }
        } catch (refreshError) {
            console.error('API: Token refresh failed', refreshError);
            // If refresh fails, let the 401 stand or redirect
        }
    }

    if (!res.ok) {
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
        const fullUrl = `${BASE_URL}${url}`;
        const finalHeaders = getHeaders(headers);
        const res = await fetch(fullUrl, {
            method: 'GET',
            headers: finalHeaders,
        });
        return handleResponse(res, { method: 'GET', url: fullUrl, headers: finalHeaders });
    },
    post: async (url, body, headers = {}) => {
        const fullUrl = `${BASE_URL}${url}`;
        const finalHeaders = getHeaders(headers);
        const res = await fetch(fullUrl, {
            method: 'POST',
            headers: finalHeaders,
            body: JSON.stringify(body),
        });
        return handleResponse(res, { method: 'POST', url: fullUrl, body, headers: finalHeaders });
    },
    put: async (url, body, headers = {}) => {
        const fullUrl = `${BASE_URL}${url}`;
        const finalHeaders = getHeaders(headers);
        const res = await fetch(fullUrl, {
            method: 'PUT',
            headers: finalHeaders,
            body: JSON.stringify(body),
        });
        return handleResponse(res, { method: 'PUT', url: fullUrl, body, headers: finalHeaders });
    },
    delete: async (url, headers = {}) => {
        const fullUrl = `${BASE_URL}${url}`;
        const finalHeaders = getHeaders(headers);
        const res = await fetch(fullUrl, {
            method: 'DELETE',
            headers: finalHeaders,
        });
        return handleResponse(res, { method: 'DELETE', url: fullUrl, headers: finalHeaders });
    },
};

export default client;
