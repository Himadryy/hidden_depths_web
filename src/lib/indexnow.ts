/**
 * IndexNow API Utility
 * 
 * Instantly notifies search engines (Bing, Yandex, Seznam, Naver) 
 * when content is created or updated.
 * 
 * Usage:
 *   import { submitToIndexNow } from '@/lib/indexnow';
 *   await submitToIndexNow(['/blog/new-post', '/about']);
 * 
 * @see https://www.indexnow.org/
 */

const INDEXNOW_KEY = '0ed7e877601f43194024cf5d8420cf02';
const SITE_URL = 'https://hidden-depths-web.pages.dev';

// IndexNow endpoints (any one will propagate to all)
const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
  'https://yandex.com/indexnow',
];

interface IndexNowResponse {
  success: boolean;
  endpoint: string;
  status?: number;
  error?: string;
}

/**
 * Submit URLs to IndexNow for instant indexing
 * @param urlPaths - Array of URL paths (e.g., ['/blog/post-1', '/about'])
 * @returns Promise with results from IndexNow API
 */
export async function submitToIndexNow(urlPaths: string[]): Promise<IndexNowResponse> {
  const fullUrls = urlPaths.map(path => 
    path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? path : '/' + path}`
  );

  const payload = {
    host: new URL(SITE_URL).host,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: fullUrls,
  };

  // Try first endpoint (they all share data)
  const endpoint = INDEXNOW_ENDPOINTS[0];
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok || response.status === 202) {
      return {
        success: true,
        endpoint,
        status: response.status,
      };
    }

    return {
      success: false,
      endpoint,
      status: response.status,
      error: await response.text(),
    };
  } catch (error) {
    return {
      success: false,
      endpoint,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Submit a single URL to IndexNow
 */
export async function submitUrlToIndexNow(urlPath: string): Promise<IndexNowResponse> {
  return submitToIndexNow([urlPath]);
}

/**
 * Get the IndexNow key for verification
 */
export function getIndexNowKey(): string {
  return INDEXNOW_KEY;
}
