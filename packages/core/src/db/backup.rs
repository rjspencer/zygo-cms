use super::{opt_js, opt_js_i32, opt_js_i64};
use crate::models::{
    BackupEntry, BackupMediaItem, BackupMenu, BackupRedirect, Entry, ImportCounts, LayoutTemplate,
    MediaItem, Menu, Redirect, SectionTemplate, Setting, ZygoBackupPayload,
};
use std::collections::HashMap;
use worker::wasm_bindgen::JsValue;
use worker::{D1Database, Result};

#[derive(serde::Deserialize)]
struct TimeRow {
    exported_at: String,
}

/// Query and assemble the full site snapshot for backup export
pub async fn export_site_backup(db: &D1Database) -> Result<ZygoBackupPayload> {
    // 1. Current UTC timestamp
    let time_row = db
        .prepare("SELECT strftime('%Y-%m-%dT%H:%M:%SZ', 'now') as exported_at")
        .first::<TimeRow>(None)
        .await?
        .unwrap_or(TimeRow {
            exported_at: "1970-01-01T00:00:00Z".to_string(),
        });
    let exported_at = time_row.exported_at;

    // 2. Settings (explicit columns)
    let settings_rows = db
        .prepare("SELECT key, value, updated_at FROM settings")
        .all()
        .await?
        .results::<Setting>()?;
    let mut settings_map = HashMap::new();
    for s in settings_rows {
        settings_map.insert(s.key, s.value);
    }

    // 3. Menus (explicit columns)
    let menu_rows = db
        .prepare("SELECT id, name, items_json, created_at, updated_at FROM menus ORDER BY id ASC")
        .all()
        .await?
        .results::<Menu>()?;
    let menus = menu_rows
        .into_iter()
        .map(|m| BackupMenu {
            id: Some(m.id),
            name: m.name,
            items_json: m.items_json,
            created_at: Some(m.created_at),
            updated_at: Some(m.updated_at),
        })
        .collect();

    // 4. Section templates (explicit columns)
    let section_templates = db
        .prepare(
            "SELECT id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked, created_at, updated_at FROM section_templates ORDER BY id ASC",
        )
        .all()
        .await?
        .results::<SectionTemplate>()?;

    // 5. Layout templates (explicit columns)
    let layout_templates = db
        .prepare(
            "SELECT id, name, description, template_html, template_css, is_locked, created_at, updated_at FROM layout_templates ORDER BY id ASC",
        )
        .all()
        .await?
        .results::<LayoutTemplate>()?;

    // 6. Entries (explicit columns, preserving parent_slug for hierarchy mapping)
    let raw_entries = db
        .prepare(
            "SELECT id, slug, title, type, status, description, cover_image, canonical_url, schema_json, category, tags, published_at, body_html, body_json, created_at, parent_id, path, sort_order, deleted_at, author_id, custom_fields_json FROM entries WHERE deleted_at IS NULL ORDER BY id ASC",
        )
        .all()
        .await?
        .results::<Entry>()?;

    let id_to_slug: HashMap<i64, String> = raw_entries
        .iter()
        .map(|e| (e.id, e.slug.clone()))
        .collect();

    let entries = raw_entries
        .into_iter()
        .map(|e| {
            let parent_slug = e.parent_id.and_then(|pid| id_to_slug.get(&pid).cloned());
            BackupEntry {
                id: Some(e.id),
                slug: e.slug,
                title: e.title,
                r#type: e.r#type,
                status: e.status,
                description: e.description,
                cover_image: e.cover_image,
                canonical_url: e.canonical_url,
                schema_json: e.schema_json,
                category: e.category,
                tags: e.tags,
                published_at: e.published_at,
                body_html: e.body_html,
                body_json: e.body_json,
                custom_fields_json: e.custom_fields_json,
                created_at: Some(e.created_at),
                parent_id: e.parent_id,
                parent_slug,
                path: e.path,
                sort_order: e.sort_order,
                deleted_at: e.deleted_at,
                author_id: e.author_id,
            }
        })
        .collect();

    // 7. Redirects (explicit columns)
    let redirect_rows = db
        .prepare(
            "SELECT id, source_path, target_url, status_code, notes, hit_count, created_at, updated_at FROM redirects ORDER BY id ASC",
        )
        .all()
        .await?
        .results::<Redirect>()?;

    let redirects = redirect_rows
        .into_iter()
        .map(|r| BackupRedirect {
            id: Some(r.id),
            source_path: r.source_path,
            target_url: r.target_url,
            status_code: r.status_code,
            notes: r.notes,
            hit_count: Some(r.hit_count),
            is_active: Some(true),
            created_at: Some(r.created_at),
            updated_at: Some(r.updated_at),
        })
        .collect();

    // 8. Media Manifest (explicit columns)
    let media_rows = db
        .prepare(
            "SELECT id, key, filename, mime_type, size_bytes, created_at FROM media ORDER BY id ASC",
        )
        .all()
        .await?
        .results::<MediaItem>()?;

    let media_manifest = media_rows
        .into_iter()
        .map(|m| {
            let url = format!("/media/{}", m.key);
            BackupMediaItem {
                id: Some(m.id),
                key: m.key,
                filename: m.filename,
                mime_type: m.mime_type,
                size_bytes: m.size_bytes,
                url: Some(url),
                created_at: m.created_at,
            }
        })
        .collect();

    Ok(ZygoBackupPayload {
        version: "1.0".to_string(),
        exported_at,
        settings: settings_map,
        menus,
        section_templates,
        layout_templates,
        entries,
        redirects,
        media_manifest,
    })
}

/// Upsert all entities from a backup payload into D1
pub async fn import_site_backup(
    db: &D1Database,
    payload: &ZygoBackupPayload,
) -> Result<ImportCounts> {
    // 1. Settings
    for (k, v) in &payload.settings {
        db.prepare(
            "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
        )
        .bind(&[k.as_str().into(), v.as_str().into()])?
        .run()
        .await?;
    }

    // 2. Menus
    for menu in &payload.menus {
        db.prepare(
            "INSERT INTO menus (name, items_json, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)
             ON CONFLICT(name) DO UPDATE SET items_json = excluded.items_json, updated_at = CURRENT_TIMESTAMP",
        )
        .bind(&[menu.name.as_str().into(), menu.items_json.as_str().into()])?
        .run()
        .await?;
    }

    // 3. Section Templates
    for template in &payload.section_templates {
        let locked_js = JsValue::from(if template.is_locked { 1 } else { 0 });
        db.prepare(
            "INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET
                 name = excluded.name,
                 description = excluded.description,
                 schema_json = excluded.schema_json,
                 template_html = excluded.template_html,
                 template_css = excluded.template_css,
                 css_classes_json = excluded.css_classes_json,
                 is_locked = excluded.is_locked,
                 updated_at = CURRENT_TIMESTAMP",
        )
        .bind(&[
            template.id.as_str().into(),
            template.name.as_str().into(),
            opt_js(&template.description),
            template.schema_json.as_str().into(),
            opt_js(&template.template_html),
            opt_js(&template.template_css),
            template.css_classes_json.as_str().into(),
            locked_js,
        ])?
        .run()
        .await?;
    }

    // 4. Layout Templates
    for layout in &payload.layout_templates {
        let locked_js = JsValue::from(if layout.is_locked { 1 } else { 0 });
        db.prepare(
            "INSERT INTO layout_templates (id, name, description, template_html, template_css, is_locked, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET
                 name = excluded.name,
                 description = excluded.description,
                 template_html = excluded.template_html,
                 template_css = excluded.template_css,
                 is_locked = excluded.is_locked,
                 updated_at = CURRENT_TIMESTAMP",
        )
        .bind(&[
            layout.id.as_str().into(),
            layout.name.as_str().into(),
            opt_js(&layout.description),
            layout.template_html.as_str().into(),
            layout.template_css.as_str().into(),
            locked_js,
        ])?
        .run()
        .await?;
    }

    // 5. Entries - Pass 1: Upsert entries
    for entry in &payload.entries {
        db.prepare(
            "INSERT INTO entries (
                slug, title, type, status, description, cover_image, canonical_url, schema_json,
                category, tags, published_at, body_html, body_json, custom_fields_json, path,
                sort_order, author_id, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, CURRENT_TIMESTAMP)
            ON CONFLICT(slug) DO UPDATE SET
                title = excluded.title,
                type = excluded.type,
                status = excluded.status,
                description = excluded.description,
                cover_image = excluded.cover_image,
                canonical_url = excluded.canonical_url,
                schema_json = excluded.schema_json,
                category = excluded.category,
                tags = excluded.tags,
                published_at = excluded.published_at,
                body_html = excluded.body_html,
                body_json = excluded.body_json,
                custom_fields_json = excluded.custom_fields_json,
                path = excluded.path,
                sort_order = excluded.sort_order,
                author_id = excluded.author_id,
                updated_at = CURRENT_TIMESTAMP",
        )
        .bind(&[
            entry.slug.as_str().into(),
            entry.title.as_str().into(),
            entry.r#type.as_str().into(),
            entry.status.as_str().into(),
            opt_js(&entry.description),
            opt_js(&entry.cover_image),
            opt_js(&entry.canonical_url),
            opt_js(&entry.schema_json),
            opt_js(&entry.category),
            opt_js(&entry.tags),
            opt_js(&entry.published_at),
            entry.body_html.as_str().into(),
            entry.body_json.as_str().into(),
            opt_js(&entry.custom_fields_json),
            opt_js(&entry.path),
            opt_js_i32(&entry.sort_order),
            opt_js_i64(&entry.author_id),
        ])?
        .run()
        .await?;
    }

    // 5. Entries - Pass 2: Relink parent_id by slug hierarchy
    for entry in &payload.entries {
        if let Some(ref pslug) = entry.parent_slug {
            db.prepare(
                "UPDATE entries SET parent_id = (SELECT id FROM entries WHERE slug = ?1) WHERE slug = ?2",
            )
            .bind(&[pslug.as_str().into(), entry.slug.as_str().into()])?
            .run()
            .await?;
        } else {
            db.prepare("UPDATE entries SET parent_id = NULL WHERE slug = ?1")
                .bind(&[entry.slug.as_str().into()])?
                .run()
                .await?;
        }
    }

    // 6. Redirects
    for redirect in &payload.redirects {
        db.prepare(
            "INSERT INTO redirects (source_path, target_url, status_code, notes, hit_count, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, COALESCE(?5, 0), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT(source_path) DO UPDATE SET
                 target_url = excluded.target_url,
                 status_code = excluded.status_code,
                 notes = excluded.notes,
                 updated_at = CURRENT_TIMESTAMP",
        )
        .bind(&[
            redirect.source_path.as_str().into(),
            redirect.target_url.as_str().into(),
            JsValue::from(redirect.status_code as f64),
            opt_js(&redirect.notes),
            opt_js_i64(&redirect.hit_count),
        ])?
        .run()
        .await?;
    }

    Ok(ImportCounts {
        settings: payload.settings.len(),
        menus: payload.menus.len(),
        section_templates: payload.section_templates.len(),
        layout_templates: payload.layout_templates.len(),
        entries: payload.entries.len(),
        redirects: payload.redirects.len(),
        media: payload.media_manifest.len(),
    })
}
