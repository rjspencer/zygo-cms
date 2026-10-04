use minijinja::{AutoEscape, Environment};
use zygo_core::models::{BreadcrumbItem, ContentType, Entry, EntryRevision, MenuItem, Pagination};

const DEFAULT_INDEX: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ page_title }}</title>
    <link rel="canonical" href="{{ canonical_url|safe }}">
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <nav>
            <a href="/">Home</a>
            {% for item in header_menu %}
            <a href="{{ item.url|safe }}">{{ item.label }}</a>
            {% endfor %}
        </nav>
    </header>
    <main>
        {% if heading %}
        <div class="taxonomy-header">
            <h1>{{ heading }}</h1>
            <a href="/">&larr; All posts</a>
        </div>
        {% endif %}
        <div class="posts-list">
            {% for post in posts %}
            <article class="post-summary">
                <h2><a href="{{ post.path|safe }}">{{ post.title }}</a></h2>
                <div class="post-meta">{{ post.display_date }}</div>
                <p>{{ post.meta_description }}</p>
            </article>
            {% endfor %}
        </div>
        {% if pagination %}
        <nav class="pagination">
            {% if pagination.has_prev %}
            <a href="{{ pagination.prev_url|safe }}">&larr; Previous</a>
            {% endif %}
            <span>Page {{ pagination.page }} of {{ pagination.total_pages }}</span>
            {% if pagination.has_next %}
            <a href="{{ pagination.next_url|safe }}">Next &rarr;</a>
            {% endif %}
        </nav>
        {% endif %}
    </main>
    <footer>
        <nav>
            {% for item in footer_menu %}
            <a href="{{ item.url|safe }}">{{ item.label }}</a>
            {% endfor %}
        </nav>
    </footer>
</body>
</html>"#;

const DEFAULT_POST: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ post.title }} &mdash; Zygo</title>
    <meta name="description" content="{{ post.meta_description }}">
    <link rel="canonical" href="{{ post.canonical|safe }}">
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <nav>
            <a href="/">Home</a>
            {% for item in header_menu %}
            <a href="{{ item.url|safe }}">{{ item.label }}</a>
            {% endfor %}
        </nav>
    </header>
    <main>
        {% if is_preview %}
        <div class="preview-banner">Preview Mode</div>
        {% endif %}
        <article>
            {% if post.cover_image %}
            <img class="cover-image" src="{{ post.cover_image|safe }}" alt="{{ post.title }}">
            {% endif %}
            <h1>{{ post.title }}</h1>
            <div class="post-meta">Published on {{ post.display_date }}</div>
            <div class="prose">
                {{ post.body_html|safe }}
            </div>
        </article>
    </main>
    <footer>
        <nav>
            {% for item in footer_menu %}
            <a href="{{ item.url|safe }}">{{ item.label }}</a>
            {% endfor %}
        </nav>
    </footer>
</body>
</html>"#;

const DEFAULT_PAGE: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ page.title }} &mdash; Zygo</title>
    <meta name="description" content="{{ page.meta_description }}">
    <link rel="canonical" href="{{ page.canonical|safe }}">
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <nav>
            <a href="/">Home</a>
            {% for item in header_menu %}
            <a href="{{ item.url|safe }}">{{ item.label }}</a>
            {% endfor %}
        </nav>
    </header>
    <main>
        {% if is_preview %}
        <div class="preview-banner">Preview Mode</div>
        {% endif %}
        <article>
            <nav class="breadcrumbs" aria-label="Breadcrumb">
                <a href="/">Home</a>
                {% for crumb in breadcrumbs %}
                <span class="crumb-separator">/</span>
                <a href="{{ crumb.path|safe }}">{{ crumb.title }}</a>
                {% endfor %}
                <span class="crumb-separator">/</span>
                <span class="crumb-current">{{ page.title }}</span>
            </nav>
            {% if page.cover_image %}
            <img class="cover-image" src="{{ page.cover_image|safe }}" alt="{{ page.title }}">
            {% endif %}
            <h1>{{ page.title }}</h1>
            <div class="prose">
                {{ page.body_html|safe }}
            </div>
            {% if children %}
            <aside class="subpages-nav">
                <h2>In this section</h2>
                <ul class="subpages-list">
                    {% for child in children %}
                    <li><a href="{{ child.path|safe }}">{{ child.title }}</a></li>
                    {% endfor %}
                </ul>
            </aside>
            {% endif %}
        </article>
    </main>
    <footer>
        <nav>
            {% for item in footer_menu %}
            <a href="{{ item.url|safe }}">{{ item.label }}</a>
            {% endfor %}
        </nav>
    </footer>
</body>
</html>"#;

const DEFAULT_SEARCH: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Search &mdash; Zygo</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <nav>
            <a href="/">Home</a>
            {% for item in header_menu %}
            <a href="{{ item.url|safe }}">{{ item.label }}</a>
            {% endfor %}
        </nav>
    </header>
    <main>
        <h1>Search</h1>
        <form action="/search" method="GET" class="search-form">
            <input type="search" name="q" value="{{ query }}" placeholder="Search...">
            <button type="submit">Search</button>
        </form>
        {% if query %}
        <p>Found {{ posts|length }} result(s) for "{{ query }}"</p>
        <div class="posts-list">
            {% for post in posts %}
            <article class="post-summary">
                <h2><a href="{{ post.path|safe }}">{{ post.title }}</a></h2>
                <div class="post-meta">{{ post.display_date }}</div>
                <p>{{ post.meta_description }}</p>
            </article>
            {% endfor %}
        </div>
        {% endif %}
    </main>
    <footer>
        <nav>
            {% for item in footer_menu %}
            <a href="{{ item.url|safe }}">{{ item.label }}</a>
            {% endfor %}
        </nav>
    </footer>
</body>
</html>"#;

const DEFAULT_SITEMAP: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>{{ origin }}/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    {% for entry in entries %}
    <url>
        <loc>{{ origin }}{{ entry.path }}</loc>
        <lastmod>{{ entry.display_date }}</lastmod>
        <changefreq>{% if entry.type == "post" %}monthly{% else %}weekly{% endif %}</changefreq>
        <priority>{% if entry.type == "post" %}0.7{% else %}0.8{% endif %}</priority>
    </url>
    {% endfor %}
</urlset>"#;

const DEFAULT_RSS: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Zygo CMS</title>
    <link>{{ origin }}/</link>
    <description>Recent posts from Zygo CMS</description>
    <language>en-us</language>
    <atom:link href="{{ origin }}/rss.xml" rel="self" type="application/rss+xml" />
    {% for post in posts %}
    <item>
      <title>{{ post.title }}</title>
      <link>{{ origin }}{{ post.path }}</link>
      <guid isPermaLink="true">{{ origin }}{{ post.path }}</guid>
      <pubDate>{{ post.rfc3339_date }}</pubDate>
      <description>{{ post.meta_description }}</description>
    </item>
    {% endfor %}
  </channel>
</rss>"#;

pub fn entry_to_context_value(entry: &Entry, origin: &str) -> serde_json::Value {
    let mut val = serde_json::to_value(entry).unwrap_or_else(|_| serde_json::json!({}));
    if let serde_json::Value::Object(ref mut map) = val {
        map.insert("path".to_string(), serde_json::Value::String(entry.path()));
        map.insert(
            "display_date".to_string(),
            serde_json::Value::String(entry.display_date().to_string()),
        );
        map.insert(
            "rfc3339_date".to_string(),
            serde_json::Value::String(entry.rfc3339_date()),
        );
        map.insert(
            "meta_description".to_string(),
            serde_json::Value::String(entry.meta_description()),
        );
        map.insert(
            "canonical".to_string(),
            serde_json::Value::String(entry.canonical(origin)),
        );
        map.insert(
            "schema_json_ld".to_string(),
            serde_json::Value::String(entry.schema_json_ld(origin)),
        );
        let tags: Vec<serde_json::Value> = entry
            .tag_list()
            .into_iter()
            .map(|t| serde_json::Value::String(t.to_string()))
            .collect();
        map.insert("tag_list".to_string(), serde_json::Value::Array(tags));

        let parsed_body: serde_json::Value =
            serde_json::from_str(&entry.body_json).unwrap_or(serde_json::Value::Null);
        map.insert("body_data".to_string(), parsed_body.clone());
        map.insert("body".to_string(), parsed_body);

        if let Some(ref cf) = entry.custom_fields_json {
            let parsed_cf: serde_json::Value =
                serde_json::from_str(cf).unwrap_or(serde_json::Value::Null);
            map.insert("custom_fields".to_string(), parsed_cf);
        }
    }
    val
}

fn create_env<'a>(content_types: &'a [ContentType]) -> worker::Result<Environment<'a>> {
    let mut env = Environment::new();
    env.set_auto_escape_callback(|_| AutoEscape::Html);

    // Register built-in default templates
    let _ = env.add_template("index", DEFAULT_INDEX);
    let _ = env.add_template("post", DEFAULT_POST);
    let _ = env.add_template("page", DEFAULT_PAGE);
    let _ = env.add_template("search", DEFAULT_SEARCH);
    let _ = env.add_template("sitemap", DEFAULT_SITEMAP);
    let _ = env.add_template("rss", DEFAULT_RSS);

    // Iterate over content_types and add each content_type's template_html to the environment
    for ct in content_types {
        let tmpl = ct.template_html.as_deref().unwrap_or_default();
        if !tmpl.trim().is_empty() {
            env.add_template(&ct.id, tmpl)
                .map_err(|e| worker::Error::RustError(e.to_string()))?;
        } else if env.get_template(&ct.id).is_err() {
            env.add_template(&ct.id, tmpl)
                .map_err(|e| worker::Error::RustError(e.to_string()))?;
        }
    }

    Ok(env)
}

fn render_template(
    env: &Environment,
    name: &str,
    fallback_name: Option<&str>,
    ctx: serde_json::Value,
) -> worker::Result<String> {
    let tmpl = env
        .get_template(name)
        .or_else(|_| {
            if let Some(fb) = fallback_name {
                env.get_template(fb)
            } else {
                env.get_template(name)
            }
        })
        .map_err(|e| worker::Error::RustError(e.to_string()))?;

    tmpl.render(ctx)
        .map_err(|e| worker::Error::RustError(e.to_string()))
}

fn page_title(heading: Option<&str>, pagination: Option<&Pagination>) -> String {
    let base_title = if let Some(h) = heading {
        h.to_string()
    } else {
        "Home".to_string()
    };

    if let Some(p) = pagination {
        if p.page > 1 {
            return format!("{base_title} (Page {}) \u{2014} Zygo", p.page);
        }
    }

    format!("{base_title} \u{2014} Zygo")
}

fn canonical_url(
    origin: &str,
    canonical_path: Option<&str>,
    pagination: Option<&Pagination>,
) -> String {
    let base = origin.trim_end_matches('/');
    let page_num = pagination.map(|p| p.page).unwrap_or(1);

    if let Some(path) = canonical_path {
        let clean_path = path.trim_end_matches('/');
        if page_num > 1 {
            format!("{base}{clean_path}?page={page_num}")
        } else {
            format!("{base}{clean_path}")
        }
    } else if page_num > 1 {
        format!("{base}/?page={page_num}")
    } else {
        format!("{base}/")
    }
}

pub fn render_index(
    content_types: &[ContentType],
    posts: &[Entry],
    origin: &str,
    pagination: Option<Pagination>,
    header_menu: &[MenuItem],
    footer_menu: &[MenuItem],
) -> worker::Result<String> {
    render_index_internal(
        content_types,
        posts,
        origin,
        None,
        None,
        pagination,
        header_menu,
        footer_menu,
    )
}

pub fn render_tag_index(
    content_types: &[ContentType],
    posts: &[Entry],
    origin: &str,
    tag: &str,
    pagination: Option<Pagination>,
    header_menu: &[MenuItem],
    footer_menu: &[MenuItem],
) -> worker::Result<String> {
    let heading = format!("Tag: #{tag}");
    let canonical = format!("/tag/{tag}");
    render_index_internal(
        content_types,
        posts,
        origin,
        Some(&heading),
        Some(&canonical),
        pagination,
        header_menu,
        footer_menu,
    )
}

pub fn render_category_index(
    content_types: &[ContentType],
    posts: &[Entry],
    origin: &str,
    category: &str,
    pagination: Option<Pagination>,
    header_menu: &[MenuItem],
    footer_menu: &[MenuItem],
) -> worker::Result<String> {
    let heading = format!("Category: {category}");
    let canonical = format!("/category/{category}");
    render_index_internal(
        content_types,
        posts,
        origin,
        Some(&heading),
        Some(&canonical),
        pagination,
        header_menu,
        footer_menu,
    )
}

fn render_index_internal(
    content_types: &[ContentType],
    posts: &[Entry],
    origin: &str,
    heading: Option<&str>,
    canonical_path: Option<&str>,
    pagination: Option<Pagination>,
    header_menu: &[MenuItem],
    footer_menu: &[MenuItem],
) -> worker::Result<String> {
    let env = create_env(content_types)?;

    let posts_vals: Vec<serde_json::Value> = posts
        .iter()
        .map(|p| entry_to_context_value(p, origin))
        .collect();

    let mut ctx = serde_json::Map::new();
    ctx.insert("posts".to_string(), serde_json::Value::Array(posts_vals));
    ctx.insert(
        "origin".to_string(),
        serde_json::Value::String(origin.to_string()),
    );
    if let Some(ref p) = pagination {
        ctx.insert(
            "pagination".to_string(),
            serde_json::to_value(p).unwrap_or_default(),
        );
    }
    if let Some(h) = heading {
        ctx.insert(
            "heading".to_string(),
            serde_json::Value::String(h.to_string()),
        );
    }
    ctx.insert(
        "canonical_path".to_string(),
        serde_json::to_value(canonical_path).unwrap_or_default(),
    );
    ctx.insert(
        "page_title".to_string(),
        serde_json::Value::String(page_title(heading, pagination.as_ref())),
    );
    ctx.insert(
        "canonical_url".to_string(),
        serde_json::Value::String(canonical_url(
            origin,
            canonical_path,
            pagination.as_ref(),
        )),
    );
    ctx.insert(
        "header_menu".to_string(),
        serde_json::to_value(header_menu).unwrap_or_default(),
    );
    ctx.insert(
        "footer_menu".to_string(),
        serde_json::to_value(footer_menu).unwrap_or_default(),
    );

    render_template(&env, "index", None, serde_json::Value::Object(ctx))
}

pub fn render_post(
    content_types: &[ContentType],
    post: &Entry,
    origin: &str,
    header_menu: &[MenuItem],
    footer_menu: &[MenuItem],
) -> worker::Result<String> {
    render_post_internal(content_types, post, origin, None, header_menu, footer_menu)
}

pub fn render_preview_post(
    content_types: &[ContentType],
    post: &Entry,
    origin: &str,
    rev: &EntryRevision,
    header_menu: &[MenuItem],
    footer_menu: &[MenuItem],
) -> worker::Result<String> {
    render_post_internal(
        content_types,
        post,
        origin,
        Some(rev),
        header_menu,
        footer_menu,
    )
}

fn render_post_internal(
    content_types: &[ContentType],
    post: &Entry,
    origin: &str,
    preview: Option<&EntryRevision>,
    header_menu: &[MenuItem],
    footer_menu: &[MenuItem],
) -> worker::Result<String> {
    let env = create_env(content_types)?;
    let entry_val = entry_to_context_value(post, origin);

    let parsed_body: serde_json::Value =
        serde_json::from_str(&post.body_json).unwrap_or(serde_json::Value::Null);

    let mut ctx = serde_json::Map::new();

    // Flatten body_json properties into the context so templates can access custom fields directly
    if let serde_json::Value::Object(ref body_map) = parsed_body {
        for (k, v) in body_map {
            ctx.insert(k.clone(), v.clone());
        }
    }

    ctx.insert("body".to_string(), parsed_body.clone());
    ctx.insert("body_data".to_string(), parsed_body.clone());
    ctx.insert("body_json".to_string(), parsed_body);

    ctx.insert("entry".to_string(), entry_val.clone());
    ctx.insert("post".to_string(), entry_val);

    if let Some(rev) = preview {
        ctx.insert(
            "preview".to_string(),
            serde_json::to_value(rev).unwrap_or_default(),
        );
        ctx.insert("is_preview".to_string(), serde_json::Value::Bool(true));
    } else {
        ctx.insert("is_preview".to_string(), serde_json::Value::Bool(false));
    }

    ctx.insert(
        "origin".to_string(),
        serde_json::Value::String(origin.to_string()),
    );
    ctx.insert(
        "header_menu".to_string(),
        serde_json::to_value(header_menu).unwrap_or_default(),
    );
    ctx.insert(
        "footer_menu".to_string(),
        serde_json::to_value(footer_menu).unwrap_or_default(),
    );

    render_template(
        &env,
        &post.r#type,
        Some("post"),
        serde_json::Value::Object(ctx),
    )
}

pub fn render_page(
    content_types: &[ContentType],
    page: &Entry,
    origin: &str,
    breadcrumbs: &[BreadcrumbItem],
    children: &[Entry],
    header_menu: &[MenuItem],
    footer_menu: &[MenuItem],
) -> worker::Result<String> {
    render_page_internal(
        content_types,
        page,
        origin,
        breadcrumbs,
        children,
        None,
        header_menu,
        footer_menu,
    )
}

pub fn render_preview_page(
    content_types: &[ContentType],
    page: &Entry,
    origin: &str,
    breadcrumbs: &[BreadcrumbItem],
    children: &[Entry],
    rev: &EntryRevision,
    header_menu: &[MenuItem],
    footer_menu: &[MenuItem],
) -> worker::Result<String> {
    render_page_internal(
        content_types,
        page,
        origin,
        breadcrumbs,
        children,
        Some(rev),
        header_menu,
        footer_menu,
    )
}

fn render_page_internal(
    content_types: &[ContentType],
    page: &Entry,
    origin: &str,
    breadcrumbs: &[BreadcrumbItem],
    children: &[Entry],
    preview: Option<&EntryRevision>,
    header_menu: &[MenuItem],
    footer_menu: &[MenuItem],
) -> worker::Result<String> {
    let env = create_env(content_types)?;
    let entry_val = entry_to_context_value(page, origin);

    let parsed_body: serde_json::Value =
        serde_json::from_str(&page.body_json).unwrap_or(serde_json::Value::Null);

    let mut ctx = serde_json::Map::new();

    // Flatten body_json properties into the context so templates can access custom fields directly
    if let serde_json::Value::Object(ref body_map) = parsed_body {
        for (k, v) in body_map {
            ctx.insert(k.clone(), v.clone());
        }
    }

    ctx.insert("body".to_string(), parsed_body.clone());
    ctx.insert("body_data".to_string(), parsed_body.clone());
    ctx.insert("body_json".to_string(), parsed_body);

    ctx.insert("entry".to_string(), entry_val.clone());
    ctx.insert("page".to_string(), entry_val);

    ctx.insert(
        "breadcrumbs".to_string(),
        serde_json::to_value(breadcrumbs).unwrap_or_default(),
    );

    let children_vals: Vec<serde_json::Value> = children
        .iter()
        .map(|c| entry_to_context_value(c, origin))
        .collect();
    ctx.insert("children".to_string(), serde_json::Value::Array(children_vals));

    if let Some(rev) = preview {
        ctx.insert(
            "preview".to_string(),
            serde_json::to_value(rev).unwrap_or_default(),
        );
        ctx.insert("is_preview".to_string(), serde_json::Value::Bool(true));
    } else {
        ctx.insert("is_preview".to_string(), serde_json::Value::Bool(false));
    }

    ctx.insert(
        "origin".to_string(),
        serde_json::Value::String(origin.to_string()),
    );
    ctx.insert(
        "header_menu".to_string(),
        serde_json::to_value(header_menu).unwrap_or_default(),
    );
    ctx.insert(
        "footer_menu".to_string(),
        serde_json::to_value(footer_menu).unwrap_or_default(),
    );

    render_template(
        &env,
        &page.r#type,
        Some("page"),
        serde_json::Value::Object(ctx),
    )
}

pub fn render_sitemap(
    content_types: &[ContentType],
    origin: &str,
    posts: &[Entry],
    env: &worker::Env,
    req: &worker::Request,
) -> worker::Result<worker::Response> {
    let minijinja_env = create_env(content_types)?;
    let entries_vals: Vec<serde_json::Value> = posts
        .iter()
        .map(|p| entry_to_context_value(p, origin))
        .collect();

    let mut ctx = serde_json::Map::new();
    ctx.insert(
        "origin".to_string(),
        serde_json::Value::String(origin.to_string()),
    );
    ctx.insert(
        "entries".to_string(),
        serde_json::Value::Array(entries_vals.clone()),
    );
    ctx.insert("posts".to_string(), serde_json::Value::Array(entries_vals));

    let body = render_template(
        &minijinja_env,
        "sitemap",
        Some("sitemap.xml"),
        serde_json::Value::Object(ctx),
    )?;

    let mut headers = worker::Headers::new();
    headers.set("Content-Type", "application/xml; charset=utf-8")?;
    crate::cache::add_cache_headers(&mut headers, env, req)?;

    worker::Response::ok(body).map(|res| res.with_headers(headers))
}

pub fn render_rss(
    content_types: &[ContentType],
    origin: &str,
    posts: &[Entry],
    env: &worker::Env,
    req: &worker::Request,
) -> worker::Result<worker::Response> {
    let minijinja_env = create_env(content_types)?;
    let posts_vals: Vec<serde_json::Value> = posts
        .iter()
        .map(|p| entry_to_context_value(p, origin))
        .collect();

    let mut ctx = serde_json::Map::new();
    ctx.insert(
        "origin".to_string(),
        serde_json::Value::String(origin.to_string()),
    );
    ctx.insert("posts".to_string(), serde_json::Value::Array(posts_vals));

    let body = render_template(
        &minijinja_env,
        "rss",
        Some("rss.xml"),
        serde_json::Value::Object(ctx),
    )?;

    let mut headers = worker::Headers::new();
    headers.set("Content-Type", "application/rss+xml; charset=utf-8")?;
    crate::cache::add_cache_headers(&mut headers, env, req)?;

    worker::Response::ok(body).map(|res| res.with_headers(headers))
}

pub fn render_search_html(
    content_types: &[ContentType],
    query: &str,
    posts: &[Entry],
    header_menu: &[MenuItem],
    footer_menu: &[MenuItem],
) -> worker::Result<String> {
    let env = create_env(content_types)?;
    let posts_vals: Vec<serde_json::Value> = posts
        .iter()
        .map(|p| entry_to_context_value(p, ""))
        .collect();

    let mut ctx = serde_json::Map::new();
    ctx.insert(
        "query".to_string(),
        serde_json::Value::String(query.to_string()),
    );
    ctx.insert(
        "posts".to_string(),
        serde_json::Value::Array(posts_vals.clone()),
    );
    ctx.insert("entries".to_string(), serde_json::Value::Array(posts_vals));
    ctx.insert(
        "header_menu".to_string(),
        serde_json::to_value(header_menu).unwrap_or_default(),
    );
    ctx.insert(
        "footer_menu".to_string(),
        serde_json::to_value(footer_menu).unwrap_or_default(),
    );

    render_template(&env, "search", None, serde_json::Value::Object(ctx))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dummy_post() -> Entry {
        Entry {
            id: 1,
            slug: "hello-world".to_string(),
            title: "Hello World".to_string(),
            r#type: "post".to_string(),
            status: "published".to_string(),
            description: Some("My first post description".to_string()),
            cover_image: Some("https://example.com/cover.jpg".to_string()),
            canonical_url: None,
            schema_json: None,
            category: Some("Technology".to_string()),
            tags: Some("rust, minijinja".to_string()),
            published_at: Some("2026-10-04 12:00:00".to_string()),
            body_html: "<p>Hello <strong>world</strong> content</p>".to_string(),
            body_json: r#"{"headline": "Welcome to My Blog", "author_bio": "Rust Enthusiast"}"#.to_string(),
            custom_fields_json: Some(r#"{"reading_time": 5}"#.to_string()),
            search_text: None,
            created_at: "2026-10-04 10:00:00".to_string(),
            parent_id: None,
            path: None,
            sort_order: None,
            deleted_at: None,
            author_id: None,
        }
    }

    fn dummy_page() -> Entry {
        Entry {
            id: 2,
            slug: "about".to_string(),
            title: "About Us".to_string(),
            r#type: "page".to_string(),
            status: "published".to_string(),
            description: Some("About page description".to_string()),
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: None,
            tags: None,
            published_at: Some("2026-10-04 12:00:00".to_string()),
            body_html: "<p>About page content</p>".to_string(),
            body_json: r#"{"hero_title": "Our Mission"}"#.to_string(),
            custom_fields_json: None,
            search_text: None,
            created_at: "2026-10-04 10:00:00".to_string(),
            parent_id: None,
            path: Some("/about".to_string()),
            sort_order: None,
            deleted_at: None,
            author_id: None,
        }
    }

    #[test]
    fn test_render_index_custom_template() {
        let ct = ContentType {
            id: "index".to_string(),
            name: "Index Template".to_string(),
            template_html: Some("<ul class=\"posts\">{% for post in posts %}<li><a href=\"{{ post.path|safe }}\">{{ post.title }}</a> - {{ post.display_date }}</li>{% endfor %}</ul>".to_string()),
            ..Default::default()
        };
        let content_types = vec![ct];
        let posts = vec![dummy_post()];
        let html = render_index(&content_types, &posts, "https://example.com", None, &[], &[]).unwrap();
        assert!(html.contains("<ul class=\"posts\">"));
        assert!(html.contains("<a href=\"/post/hello-world\">Hello World</a>"));
        assert!(html.contains("2026-10-04"));
    }

    #[test]
    fn test_render_post_with_body_json_access() {
        let ct = ContentType {
            id: "post".to_string(),
            name: "Post Template".to_string(),
            template_html: Some("<article><h1>{{ post.title }}</h1><h2>{{ headline }}</h2><p>{{ body.author_bio }}</p><div>{{ post.body_html|safe }}</div></article>".to_string()),
            ..Default::default()
        };
        let content_types = vec![ct];
        let post = dummy_post();
        let html = render_post(&content_types, &post, "https://example.com", &[], &[]).unwrap();
        assert!(html.contains("<h1>Hello World</h1>"));
        assert!(html.contains("<h2>Welcome to My Blog</h2>"));
        assert!(html.contains("<p>Rust Enthusiast</p>"));
        assert!(html.contains("<div><p>Hello <strong>world</strong> content</p></div>"));
    }

    #[test]
    fn test_render_post_custom_content_type() {
        let mut post = dummy_post();
        post.r#type = "announcement".to_string();

        let ct = ContentType {
            id: "announcement".to_string(),
            name: "Announcement".to_string(),
            template_html: Some("<div class=\"banner\">Announcement: {{ post.title }} - {{ headline }}</div>".to_string()),
            ..Default::default()
        };
        let content_types = vec![ct];
        let html = render_post(&content_types, &post, "https://example.com", &[], &[]).unwrap();
        assert!(html.contains("<div class=\"banner\">Announcement: Hello World - Welcome to My Blog</div>"));
    }

    #[test]
    fn test_render_page_breadcrumbs_and_children() {
        let ct = ContentType {
            id: "page".to_string(),
            name: "Page Template".to_string(),
            template_html: Some("<div class=\"page\"><h1>{{ page.title }}</h1><h3>{{ hero_title }}</h3>{% for b in breadcrumbs %}<a href=\"{{ b.path|safe }}\">{{ b.title }}</a>{% endfor %}{% for c in children %}<span>{{ c.title }}</span>{% endfor %}</div>".to_string()),
            ..Default::default()
        };
        let content_types = vec![ct];
        let page = dummy_page();
        let breadcrumbs = vec![BreadcrumbItem { title: "Home".to_string(), path: "/".to_string() }];
        let children = vec![dummy_post()];
        let html = render_page(&content_types, &page, "https://example.com", &breadcrumbs, &children, &[], &[]).unwrap();
        assert!(html.contains("<h1>About Us</h1>"));
        assert!(html.contains("<h3>Our Mission</h3>"));
        assert!(html.contains("<a href=\"/\">Home</a>"));
        assert!(html.contains("<span>Hello World</span>"));
    }

    #[test]
    fn test_render_preview_post() {
        let ct = ContentType {
            id: "post".to_string(),
            name: "Post".to_string(),
            template_html: Some("{% if is_preview %}<span class=\"preview-tag\">PREVIEW</span>{% endif %}<h1>{{ post.title }}</h1>".to_string()),
            ..Default::default()
        };
        let content_types = vec![ct];
        let post = dummy_post();
        let rev = EntryRevision {
            id: 1,
            entry_id: 1,
            title: "Draft Revision Title".to_string(),
            description: None,
            cover_image: None,
            category: None,
            tags: None,
            body_html: "<p>Rev content</p>".to_string(),
            body_json: "{}".to_string(),
            custom_fields_json: None,
            created_at: "2026-10-04 12:00:00".to_string(),
            preview_token: "abc-123".to_string(),
        };
        let html = render_preview_post(&content_types, &post, "https://example.com", &rev, &[], &[]).unwrap();
        assert!(html.contains("<span class=\"preview-tag\">PREVIEW</span>"));
        assert!(html.contains("<h1>Hello World</h1>"));
    }

    #[test]
    fn test_render_search_html() {
        let ct = ContentType {
            id: "search".to_string(),
            name: "Search".to_string(),
            template_html: Some("<div class=\"search-results\">Query: {{ query }} - Count: {{ posts|length }}</div>".to_string()),
            ..Default::default()
        };
        let content_types = vec![ct];
        let posts = vec![dummy_post()];
        let html = render_search_html(&content_types, "rust", &posts, &[], &[]).unwrap();
        assert!(html.contains("Query: rust - Count: 1"));
    }

    #[test]
    fn test_default_fallbacks() {
        let content_types: Vec<ContentType> = vec![];
        let posts = vec![dummy_post()];
        let page = dummy_page();

        let index_html = render_index(&content_types, &posts, "https://example.com", None, &[], &[]).unwrap();
        assert!(index_html.contains("Hello World"));

        let post_html = render_post(&content_types, &dummy_post(), "https://example.com", &[], &[]).unwrap();
        assert!(post_html.contains("Hello World"));

        let page_html = render_page(&content_types, &page, "https://example.com", &[], &[], &[], &[]).unwrap();
        assert!(page_html.contains("About Us"));

        let search_html = render_search_html(&content_types, "test", &posts, &[], &[]).unwrap();
        assert!(search_html.contains("Search"));
    }
}
