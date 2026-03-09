/**
 * Normalizes the API URL from env var: ensures https:// prefix and strips trailing slashes.
 */
export function getApiUrl(): string {
  let url = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
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
