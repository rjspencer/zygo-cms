-- Migration: Create entry_revisions table for version history and tokenized previews
CREATE TABLE IF NOT EXISTS entry_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    cover_image TEXT,
    body_html TEXT NOT NULL,
    body_json TEXT NOT NULL,
    category TEXT,
    tags TEXT,
    preview_token TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_revisions_entry_id ON entry_revisions(entry_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_revisions_preview_token ON entry_revisions(preview_token);
CREATE INDEX IF NOT EXISTS idx_revisions_created_at ON entry_revisions(created_at);

