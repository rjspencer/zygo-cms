/**
 * Shared API fetch helper for Zygo CMS Admin UI.
 * - Prepends `import.meta.env.VITE_API_BASE_URL` (defaulting to empty string).
 * - Automatically includes `{ credentials: 'include' }` in fetch options for cross-origin cookie authentication.
 */

export function getApiUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  if (!baseUrl || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = getApiUrl(path);

  const mergedOptions: RequestInit = {
    credentials: 'include',
    ...options,
  };

  return fetch(url, mergedOptions);
}

export default apiFetch;
