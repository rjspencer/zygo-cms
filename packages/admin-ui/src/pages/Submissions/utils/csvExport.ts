import type { FormSubmission } from '../types';

/**
 * Escapes a cell value according to RFC 4180 and protects against CSV Formula Injection (DDE).
 * If the string starts with '=', '+', '-', '@', '\t', or '\r', an apostrophe `'` is prepended
 * before RFC 4180 double-quote escaping.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  let str = String(value);

  // Defend against CSV Formula Injection (DDE):
  // If any cell begins with '=', '+', '-', '@', '\t', or '\r',
  // prepend an apostrophe `'` before RFC 4180 quote wrapping.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // RFC 4180: double any existing double quotes and wrap the whole cell in quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function exportSubmissionsToCsv(
  submissions: FormSubmission[],
  filename = `submissions-${new Date().toISOString().slice(0, 10)}.csv`
): void {
  const headers = [
    'ID',
    'Date',
    'Status',
    'Form Name',
    'Sender Name',
    'Sender Email',
    'Subject',
    'Message',
    'Page Path',
    'Metadata',
  ];

  const headerRow = headers.map(sanitizeCsvCell).join(',');
  const dataRows = submissions.map((s) => [
    sanitizeCsvCell(s.id),
    sanitizeCsvCell(s.created_at),
    sanitizeCsvCell(s.status),
    sanitizeCsvCell(s.form_name),
    sanitizeCsvCell(s.sender_name ?? ''),
    sanitizeCsvCell(s.sender_email),
    sanitizeCsvCell(s.subject ?? ''),
    sanitizeCsvCell(s.message),
    sanitizeCsvCell(s.page_path ?? ''),
    sanitizeCsvCell(s.metadata_json ?? ''),
  ].join(','));

  const csvContent = [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
