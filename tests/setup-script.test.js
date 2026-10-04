import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  extractJson,
  validateDomain,
  validateEmail,
  replaceOrInsertRoutes,
  updatePublicWrangler,
  updateAdminApiWrangler,
  updateAdminUiWrangler,
  updateAdminUiEnv,
  configureCloudflareAccess,
  ensureOneTimePinProvider,
  configureGoogleProvider,
  getZeroTrustOrgDomain,
  applyCloudflareRedirect
} from '../scripts/setup.mjs';

describe('Setup Script Helpers', () => {
  describe('extractJson', () => {
    it('parses standard JSON object', () => {
      const input = '{"success": true, "result": {"id": "123"}}';
      expect(extractJson(input)).toEqual({ success: true, result: { id: '123' } });
    });

    it('parses standard JSON array', () => {
      const input = '[{"name": "zygo-cms-db", "uuid": "abc-123"}]';
      expect(extractJson(input)).toEqual([{ name: 'zygo-cms-db', uuid: 'abc-123' }]);
    });

    it('extracts JSON array when preceded by NDJSON preamble from wrangler', () => {
      const input = `{"type":"message","message":"Detected an AI agent environment"}\n[\n  {"uuid": "test-uuid", "name": "zygo-cms-db"}\n]`;
      const result = extractJson(input);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].name).toBe('zygo-cms-db');
      expect(result[0].uuid).toBe('test-uuid');
    });

    it('extracts JSON object when preceded by preamble text', () => {
      const input = `Cloudflare Wrangler CLI v4.133.0\n{"uuid": "new-db-uuid", "database_id": "new-db-uuid"}`;
      const result = extractJson(input);
      expect(result.uuid).toBe('new-db-uuid');
    });

    it('throws error on non-json string', () => {
      expect(() => extractJson('Plain error message with no JSON')).toThrow();
    });
  });

  describe('validateDomain', () => {
    it('accepts valid apex domain', () => {
      expect(validateDomain('example.com')).toBe('example.com');
      expect(validateDomain('my-site.co.uk')).toBe('my-site.co.uk');
    });

    it('strips https:// protocol and trailing slash', () => {
      expect(validateDomain('https://example.com/')).toBe('example.com');
      expect(validateDomain('http://blog.company.io/extra')).toBe('blog.company.io');
    });

    it('normalizes to lowercase and trims', () => {
      expect(validateDomain('  EXAMPLE.COM  ')).toBe('example.com');
    });

    it('rejects invalid domains', () => {
      expect(validateDomain('localhost')).toBeNull();
      expect(validateDomain('invalid_domain')).toBeNull();
      expect(validateDomain('')).toBeNull();
      expect(validateDomain(null)).toBeNull();
    });
  });

  describe('validateEmail', () => {
    it('accepts valid email addresses', () => {
      expect(validateEmail('admin@example.com')).toBe('admin@example.com');
      expect(validateEmail('USER+tag@DOMAIN.CO.UK')).toBe('user+tag@domain.co.uk');
    });

    it('rejects invalid emails', () => {
      expect(validateEmail('admin@')).toBeNull();
      expect(validateEmail('not-an-email')).toBeNull();
      expect(validateEmail('')).toBeNull();
      expect(validateEmail(null)).toBeNull();
    });
  });

  describe('replaceOrInsertRoutes', () => {
    it('replaces existing routes block', () => {
      const content = 'name = "test"\nroutes = [\n  { pattern = "old.com", custom_domain = true }\n]';
      const replacement = 'routes = [\n  { pattern = "new.com", custom_domain = true }\n]';
      const result = replaceOrInsertRoutes(content, replacement);
      expect(result).toContain('new.com');
      expect(result).not.toContain('old.com');
    });

    it('inserts routes after compatibility_date when no routes block exists', () => {
      const content = 'name = "test"\ncompatibility_date = "2024-09-01"\n[assets]\ndir = "dist"';
      const replacement = 'routes = [\n  { pattern = "new.com", custom_domain = true }\n]';
      const result = replaceOrInsertRoutes(content, replacement);
      expect(result).toContain('compatibility_date = "2024-09-01"\n\nroutes = [');
      expect(result).toContain('new.com');
    });
  });

  describe('wrangler toml updaters', () => {
    const testDir = path.resolve('tests/mocks/wrangler-test');

    beforeEach(() => {
      fs.mkdirSync(testDir, { recursive: true });
    });

    afterAll(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('updates public-worker/wrangler.toml properly', () => {
      const mockPublicPath = path.join(testDir, 'public-worker.toml');
      fs.writeFileSync(
        mockPublicPath,
        'name = "public-worker"\ncompatibility_date = "2024-09-01"\nroutes = [\n  { pattern = "old.com", custom_domain = true }\n]\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "zygo-cms-db"\ndatabase_id = "old-uuid"\n[vars]\nPROPELAUTH_AUTH_URL = "https://old.com"\n',
        'utf8'
      );

      updatePublicWrangler('mytestdomain.com', 'test-db-uuid-111', mockPublicPath);
      const updated = fs.readFileSync(mockPublicPath, 'utf8');
      expect(updated).toContain('database_id = "test-db-uuid-111"');
      expect(updated).toContain('pattern = "mytestdomain.com"');
      expect(updated).toContain('pattern = "www.mytestdomain.com"');
      expect(updated).not.toContain('PROPELAUTH_AUTH_URL');
    });

    it('updates admin-api-worker/wrangler.toml properly', () => {
      const mockApiPath = path.join(testDir, 'admin-api-worker.toml');
      fs.writeFileSync(
        mockApiPath,
        'name = "admin-api-worker"\ncompatibility_date = "2024-09-01"\nroutes = [\n  { pattern = "old.com", custom_domain = true }\n]\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "zygo-cms-db"\ndatabase_id = "old-uuid"\n[vars]\nPROPELAUTH_AUTH_URL = "https://old.com"\n',
        'utf8'
      );

      updateAdminApiWrangler('mytestdomain.com', 'test-db-uuid-222', mockApiPath);
      const updated = fs.readFileSync(mockApiPath, 'utf8');
      expect(updated).toContain('database_id = "test-db-uuid-222"');
      expect(updated).toContain('pattern = "api.mytestdomain.com"');
      expect(updated).toContain('PUBLIC_SUBDOMAIN = "www"');
      expect(updated).not.toContain('PROPELAUTH_AUTH_URL');
    });

    it('updates admin-ui/wrangler.toml properly', () => {
      const mockUiPath = path.join(testDir, 'admin-ui.toml');
      fs.writeFileSync(
        mockUiPath,
        'name = "admin-ui-worker"\ncompatibility_date = "2024-09-01"\nroutes = [\n  { pattern = "old.com", custom_domain = true }\n]\n[assets]\ndirectory = "dist"\n',
        'utf8'
      );

      updateAdminUiWrangler('mytestdomain.com', mockUiPath);
      const updated = fs.readFileSync(mockUiPath, 'utf8');
      expect(updated).toContain('pattern = "admin.mytestdomain.com"');
    });

    it('updates public-worker/wrangler.toml with custom public subdomain', () => {
      const mockPublicPath = path.join(testDir, 'public-worker-custom.toml');
      fs.writeFileSync(
        mockPublicPath,
        'name = "public-worker"\ncompatibility_date = "2024-09-01"\nroutes = []\n',
        'utf8'
      );

      updatePublicWrangler('mytestdomain.com', 'db-uuid-333', 'web', mockPublicPath);
      const updated = fs.readFileSync(mockPublicPath, 'utf8');
      expect(updated).toContain('pattern = "mytestdomain.com"');
      expect(updated).toContain('pattern = "web.mytestdomain.com"');
    });

    it('updates public-worker/wrangler.toml with apexHandling = "do_nothing"', () => {
      const mockPublicPath = path.join(testDir, 'public-worker-do-nothing.toml');
      fs.writeFileSync(
        mockPublicPath,
        'name = "public-worker"\ncompatibility_date = "2024-09-01"\nroutes = []\n',
        'utf8'
      );

      updatePublicWrangler('mytestdomain.com', 'db-uuid-555', 'www', 'do_nothing', mockPublicPath);
      const updated = fs.readFileSync(mockPublicPath, 'utf8');
      expect(updated).toContain('pattern = "www.mytestdomain.com"');
      expect(updated).not.toContain('pattern = "mytestdomain.com"');
    });

    it('updates public-worker/wrangler.toml with apexHandling = "do_nothing" and empty subdomain', () => {
      const mockPublicPath = path.join(testDir, 'public-worker-do-nothing-empty.toml');
      fs.writeFileSync(
        mockPublicPath,
        'name = "public-worker"\ncompatibility_date = "2024-09-01"\nroutes = []\n',
        'utf8'
      );

      updatePublicWrangler('mytestdomain.com', 'db-uuid-666', '', 'do_nothing', mockPublicPath);
      const updated = fs.readFileSync(mockPublicPath, 'utf8');
      expect(updated).toContain('pattern = "mytestdomain.com"');
      expect(updated).not.toContain('pattern = "www.mytestdomain.com"');
    });

    it('updates public-worker/wrangler.toml with apexHandling = "redirect_to_apex"', () => {
      const mockPublicPath = path.join(testDir, 'public-worker-redirect-apex.toml');
      fs.writeFileSync(
        mockPublicPath,
        'name = "public-worker"\ncompatibility_date = "2024-09-01"\nroutes = []\n',
        'utf8'
      );

      updatePublicWrangler('mytestdomain.com', 'db-uuid-777', 'www', 'redirect_to_apex', mockPublicPath);
      const updated = fs.readFileSync(mockPublicPath, 'utf8');
      expect(updated).toContain('pattern = "mytestdomain.com"');
      expect(updated).toContain('pattern = "www.mytestdomain.com"');
    });

    it('updates public-worker/wrangler.toml with apexHandling = "serve_both"', () => {
      const mockPublicPath = path.join(testDir, 'public-worker-serve-both.toml');
      fs.writeFileSync(
        mockPublicPath,
        'name = "public-worker"\ncompatibility_date = "2024-09-01"\nroutes = []\n',
        'utf8'
      );

      updatePublicWrangler('mytestdomain.com', 'db-uuid-888', 'www', 'serve_both', mockPublicPath);
      const updated = fs.readFileSync(mockPublicPath, 'utf8');
      expect(updated).toContain('pattern = "mytestdomain.com"');
      expect(updated).toContain('pattern = "www.mytestdomain.com"');
    });

    it('updates admin-api-worker/wrangler.toml with custom api subdomain', () => {
      const mockApiPath = path.join(testDir, 'admin-api-worker-custom.toml');
      fs.writeFileSync(
        mockApiPath,
        'name = "admin-api-worker"\ncompatibility_date = "2024-09-01"\nroutes = []\n',
        'utf8'
      );

      updateAdminApiWrangler('mytestdomain.com', 'db-uuid-444', 'custom-api', mockApiPath);
      const updated = fs.readFileSync(mockApiPath, 'utf8');
      expect(updated).toContain('pattern = "custom-api.mytestdomain.com"');
      expect(updated).toContain('PUBLIC_SUBDOMAIN = "www"');
    });

    it('updates admin-api-worker/wrangler.toml with custom public subdomain', () => {
      const mockApiPath = path.join(testDir, 'admin-api-worker-custom-public.toml');
      fs.writeFileSync(
        mockApiPath,
        'name = "admin-api-worker"\ncompatibility_date = "2024-09-01"\nroutes = []\n[vars]\nENVIRONMENT = "production"\n',
        'utf8'
      );

      updateAdminApiWrangler('mytestdomain.com', 'db-uuid-444', 'custom-api', 'blog', mockApiPath);
      const updated = fs.readFileSync(mockApiPath, 'utf8');
      expect(updated).toContain('pattern = "custom-api.mytestdomain.com"');
      expect(updated).toContain('PUBLIC_SUBDOMAIN = "blog"');
    });

    it('updates admin-ui/wrangler.toml with custom ui subdomain', () => {
      const mockUiPath = path.join(testDir, 'admin-ui-custom.toml');
      fs.writeFileSync(
        mockUiPath,
        'name = "admin-ui-worker"\ncompatibility_date = "2024-09-01"\nroutes = []\n',
        'utf8'
      );

      updateAdminUiWrangler('mytestdomain.com', 'dashboard', mockUiPath);
      const updated = fs.readFileSync(mockUiPath, 'utf8');
      expect(updated).toContain('pattern = "dashboard.mytestdomain.com"');
    });
  });

  describe('configureCloudflareAccess', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('creates access apps and policies for admin-ui and admin-api when api calls succeed', async () => {
      const fetchMock = vi.fn()
        // Admin UI App creation response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: { id: 'mock-ui-app-id' } })
        })
        // Admin UI Policy GET list response (empty)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: [] })
        })
        // Admin UI Policy creation response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: { id: 'mock-ui-policy-id' } })
        })
        // Admin API App creation response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: { id: 'mock-api-app-id' } })
        })
        // Admin API Policy GET list response (empty)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: [] })
        })
        // Admin API Policy creation response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: { id: 'mock-api-policy-id' } })
        });

      global.fetch = fetchMock;

      await configureCloudflareAccess('mock-account', 'mock-token', 'example.com', 'admin@example.com');

      expect(fetchMock).toHaveBeenCalledTimes(6);
      // First app: Admin UI
      expect(fetchMock.mock.calls[0][0]).toContain('/access/apps');
      const uiAppBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(uiAppBody.name).toBe('Zygo CMS Admin UI');
      expect(uiAppBody.domain).toBe('admin.example.com');
      expect(uiAppBody.cors_headers.allowed_origins).toContain('https://admin.example.com');
      expect(uiAppBody.cors_headers.allowed_origins).toContain('https://api.example.com');

      // First policy: Admin UI policy
      expect(fetchMock.mock.calls[2][0]).toContain('/access/apps/mock-ui-app-id/policies');
      const uiPolicyBody = JSON.parse(fetchMock.mock.calls[2][1].body);
      expect(uiPolicyBody.name).toBe('Admin Access Policy');
      expect(uiPolicyBody.include[0].email.email).toBe('admin@example.com');

      // Second app: Admin API
      expect(fetchMock.mock.calls[3][0]).toContain('/access/apps');
      const apiAppBody = JSON.parse(fetchMock.mock.calls[3][1].body);
      expect(apiAppBody.name).toBe('Zygo CMS Admin API');
      expect(apiAppBody.domain).toBe('api.example.com');

      // Second policy: Admin API policy
      expect(fetchMock.mock.calls[5][0]).toContain('/access/apps/mock-api-app-id/policies');
    });

    it('gracefully handles api errors without throwing', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network error or invalid token'));
      global.fetch = fetchMock;

      // Should not throw
      await expect(
        configureCloudflareAccess('mock-account', 'invalid-token', 'example.com', 'admin@example.com')
      ).resolves.not.toThrow();
    });

    it('creates access apps and policies using custom ui and api subdomains', async () => {
      const fetchMock = vi.fn()
        // Admin UI App creation response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: { id: 'mock-ui-app-id' } })
        })
        // Admin UI Policy GET list response (empty)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: [] })
        })
        // Admin UI Policy creation response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: { id: 'mock-ui-policy-id' } })
        })
        // Admin API App creation response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: { id: 'mock-api-app-id' } })
        })
        // Admin API Policy GET list response (empty)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: [] })
        })
        // Admin API Policy creation response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: { id: 'mock-api-policy-id' } })
        });

      global.fetch = fetchMock;

      await configureCloudflareAccess('mock-account', 'mock-token', 'example.com', 'admin@example.com', 'dash', 'backend-api');

      expect(fetchMock).toHaveBeenCalledTimes(6);
      // Admin UI App with custom subdomain
      const uiAppBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(uiAppBody.domain).toBe('dash.example.com');
      expect(uiAppBody.cors_headers.allowed_origins).toContain('https://dash.example.com');
      expect(uiAppBody.cors_headers.allowed_origins).toContain('https://backend-api.example.com');

      // Admin API App with custom subdomain
      const apiAppBody = JSON.parse(fetchMock.mock.calls[3][1].body);
      expect(apiAppBody.domain).toBe('backend-api.example.com');
    });
  });

  describe('updateAdminUiEnv', () => {
    const testDir = path.resolve('tests/mocks/env-test');

    beforeEach(() => {
      fs.mkdirSync(testDir, { recursive: true });
    });

    afterAll(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('creates .env.production when file does not exist', () => {
      const mockEnvPath = path.join(testDir, '.env.production-new');
      if (fs.existsSync(mockEnvPath)) fs.unlinkSync(mockEnvPath);

      updateAdminUiEnv('example.com', 'api', mockEnvPath);

      expect(fs.existsSync(mockEnvPath)).toBe(true);
      const content = fs.readFileSync(mockEnvPath, 'utf8');
      expect(content).toBe('VITE_API_BASE_URL=https://api.example.com\n');
    });

    it('updates VITE_API_BASE_URL and preserves existing keys and comments', () => {
      const mockEnvPath = path.join(testDir, '.env.production-update');
      fs.writeFileSync(
        mockEnvPath,
        '# Production Config\nVITE_OTHER_KEY=foobar\nVITE_API_BASE_URL=https://old-api.com\nANOTHER_VAR=123\n',
        'utf8'
      );

      updateAdminUiEnv('example.com', 'custom-api', mockEnvPath);

      const content = fs.readFileSync(mockEnvPath, 'utf8');
      expect(content).toContain('# Production Config\n');
      expect(content).toContain('VITE_OTHER_KEY=foobar\n');
      expect(content).toContain('VITE_API_BASE_URL=https://custom-api.example.com\n');
      expect(content).toContain('ANOTHER_VAR=123\n');
      expect(content.match(/VITE_API_BASE_URL=/g)).toHaveLength(1);
    });

    it('deduplicates VITE_API_BASE_URL when multiple occurrences exist', () => {
      const mockEnvPath = path.join(testDir, '.env.production-dedup');
      fs.writeFileSync(
        mockEnvPath,
        'VITE_API_BASE_URL=https://first.com\nSOME_KEY=abc\nVITE_API_BASE_URL=https://second.com\nVITE_API_BASE_URL=https://third.com\n',
        'utf8'
      );

      updateAdminUiEnv('example.com', 'api', mockEnvPath);

      const content = fs.readFileSync(mockEnvPath, 'utf8');
      expect(content).toBe('VITE_API_BASE_URL=https://api.example.com\nSOME_KEY=abc\n');
      expect(content.match(/VITE_API_BASE_URL=/g)).toHaveLength(1);
    });

    it('appends VITE_API_BASE_URL when not previously present in existing file', () => {
      const mockEnvPath = path.join(testDir, '.env.production-append');
      fs.writeFileSync(mockEnvPath, 'SOME_KEY=abc\nANOTHER_KEY=xyz\n', 'utf8');

      updateAdminUiEnv('example.com', 'api', mockEnvPath);

      const content = fs.readFileSync(mockEnvPath, 'utf8');
      expect(content).toBe('SOME_KEY=abc\nANOTHER_KEY=xyz\nVITE_API_BASE_URL=https://api.example.com\n');
      expect(content.match(/VITE_API_BASE_URL=/g)).toHaveLength(1);
    });
  });

  describe('getZeroTrustOrgDomain', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns auth_domain when API call succeeds', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: {
            auth_domain: 'fragrant-pond-dfa8.cloudflareaccess.com',
            name: 'Test Org'
          }
        })
      });

      const domain = await getZeroTrustOrgDomain('mock-account', 'mock-token');
      expect(domain).toBe('fragrant-pond-dfa8.cloudflareaccess.com');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.cloudflare.com/client/v4/accounts/mock-account/access/organizations',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token'
          })
        })
      );
    });

    it('returns null when API call fails or auth_domain is missing', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, errors: [] })
      });

      const domain = await getZeroTrustOrgDomain('mock-account', 'mock-token');
      expect(domain).toBeNull();
    });

    it('returns null on network error', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const domain = await getZeroTrustOrgDomain('mock-account', 'mock-token');
      expect(domain).toBeNull();
    });
  });

  describe('ensureOneTimePinProvider', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('skips POST when OTP provider already exists', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [
            { id: 'otp-id', type: 'onetimepin', name: 'One-Time PIN' }
          ]
        })
      });
      global.fetch = fetchMock;

      const result = await ensureOneTimePinProvider('mock-account', 'mock-token');
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toContain('/access/identity_providers');
      expect(fetchMock.mock.calls[0][1]?.method).toBeUndefined(); // GET by default
    });

    it('calls POST successfully when OTP does not exist', async () => {
      const fetchMock = vi.fn()
        // GET returns empty array
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: []
          })
        })
        // POST creates OTP provider
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: { id: 'new-otp-id', type: 'onetimepin', name: 'One-Time PIN' }
          })
        });
      global.fetch = fetchMock;

      const result = await ensureOneTimePinProvider('mock-account', 'mock-token');
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      // Verify GET call
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.cloudflare.com/client/v4/accounts/mock-account/access/identity_providers');

      // Verify POST call
      expect(fetchMock.mock.calls[1][0]).toBe('https://api.cloudflare.com/client/v4/accounts/mock-account/access/identity_providers');
      expect(fetchMock.mock.calls[1][1].method).toBe('POST');
      const body = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(body).toEqual({
        name: 'One-Time PIN',
        type: 'onetimepin',
        config: {}
      });
    });

    it('gracefully handles error when creation fails', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: [] })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ success: false, errors: [{ message: 'Forbidden' }] })
        });
      global.fetch = fetchMock;

      const result = await ensureOneTimePinProvider('mock-account', 'mock-token');
      expect(result).toBe(false);
    });

    it('gracefully handles network error without throwing', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await ensureOneTimePinProvider('mock-account', 'mock-token');
      expect(result).toBe(false);
    });
  });

  describe('configureGoogleProvider', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('skips POST if Google provider is already configured', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [{ id: 'existing-google-id', type: 'google', name: 'Google' }]
        })
      });
      global.fetch = fetchMock;

      const result = await configureGoogleProvider('mock-account', 'mock-token', 'client-id', 'client-secret');
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.cloudflare.com/client/v4/accounts/mock-account/access/identity_providers');
    });

    it('calls POST successfully with clientId and clientSecret when provider does not exist', async () => {
      const fetchMock = vi.fn()
        // GET check returns empty array
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: [] })
        })
        // POST creates Google provider
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: { id: 'google-id', type: 'google', name: 'Google' }
          })
        });
      global.fetch = fetchMock;

      const result = await configureGoogleProvider('mock-account', 'mock-token', 'my-client-id.apps.googleusercontent.com', 'my-secret-123');
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.cloudflare.com/client/v4/accounts/mock-account/access/identity_providers');
      expect(fetchMock.mock.calls[1][0]).toBe('https://api.cloudflare.com/client/v4/accounts/mock-account/access/identity_providers');
      expect(fetchMock.mock.calls[1][1].method).toBe('POST');
      const body = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(body).toEqual({
        name: 'Google',
        type: 'google',
        config: {
          client_id: 'my-client-id.apps.googleusercontent.com',
          client_secret: 'my-secret-123'
        }
      });
    });

    it('gracefully handles error when POST fails', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: [] })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            success: false,
            errors: [{ code: 1000, message: 'Invalid credentials' }]
          })
        });
      global.fetch = fetchMock;

      const result = await configureGoogleProvider('mock-account', 'mock-token', 'client-id', 'bad-secret');
      expect(result).toBe(false);
    });

    it('gracefully handles network error without throwing', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await configureGoogleProvider('mock-account', 'mock-token', 'client-id', 'secret');
      expect(result).toBe(false);
    });
  });

  describe('applyCloudflareRedirect', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('creates redirect ruleset via POST when entrypoint returns 404', async () => {
      const fetchMock = vi.fn()
        // GET entrypoint returns 404
        .mockResolvedValueOnce({
          status: 404,
          ok: false,
          json: async () => ({ success: false, errors: [{ code: 10001, message: 'not found' }] })
        })
        // POST creates ruleset
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({ success: true, result: { id: 'new-ruleset-id' } })
        });

      global.fetch = fetchMock;

      const result = await applyCloudflareRedirect('zone-123', 'token-abc', 'example.com', 'www.example.com');
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      // Verify GET call
      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.cloudflare.com/client/v4/zones/zone-123/rulesets/phases/http_request_dynamic_redirect/entrypoint'
      );

      // Verify POST call
      expect(fetchMock.mock.calls[1][0]).toBe('https://api.cloudflare.com/client/v4/zones/zone-123/rulesets');
      expect(fetchMock.mock.calls[1][1].method).toBe('POST');
      const postBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(postBody.phase).toBe('http_request_dynamic_redirect');
      expect(postBody.rules).toHaveLength(1);
      expect(postBody.rules[0]).toEqual({
        description: 'Redirect example.com to www.example.com',
        expression: '(http.host eq "example.com")',
        action: 'redirect',
        action_parameters: {
          from_value: {
            status_code: 301,
            target_url: {
              expression: 'concat("https://www.example.com", http.request.uri.path)'
            },
            preserve_query_string: true
          }
        }
      });
    });

    it('appends redirect rule via PUT when entrypoint ruleset already exists', async () => {
      const fetchMock = vi.fn()
        // GET entrypoint returns existing ruleset
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            success: true,
            result: {
              id: 'existing-ruleset-id',
              rules: [
                {
                  expression: '(http.host eq "other.example.com")',
                  action: 'redirect'
                }
              ]
            }
          })
        })
        // PUT updates ruleset
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({ success: true, result: { id: 'existing-ruleset-id' } })
        });

      global.fetch = fetchMock;

      const result = await applyCloudflareRedirect('zone-123', 'token-abc', 'www.example.com', 'example.com');
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      // Verify PUT call
      expect(fetchMock.mock.calls[1][0]).toBe(
        'https://api.cloudflare.com/client/v4/zones/zone-123/rulesets/existing-ruleset-id'
      );
      expect(fetchMock.mock.calls[1][1].method).toBe('PUT');
      const putBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(putBody.rules).toHaveLength(2);
      expect(putBody.rules[0].expression).toBe('(http.host eq "other.example.com")');
      expect(putBody.rules[1].expression).toBe('(http.host eq "www.example.com")');
      expect(putBody.rules[1].action_parameters.from_value.target_url.expression).toBe(
        'concat("https://example.com", http.request.uri.path)'
      );
    });

    it('deduplicates rule if the same expression already exists in ruleset', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            success: true,
            result: {
              id: 'existing-ruleset-id',
              rules: [
                {
                  expression: '(http.host eq "example.com")',
                  action: 'redirect',
                  action_parameters: { from_value: { status_code: 302 } }
                }
              ]
            }
          })
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({ success: true })
        });

      global.fetch = fetchMock;

      const result = await applyCloudflareRedirect('zone-123', 'token-abc', 'example.com', 'www.example.com');
      expect(result).toBe(true);

      const putBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(putBody.rules).toHaveLength(1);
      expect(putBody.rules[0].action_parameters.from_value.status_code).toBe(301);
    });

    it('gracefully handles network error without throwing', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await applyCloudflareRedirect('zone-123', 'token-abc', 'example.com', 'www.example.com');
      expect(result).toBe(false);
    });

    it('gracefully handles API errors during POST and PUT without throwing', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          status: 404,
          ok: false,
          json: async () => ({})
        })
        .mockResolvedValueOnce({
          status: 400,
          ok: false,
          json: async () => ({ success: false, errors: [{ message: 'Bad request' }] })
        });

      const result = await applyCloudflareRedirect('zone-123', 'token-abc', 'example.com', 'www.example.com');
      expect(result).toBe(false);
    });
  });
});
