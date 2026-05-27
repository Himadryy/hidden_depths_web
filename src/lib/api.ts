/**
 * API Version - all API endpoints are versioned for future compatibility
 */
const API_VERSION = 'v1';

/**
 * Normalizes the API base URL from env var: ensures https:// prefix,
 * and strips trailing slashes (no version added).
 */
export function getApiBaseUrl(): string {
  let url = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  if (url && url.endsWith(`/${API_VERSION}`)) {
    url = url.slice(0, -(`/${API_VERSION}`.length + 1));
  }
  return url;
}

/**
 * Returns the versioned API URL.
 */
export function getApiUrl(): string {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return baseUrl;
  if (baseUrl.endsWith(`/${API_VERSION}`)) {
    return baseUrl;
  }
  return `${baseUrl}/${API_VERSION}`;
}

/**
 * Fetch wrapper with timeout via AbortController.
 * Throws on timeout with a descriptive error message.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
