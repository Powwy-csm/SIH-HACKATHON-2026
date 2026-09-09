/**
 * Centralized API client for communicating with the FastAPI backend service.
 * Handles base URL configuration from environment variables, authentication headers,
 * JSON and multipart body parsing, automatic token refresh, and standard error handling.
 */

import { supabase } from '../lib/supabase';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

let cachedAccessToken = null;
let lastAccessTokenCheck = 0;

export function isStaleSessionError(error) {
    const message = (error && (error.message || error.error_description || String(error))) || '';
    return /session_not_found|session.*does not exist|invalid.*session|expired.*session|jwt/i.test(message);
}

export async function clearStaleSession() {
    cachedAccessToken = null;
    lastAccessTokenCheck = 0;
    try {
        localStorage.removeItem('supabase_access_token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('bridgex_role_override');
        if (supabase) {
            await supabase.auth.signOut();
        }
    } catch {
        // Ignore errors during cleanup
    }
}

/**
 * Retrieves the current Supabase access token.
 * Validates with Supabase SDK and refreshes if needed.
 */
export async function getAccessToken(forceRefresh = false) {
    if (!supabase) return null;

    const now = Date.now();
    if (!forceRefresh && cachedAccessToken && now - lastAccessTokenCheck < 15000) {
        return cachedAccessToken;
    }

    try {
        let session = null;
        const { data, error } = await supabase.auth.getSession();

        if (error) {
            if (isStaleSessionError(error)) {
                await clearStaleSession();
                return null;
            }
        } else {
            session = data?.session;
        }

        // Check if token is expired or expiring soon (< 30s remaining)
        if (session) {
            const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
            if (expiresAt > 0 && expiresAt - now < 30000) {
                // Refresh token
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                if (!refreshError && refreshData?.session) {
                    session = refreshData.session;
                } else if (refreshError && isStaleSessionError(refreshError)) {
                    await clearStaleSession();
                    return null;
                }
            }
        }

        const token = session?.access_token || null;
        cachedAccessToken = token;
        lastAccessTokenCheck = now;
        return token;
    } catch (err) {
        console.warn('Error retrieving Supabase access token:', err);
        cachedAccessToken = null;
        lastAccessTokenCheck = 0;
        return null;
    }
}

/**
 * Base fetch wrapper for backend API requests with auto-refresh on 401.
 */
export async function apiClient(path, options = {}) {
    let token = await getAccessToken();

    const buildHeaders = (authToken) => {
        const headers = { ...options.headers };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        if (
            options.body !== undefined &&
            !(options.body instanceof FormData) &&
            typeof options.body !== 'string'
        ) {
            headers['Content-Type'] = 'application/json';
        }
        return headers;
    };

    let body = options.body;
    if (
        body !== undefined &&
        !(body instanceof FormData) &&
        typeof body !== 'string'
    ) {
        body = JSON.stringify(body);
    }

    const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
    const timeoutMs = options.timeoutMs || (options.body instanceof FormData ? 45000 : 15000);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        let response = await fetch(url, {
            method: options.method || 'GET',
            headers: buildHeaders(token),
            body,
            signal: options.signal || controller.signal,
        });

        // If 401, attempt a token refresh and retry once
        if (response.status === 401 && supabase) {
            console.warn(`[apiClient] 401 received on ${path}. Attempting session refresh...`);
            try {
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                if (!refreshError && refreshData?.session?.access_token) {
                    token = refreshData.session.access_token;
                    cachedAccessToken = token;
                    lastAccessTokenCheck = Date.now();
                    response = await fetch(url, {
                        method: options.method || 'GET',
                        headers: buildHeaders(token),
                        body,
                        signal: options.signal || controller.signal,
                    });
                } else {
                    console.warn('[apiClient] Refresh failed or session expired. Clearing stale session.');
                    await clearStaleSession();
                }
            } catch {
                await clearStaleSession();
            }
        }

        clearTimeout(timer);

        if (response.status === 401) {
            const errorData = await response.json().catch(() => ({}));
            return {
                ok: false,
                kind: 'unauthorized',
                status: 401,
                error: errorData.detail || 'Your session has expired. Please sign in again.',
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
                error: errorData.detail || `Server returned status ${response.status}`,
            };
        }

        const data = await response.json();
        return {
            ok: true,
            data,
        };
    } catch (err) {
        clearTimeout(timer);
        const isAbort = err.name === 'AbortError';
        if (isAbort) {
            return {
                ok: false,
                kind: 'timeout',
                error: `Request timed out after ${Math.round(timeoutMs / 1000)}s`,
            };
        }
        console.error(`API request error on ${path}:`, err);
        return {
            ok: false,
            kind: 'network',
            error: err.message || 'Network communication error',
        };
    }
}

export async function apiFetch(path, options = {}) {
    const res = await apiClient(path, options);
    if (!res.ok) {
        throw new Error(res.error || `Request failed on ${path}`);
    }
    return res.data;
}
