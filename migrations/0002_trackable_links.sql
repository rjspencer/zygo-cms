-- Migration number: 0002
-- Purpose: Add trackable_links table for shareable links feature

CREATE TABLE IF NOT EXISTS trackable_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL REFERENCES entries(id),
    name TEXT NOT NULL,
    url_params TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_trackable_links_entry_id ON trackable_links(entry_id);
CREATE INDEX IF NOT EXISTS idx_trackable_links_deleted_at ON trackable_links(deleted_at);
