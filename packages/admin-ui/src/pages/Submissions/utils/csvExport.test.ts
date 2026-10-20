import { describe, it, expect, vi } from 'vitest';
import { sanitizeCsvCell, exportSubmissionsToCsv } from './csvExport';
import type { FormSubmission } from '../types';

describe('CSV Export & Sanitization', () => {
  it('safely wraps normal strings in quotes and escapes internal quotes', () => {
    expect(sanitizeCsvCell('Hello World')).toBe('"Hello World"');
    expect(sanitizeCsvCell('Hello "World"')).toBe('"Hello ""World"""');
    expect(sanitizeCsvCell(123)).toBe('"123"');
    expect(sanitizeCsvCell(null)).toBe('""');
    expect(sanitizeCsvCell(undefined)).toBe('""');
  });

  it('strictly protects against CSV Formula Injection (DDE) attacks', () => {
    // Dangerous prefixes: '=', '+', '-', '@', '\t', '\r'
    expect(sanitizeCsvCell('=1+1')).toBe(`"'=1+1"`);
    expect(sanitizeCsvCell('+cmd|')).toBe(`"'+cmd|"`);
    expect(sanitizeCsvCell('-SUM(A1:A10)')).toBe(`"'-SUM(A1:A10)"`);
    expect(sanitizeCsvCell('@IMPORTXML')).toBe(`"'@IMPORTXML"`);
    expect(sanitizeCsvCell('\tmalicious')).toBe(`"'\tmalicious"`);
    expect(sanitizeCsvCell('\rmalicious')).toBe(`"'\rmalicious"`);
  });

  it('generates valid downloadable CSV content from form submissions', () => {
    const mockSubmissions: FormSubmission[] = [
      {
        id: 1,
        form_name: 'contact',
        page_path: '/contact',
        sender_name: 'Alice',
        sender_email: 'alice@example.com',
        subject: '=DDE_TEST()',
        message: 'Hello, this is a test inquiry.',
        metadata_json: '{"source":"google"}',
        status: 'unread',
        created_at: '2026-10-20 12:00:00',
      },
    ];

    const originalCreateElement = document.createElement.bind(document);
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = () => 'blob:test-csv';
    URL.revokeObjectURL = () => {};

    const clickSpy = vi.fn();

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    exportSubmissionsToCsv(mockSubmissions, 'test.csv');
    expect(clickSpy).toHaveBeenCalled();

    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });
});
