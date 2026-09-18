-- Migration: Add parent_id, path, and sort_order for page hierarchy
ALTER TABLE entries ADD COLUMN parent_id INTEGER REFERENCES entries(id);
ALTER TABLE entries ADD COLUMN path TEXT;
ALTER TABLE entries ADD COLUMN sort_order INTEGER;

-- Backfill initial path and sort_order
UPDATE entries SET path = '/' || slug WHERE type = 'page' AND path IS NULL;
UPDATE entries SET path = '/post/' || slug WHERE type = 'post' AND path IS NULL;
UPDATE entries SET sort_order = 0 WHERE sort_order IS NULL;

-- Indexes for fast O(1) path lookups and child queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_path ON entries(path);
CREATE INDEX IF NOT EXISTS idx_entries_parent_id ON entries(parent_id);

