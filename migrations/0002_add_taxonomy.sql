-- Migration: Add category and tags columns to entries table
ALTER TABLE entries ADD COLUMN category TEXT;
ALTER TABLE entries ADD COLUMN tags TEXT;

-- Backfill initial sample hello-world post
UPDATE entries SET category = 'General', tags = 'welcome, cms' WHERE slug = 'hello-world';

