CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auth_provider_id TEXT UNIQUE NOT NULL,
    email TEXT,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'author',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SQLite disallows non-constant defaults in ALTER TABLE, so we just add the column as nullable.
ALTER TABLE entries ADD COLUMN author_id INTEGER REFERENCES users(id);
