CREATE TABLE section_template_revisions (
    id TEXT PRIMARY KEY,
    section_template_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    schema_json TEXT NOT NULL,
    template_html TEXT,
    template_css TEXT,
    css_classes_json TEXT NOT NULL DEFAULT '[]',
    is_locked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(section_template_id) REFERENCES section_templates(id) ON DELETE CASCADE
);

CREATE INDEX idx_section_template_revisions_template_id ON section_template_revisions(section_template_id);
