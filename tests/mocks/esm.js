// Lightweight mocks for browser CDN packages (TipTap & PropelAuth)
export class Editor {
    constructor(options = {}) {
        this.options = options;
        this.content = options.content || '';
    }
    chain() {
        return {
            focus: () => this.chain(),
            toggleBold: () => this.chain(),
            toggleItalic: () => this.chain(),
            toggleHeading: () => this.chain(),
            toggleBulletList: () => this.chain(),
            toggleBlockquote: () => this.chain(),
            setImage: () => this.chain(),
            run: () => true,
        };
    }
    getHTML() {
        return '<p>Test content</p>';
    }
    getJSON() {
        return { type: 'doc', content: [] };
    }
}

export default {};

export function createClient() {
    return {
        getAuthenticationInfoOrNull: async () => ({
            accessToken: 'test-token',
            user: { email: 'admin@zygo.dev' },
        }),
        redirectToLoginPage: () => { },
        logout: () => { },
    };
}