#!/bin/bash
cat << 'INNER_EOF' >> packages/admin-api-worker/src/handlers/section_templates.rs

pub async fn list_section_template_revisions(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = crate::auth_required!(&req, ctx);
    let d1 = ctx.env.d1("DB")?;
    let id = ctx.param("id").unwrap();
    
    match zygo_core::db::section_template::get_revisions_list(&d1, id).await {
        Ok(revisions) => Response::from_json(&serde_json::json!({"data": revisions})),
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}

pub async fn restore_section_template_revision(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let _user = crate::auth_required!(&req, ctx);
    let d1 = ctx.env.d1("DB")?;
    let id = ctx.param("id").unwrap();
    let revision_id = ctx.param("revision_id").unwrap();
    
    let revision = match zygo_core::db::section_template::get_revision(&d1, revision_id).await {
        Ok(Some(r)) => r,
        Ok(None) => return AppError::NotFound.to_response(),
        Err(e) => return AppError::ServerError(e.to_string()).to_response(),
    };

    if revision.section_template_id != id {
        return AppError::BadRequest("Revision does not belong to this template".into()).to_response();
    }

    // Before restoring, save the CURRENT state as a revision
    if let Ok(Some(current_st)) = zygo_core::db::section_template::get_by_id(&d1, id).await {
        let backup_rev = zygo_core::models::SectionTemplateRevision {
            id: crate::utils::generate_id(),
            section_template_id: current_st.id.clone(),
            name: current_st.name.clone(),
            description: current_st.description.clone(),
            schema_json: current_st.schema_json.clone(),
            template_html: current_st.template_html.clone(),
            template_css: current_st.template_css.clone(),
            css_classes_json: current_st.css_classes_json.clone(),
            is_locked: current_st.is_locked,
            created_at: String::new(),
        };
        let _ = zygo_core::db::section_template::create_revision(&d1, &backup_rev).await;
        let _ = zygo_core::db::section_template::prune_revisions(&d1, id, 20).await;
    }

    let payload = zygo_core::models::SectionTemplatePayload {
        id: Some(id.clone()),
        name: revision.name,
        description: revision.description,
        schema_json: revision.schema_json,
        template_html: revision.template_html,
        template_css: revision.template_css,
        css_classes_json: Some(revision.css_classes_json),
        is_locked: Some(revision.is_locked),
        force: Some(true),
    };

    match zygo_core::db::section_template::upsert(&d1, id, &payload).await {
        Ok(_) => {
            crate::handlers::section_templates::purge_template_usage_cache(&ctx.env, &req, &d1, id).await;
            Response::from_json(&serde_json::json!({"success": true}))
        }
        Err(e) => AppError::ServerError(e.to_string()).to_response(),
    }
}
INNER_EOF

# Add revision hook inside upsert_section_template
# Find `match db::section_template::upsert(&d1, &id, &payload).await {` and insert our hook right before it.

sed -i '' '/match db::section_template::upsert(&d1, &id, &payload).await {/i\
    if let Some(ref old_st) = existing_template {\
        let rev = zygo_core::models::SectionTemplateRevision {\
            id: crate::utils::generate_id(),\
            section_template_id: old_st.id.clone(),\
            name: old_st.name.clone(),\
            description: old_st.description.clone(),\
            schema_json: old_st.schema_json.clone(),\
            template_html: old_st.template_html.clone(),\
            template_css: old_st.template_css.clone(),\
            css_classes_json: old_st.css_classes_json.clone(),\
            is_locked: old_st.is_locked,\
            created_at: String::new(),\
        };\
        let _ = db::section_template::create_revision(\&d1, \&rev).await;\
        let _ = db::section_template::prune_revisions(\&d1, \&id, 20).await;\
    }\
' packages/admin-api-worker/src/handlers/section_templates.rs

