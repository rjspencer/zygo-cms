/**
 * Shared API fetch helper for Zygo CMS Admin UI.
 * - Prepends `import.meta.env.VITE_API_BASE_URL` (defaulting to empty string).
 * - Automatically includes `{ credentials: 'include' }` in fetch options for cross-origin cookie authentication.
 */

export function getApiUrl(path: string): string {
  let baseUrl = import.meta.env.VITE_API_BASE_URL || '';

  // If VITE_API_BASE_URL is not set but the app is running on an admin.* subdomain,
  // route to the corresponding api.* subdomain to avoid relative requests hitting the admin UI worker.
  if (!baseUrl && typeof window !== 'undefined' && window.location?.hostname?.startsWith('admin.')) {
    const protocol = window.location.protocol || 'https:';
    const apiHost = window.location.host.replace(/^admin\./, 'api.');
    baseUrl = `${protocol}//${apiHost}`;
  }

  if (!baseUrl || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export function getPublicSiteUrl(path: string = ''): string {
  const baseUrl = import.meta.env.VITE_PUBLIC_SITE_URL || '';
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');

  if (!cleanPath) {
    return cleanBase ? `${cleanBase}/` : '/';
  }

  return cleanBase ? `${cleanBase}/${cleanPath}` : `/${cleanPath}`;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = getApiUrl(path);

  const mergedOptions: RequestInit = {
    credentials: 'include',
    ...options,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      ...options.headers,
    },
  };

  const response = await fetch(url, mergedOptions);

  // If Cloudflare Access or the backend returns 401 (due to expired session),
  // or if the XHR transparently followed a 302 redirect and failed with 400 at the OAuth callback,
  // redirect to the API's auth login endpoint to trigger Cloudflare Access login on the API domain.
  if ((response.status === 401 || (response.status === 400 && response.url && response.url.includes('/cdn-cgi/access/'))) && typeof window !== 'undefined') {
    if (sessionStorage.getItem('login_redirect_attempt')) {
      sessionStorage.removeItem('login_redirect_attempt');
      console.error('Authentication failed after redirect. Please check your Cloudflare Access session.');
    } else {
      sessionStorage.setItem('login_redirect_attempt', 'true');
      const loginUrl = getApiUrl('/api/auth/login');
      window.location.href = `${loginUrl}?next=${encodeURIComponent(window.location.href)}`;
      // Prevent further execution while redirecting
      return new Promise(() => {});
    }
  } else if (typeof window !== 'undefined' && response.ok) {
    sessionStorage.removeItem('login_redirect_attempt');
  }

  return response;
}

export default apiFetch;
