/**
 * API Version - all API endpoints are versioned for future compatibility
 */
const API_VERSION = 'v1';

/**
 * Normalizes the API URL from env var: ensures https:// prefix, strips trailing slashes,
 * and appends the API version.
 */
export function getApiUrl(): string {
  let url = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  // Append version if URL exists and doesn't already have it
  if (url && !url.endsWith(`/${API_VERSION}`)) {
    url = `${url}/${API_VERSION}`;
  }
  return url;
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
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
