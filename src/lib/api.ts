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
