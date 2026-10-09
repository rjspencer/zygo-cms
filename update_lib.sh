#!/bin/bash

# Insert new routes before `// Backwards compatibility aliases for Content Types`
sed -i '' '/\/\/ Backwards compatibility aliases for Content Types/i\
        .get_async("/api/section-templates/:id/revisions", handlers::section_templates::list_section_template_revisions)\
        .post_async("/api/section-templates/:id/restore/:revision_id", handlers::section_templates::restore_section_template_revision)\
' packages/admin-api-worker/src/lib.rs

# Insert backward compat routes before `// API routes - Media`
sed -i '' '/\/\/ API routes - Media/i\
        .get_async("/api/content-types/:id/revisions", handlers::section_templates::list_section_template_revisions)\
        .post_async("/api/content-types/:id/restore/:revision_id", handlers::section_templates::restore_section_template_revision)\
' packages/admin-api-worker/src/lib.rs

