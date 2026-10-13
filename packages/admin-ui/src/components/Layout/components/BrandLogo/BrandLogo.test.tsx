import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../../../test/test-utils';
import { BrandLogo } from './BrandLogo';

describe('BrandLogo', () => {
  it('renders light mode logo when themeMode is light', () => {
    render(<BrandLogo themeMode="light" />);
    const img = screen.getByRole('img', { name: 'Zygo CMS' }) as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain('logo-light.png');
  });

  it('renders dark mode logo when themeMode is dark', () => {
    render(<BrandLogo themeMode="dark" />);
    const img = screen.getByRole('img', { name: 'Zygo CMS' }) as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain('logo-dark.png');
  });

  it('crops container width to icon mark when isCollapsed is true', () => {
    render(<BrandLogo isCollapsed={true} themeMode="light" />);
    const img = screen.getByRole('img', { name: 'Zygo CMS' });
    const container = img.parentElement as HTMLElement;
    expect(container.style.width).toBe('34px');
    expect(container.style.overflow).toBe('hidden');
  });

  it('uses full container width when isCollapsed is false', () => {
    render(<BrandLogo isCollapsed={false} themeMode="light" />);
    const img = screen.getByRole('img', { name: 'Zygo CMS' });
    const container = img.parentElement as HTMLElement;
    expect(container.style.width).toBe('142px');
  });
});
