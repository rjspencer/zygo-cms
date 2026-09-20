-- Migration: 0006_add_soft_delete.sql
-- Adds soft delete support via deleted_at timestamp on entries.

ALTER TABLE entries ADD COLUMN deleted_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_entries_deleted_at ON entries(deleted_at);
CREATE INDEX IF NOT EXISTS idx_entries_status_deleted ON entries(status, deleted_at);

