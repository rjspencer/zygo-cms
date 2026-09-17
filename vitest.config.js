import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'happy-dom',
        globals: true,
    },
    resolve: {
        alias: [
            // Redirects browser CDN imports (https://esm.sh/...) to local mock stubs
            {
                find: /^https:\/\/esm\.sh\/.*$/,
                replacement: path.resolve(__dirname, './tests/mocks/esm.js'),
            },
        ],
    },
});