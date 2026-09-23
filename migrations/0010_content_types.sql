-- Create content_types table
CREATE TABLE content_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    schema_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed core types
INSERT INTO content_types (id, name, description, schema_json) VALUES 
('post', 'Blog Post', 'Standard blog post with chronological sorting.', '[]'),
('page', 'Standalone Page', 'Hierarchical page for static content.', '[]');

-- Add custom_fields_json to entries
ALTER TABLE entries ADD COLUMN custom_fields_json TEXT;

-- Add custom_fields_json to entry_revisions
ALTER TABLE entry_revisions ADD COLUMN custom_fields_json TEXT;
