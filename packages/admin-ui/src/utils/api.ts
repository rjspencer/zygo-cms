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
  let baseUrl = import.meta.env.VITE_PUBLIC_SITE_URL || '';

  if (!baseUrl && typeof window !== 'undefined' && window.location?.hostname?.startsWith('admin.')) {
    const protocol = window.location.protocol || 'https:';
    const liveHost = window.location.host.replace(/^admin\./, '');
    baseUrl = `${protocol}//${liveHost}`;
  }

  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');

  if (!cleanPath) {
    return cleanBase ? `${cleanBase}/` : '/';
  }

  return cleanBase ? `${cleanBase}/${cleanPath}` : `/${cleanPath}`;
}

let isRedirecting = false;

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

  if ((response.status === 401 || (response.status === 400 && response.url && response.url.includes('/cdn-cgi/access/'))) && typeof window !== 'undefined') {
    if (isRedirecting) {
      return new Promise(() => {}); // Block concurrent calls during redirect
    }

    if (sessionStorage.getItem('login_redirect_attempt')) {
      console.error('Authentication failed after redirect. Please check your Cloudflare Access session.');
      // Keep it set for a few seconds to block concurrent requests from clearing and re-redirecting
      setTimeout(() => sessionStorage.removeItem('login_redirect_attempt'), 5000);
    } else {
      isRedirecting = true;
      sessionStorage.setItem('login_redirect_attempt', 'true');
      const loginUrl = getApiUrl('/api/auth/login');
      window.location.href = `${loginUrl}?next=${encodeURIComponent(window.location.href)}`;
      return new Promise(() => {});
    }
  } else if (typeof window !== 'undefined' && response.ok) {
    sessionStorage.removeItem('login_redirect_attempt');
  }

  return response;
}

export default apiFetch;
