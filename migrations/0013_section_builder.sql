-- Migration: 0013_section_builder.sql
-- Adds template and section builder fields to content_types table

ALTER TABLE content_types ADD COLUMN template_html TEXT;
ALTER TABLE content_types ADD COLUMN template_css TEXT;
ALTER TABLE content_types ADD COLUMN css_classes_json TEXT DEFAULT '[]';
ALTER TABLE content_types ADD COLUMN is_locked BOOLEAN;

UPDATE content_types SET css_classes_json = '[]' WHERE css_classes_json IS NULL;
UPDATE content_types SET is_locked = 0 WHERE is_locked IS NULL;
