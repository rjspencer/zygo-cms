CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'post',         -- 'post' or 'page'
    status TEXT NOT NULL DEFAULT 'published',  -- 'draft' or 'published'
    description TEXT,
    cover_image TEXT,
    canonical_url TEXT,
    schema_json TEXT,
    published_at DATETIME,
    body_html TEXT NOT NULL,
    body_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed an initial Hello World blog post
INSERT INTO entries (slug, title, type, status, published_at, body_html, body_json) VALUES (
    'hello-world',
    'Hello World!',
    'post',
    'published',
    CURRENT_TIMESTAMP,
    '<h1>Hello</h1><p>Welcome to Zygo CMS.</p>',
    '{}'
);

-- Seed an initial About page
INSERT INTO entries (slug, title, type, status, published_at, body_html, body_json) VALUES (
    'about',
    'About Us',
    'page',
    'published',
    CURRENT_TIMESTAMP,
    '<h1>About</h1><p>This is a static page powered by Zygo CMS.</p>',
    '{}'
);