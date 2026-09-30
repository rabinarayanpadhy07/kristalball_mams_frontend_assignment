import axios from 'axios';

/**
 * One axios instance for the whole app.
 *
 * Auth model: the short-lived access token lives only in memory (never in storage);
 * the refresh token is an httpOnly cookie scoped to /api/auth. On a 401 caused by an
 * expired/missing access token, the client refreshes once and retries the request.
 *
 * Refresh is SINGLE-FLIGHT: refresh tokens rotate and the server treats reuse of a
 * rotated token as theft (revoking the whole session). Two parallel refreshes —
 * e.g. several queries failing at once, or React StrictMode running an effect twice —
 * would do exactly that, so every caller shares one in-flight promise.
 */
export const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 30_000 });

let accessToken = null;
let refreshing = null;
let onSessionEnded = () => {};

export const setAccessToken = (token) => {
  accessToken = token;
};

/** Registered by AuthProvider: called when the session can no longer be renewed. */
export const setSessionEndedHandler = (handler) => {
  onSessionEnded = handler;
};

/** Returns the session payload ({ accessToken, user, permissions }) or throws. */
export function refreshSession() {
  refreshing ??= api
    .post('/auth/refresh', {}, { skipAuthRefresh: true })
    .then((res) => {
      setAccessToken(res.data.data.accessToken);
      return res.data.data;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

const REFRESHABLE = new Set(['TOKEN_EXPIRED', 'INVALID_TOKEN', 'AUTH_REQUIRED']);

api.interceptors.request.use((config) => {
  if (accessToken && !config.skipAuthRefresh) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    const code = response?.data?.error?.code;
    if (response?.status !== 401 || !config || config.skipAuthRefresh || config._retried) throw error;

    if (!REFRESHABLE.has(code)) {
      onSessionEnded(code);
      throw error;
    }
    try {
      await refreshSession();
    } catch (refreshError) {
      setAccessToken(null);
      onSessionEnded(refreshError?.response?.data?.error?.code);
      throw error;
    }
    return api({ ...config, _retried: true });
  },
);

/** Fresh key per user action; reuse it for retries of the same action. */
export const newIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

/** GET helper returning the `{ data, meta }` envelope. Drops empty params. */
export async function getEnvelope(url, params) {
  const clean = Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const res = await api.get(url, { params: clean });
  return res.data;
}

export async function getData(url, params) {
  return (await getEnvelope(url, params)).data;
}

export async function postData(url, body, { idempotencyKey } = {}) {
  const res = await api.post(url, body, idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined);
  return res.data.data;
}
