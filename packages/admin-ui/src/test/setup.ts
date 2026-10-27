import '@testing-library/jest-dom/vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect, beforeAll, afterEach, afterAll } from 'vitest';
import { configure as configureDom } from '@testing-library/dom';
import { getConfig as getRtlConfig } from '@testing-library/react';
import { server } from './mocks/server';

const rtlConfig = getRtlConfig();
configureDom({
  asyncWrapper: rtlConfig.asyncWrapper,
  eventWrapper: rtlConfig.eventWrapper,
  unstable_advanceTimersWrapper: rtlConfig.unstable_advanceTimersWrapper,
});

expect.extend(matchers);

// Mock localStorage for Node 22+ / HappyDOM
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

const storageMock = createStorageMock();

if (typeof globalThis !== 'undefined') {
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: storageMock,
      configurable: true,
      writable: true,
    });
  } catch {
    (globalThis as any).localStorage = storageMock;
  }
}

if (typeof window !== 'undefined') {
  try {
    Object.defineProperty(window, 'localStorage', {
      value: storageMock,
      configurable: true,
      writable: true,
    });
  } catch {
    (window as any).localStorage = storageMock;
  }

  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
}

// Start MSW server before tests run
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'bypass' });
});

// Reset handlers after each test so tests don't affect each other
afterEach(() => {
  server.resetHandlers();
  import.meta.env.VITE_PUBLIC_SITE_URL = '';
});

// Clean up after all tests are done
afterAll(() => {
  server.close();
});
