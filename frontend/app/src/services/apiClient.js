/**
 * Centralized API client for communicating with the FastAPI backend service.
 * Handles base URL configuration from environment variables, authentication headers,
 * JSON and multipart body parsing, and standard error handling.
 */

import { supabase } from '../lib/supabase';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

/**
 * Retrieves the current Supabase access token.
 * Returns null if not logged in or token is unavailable.
 */
export async function getAccessToken() {
    try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
            console.error('Supabase session error:', error);
            return null;
        }

        const token = data.session?.access_token || null;

        console.log('SUPABASE SESSION:', data.session);
        console.log('ACCESS TOKEN EXISTS:', !!token);

        return token;
    } catch (err) {
        console.error('Error fetching access token:', err);
        return null;
    }
}

/**
 * Base fetch wrapper for backend API requests.
 */
export async function apiClient(path, options = {}) {
    const token = await getAccessToken();

    const headers = { ...options.headers };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Unless sending FormData, set content-type to application/json
    let body = options.body;

    if (
        body !== undefined &&
        !(body instanceof FormData) &&
        typeof body !== 'string'
    ) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }

    const url = path.startsWith('http')
        ? path
        : `${API_BASE_URL}${path}`;

    try {
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body,
        });

        if (response.status === 401) {
            const errorData = await response.json().catch(() => ({}));

            return {
                ok: false,
                kind: 'unauthorized',
                status: 401,
                error: errorData.detail || 'Unauthorized',
            };
        }

        if (response.status === 403) {
            const errorData = await response.json().catch(() => ({}));

            return {
                ok: false,
                kind: 'forbidden',
                status: 403,
                error: errorData.detail || 'Forbidden',
            };
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            return {
                ok: false,
                kind: 'error',
                status: response.status,
                error:
                    errorData.detail ||
                    `Server returned status ${response.status}`,
            };
        }

        const data = await response.json();

        return {
            ok: true,
            data,
        };
    } catch (err) {
        console.error(`API request error on ${path}:`, err);

        return {
            ok: false,
            kind: 'network',
            error: err.message || 'Network communication error',
        };
    }
}