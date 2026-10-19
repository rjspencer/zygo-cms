use minijinja::Environment;
use zygo_core::models::{
    BreadcrumbItem, ContentType, Entry, EntryRevision, LayoutTemplate, MenuItem, Pagination,
    SectionTemplate, ThemeTokens,
};

const DEFAULT_INDEX: &str = r##"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ page_title }}</title>
    <link rel="canonical" href="{{ canonical_url|safe }}">
    {% if site_favicon %}
    <link rel="icon" href="{{ site_favicon|safe }}">
    {% endif %}
    {% if og_image %}
    <meta property="og:image" content="{{ og_image|safe }}">
    <meta name="twitter:image" content="{{ og_image|safe }}">
    <meta name="twitter:card" content="summary_large_image">
    {% endif %}
    {% if theme_font_url %}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="{{ theme_font_url|safe }}">
    {% endif %}
    <link rel="stylesheet" href="/style-{{ styles_hash }}.css">
    {% if theme_css %}
    <style>{{ theme_css|safe }}</style>
    {% endif %}
</head>
<body>
    <a href="#main-content" class="skip-link">Skip to content</a>
    <header class="header-{{ header_layout }}">
        <div class="site-branding">
            <a href="/" class="site-title">{% if site_logo %}<img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo">{% else %}{{ site_title }}{% endif %}</a>
            {% if site_tagline %}
            <div class="site-tagline">{{ site_tagline }}</div>
            {% endif %}
        </div>
        <nav aria-label="Main Navigation">
            {% for item in header_menu %}
            <a href="{{ item.url|safe }}">{{ item.title }}</a>
            {% endfor %}
        </nav>
    </header>
    <main id="main-content">
        {% if heading %}
        <div class="taxonomy-header">
            <h1>{{ heading }}</h1>
            <a href="/posts">&larr; All posts</a>
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
        <nav class="pagination" aria-label="Pagination">
            {% if pagination.has_prev %}
            <a href="{{ pagination.prev_url|safe }}" rel="prev">&larr; Previous</a>
            {% endif %}
            <span>Page {{ pagination.page }} of {{ pagination.total_pages }}</span>
            {% if pagination.has_next %}
            <a href="{{ pagination.next_url|safe }}" rel="next">Next &rarr;</a>
            {% endif %}
        </nav>
        {% endif %}
    </main>
    <footer>
        <nav aria-label="Footer Navigation">
            {% for item in footer_menu %}
            <a href="{{ item.url|safe }}">{{ item.title }}</a>
            {% endfor %}
        </nav>
        {% if footer_text %}
        <div class="footer-text">{{ footer_text }}</div>
        {% endif %}
    </footer>
</body>
</html>"##;

const DEFAULT_POST: &str = r##"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ post.title }} &mdash; {{ site_title }}</title>
    <meta name="description" content="{{ post.meta_description }}">
    <link rel="canonical" href="{{ post.canonical|safe }}">
    {% if site_favicon %}
    <link rel="icon" href="{{ site_favicon|safe }}">
    {% endif %}
    {% if og_image %}
    <meta property="og:image" content="{{ og_image|safe }}">
    <meta name="twitter:image" content="{{ og_image|safe }}">
    <meta name="twitter:card" content="summary_large_image">
    {% endif %}
    {% if theme_font_url %}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="{{ theme_font_url|safe }}">
    {% endif %}
    <link rel="stylesheet" href="/style-{{ styles_hash }}.css">
    {% if theme_css %}
    <style>{{ theme_css|safe }}</style>
    {% endif %}
    {% if template_css %}
    <style>{{ template_css|safe }}</style>
    {% endif %}
</head>
<body>
    <a href="#main-content" class="skip-link">Skip to content</a>
    <header class="header-{{ header_layout }}">
        <div class="site-branding">
            <a href="/" class="site-title">{% if site_logo %}<img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo">{% else %}{{ site_title }}{% endif %}</a>
            {% if site_tagline %}
            <div class="site-tagline">{{ site_tagline }}</div>
            {% endif %}
        </div>
        <nav aria-label="Main Navigation">
            {% for item in header_menu %}
            <a href="{{ item.url|safe }}">{{ item.title }}</a>
            {% endfor %}
        </nav>
    </header>
    <main id="main-content">
        {% if is_preview %}
        <div class="preview-banner" role="status">Preview Mode</div>
        {% endif %}
        <article>
            {% if post.cover_image %}
            <img class="cover-image" src="{{ post.cover_image|safe }}" alt="{{ post.title }}">
            {% endif %}
            <h1>{{ post.title }}</h1>
            <div class="post-meta">Published on {{ post.display_date }}</div>
            {% if sections_html %}
            {{ sections_html|safe }}
            {% else %}
            <div class="prose">
                {{ post.body_html|safe }}
            </div>
            {% endif %}
        </article>
    </main>
    <footer>
        <nav aria-label="Footer Navigation">
            {% for item in footer_menu %}
            <a href="{{ item.url|safe }}">{{ item.title }}</a>
            {% endfor %}
        </nav>
        {% if footer_text %}
        <div class="footer-text">{{ footer_text }}</div>
        {% endif %}
    </footer>
</body>
</html>"##;

const DEFAULT_PAGE: &str = r##"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ page.title }} &mdash; {{ site_title }}</title>
    <meta name="description" content="{{ page.meta_description }}">
    <link rel="canonical" href="{{ page.canonical|safe }}">
    {% if site_favicon %}
    <link rel="icon" href="{{ site_favicon|safe }}">
    {% endif %}
    {% if og_image %}
    <meta property="og:image" content="{{ og_image|safe }}">
    <meta name="twitter:image" content="{{ og_image|safe }}">
    <meta name="twitter:card" content="summary_large_image">
    {% endif %}
    {% if theme_font_url %}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="{{ theme_font_url|safe }}">
    {% endif %}
    <link rel="stylesheet" href="/style-{{ styles_hash }}.css">
    {% if theme_css %}
    <style>{{ theme_css|safe }}</style>
    {% endif %}
    {% if template_css %}
    <style>{{ template_css|safe }}</style>
    {% endif %}
</head>
<body>
    <a href="#main-content" class="skip-link">Skip to content</a>
    <header class="header-{{ header_layout }}">
        <div class="site-branding">
            <a href="/" class="site-title">{% if site_logo %}<img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo">{% else %}{{ site_title }}{% endif %}</a>
            {% if site_tagline %}
            <div class="site-tagline">{{ site_tagline }}</div>
            {% endif %}
        </div>
        <nav aria-label="Main Navigation">
            {% for item in header_menu %}
            <a href="{{ item.url|safe }}">{{ item.title }}</a>
            {% endfor %}
        </nav>
    </header>
    <main id="main-content">
        {% if is_preview %}
        <div class="preview-banner" role="status">Preview Mode</div>
        {% endif %}
        <article class="{% if sections_html %}page-sections{% else %}page-standard{% endif %}">
            {% if sections_html %}
            {{ sections_html|safe }}
            {% else %}
            <nav class="breadcrumbs" aria-label="Breadcrumb">
                <a href="/">Home</a>
                {% for crumb in breadcrumbs %}
                <span class="crumb-separator" aria-hidden="true">/</span>
                <a href="{{ crumb.path|safe }}">{{ crumb.title }}</a>
                {% endfor %}
                <span class="crumb-separator" aria-hidden="true">/</span>
                <span class="crumb-current" aria-current="page">{{ page.title }}</span>
            </nav>
            {% if page.cover_image %}
            <img class="cover-image" src="{{ page.cover_image|safe }}" alt="{{ page.title }}">
            {% endif %}
            <h1>{{ page.title }}</h1>
            <div class="prose">
                {{ page.body_html|safe }}
            </div>
            {% endif %}
            {% if children %}
            <aside class="subpages-nav" aria-label="Subpages">
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
        <nav aria-label="Footer Navigation">
            {% for item in footer_menu %}
            <a href="{{ item.url|safe }}">{{ item.title }}</a>
            {% endfor %}
        </nav>
        {% if footer_text %}
        <div class="footer-text">{{ footer_text }}</div>
        {% endif %}
    </footer>
</body>
</html>"##;

const DEFAULT_SEARCH: &str = r##"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Search &mdash; {{ site_title }}</title>
    {% if site_favicon %}
    <link rel="icon" href="{{ site_favicon|safe }}">
    {% endif %}
    {% if og_image %}
    <meta property="og:image" content="{{ og_image|safe }}">
    <meta name="twitter:image" content="{{ og_image|safe }}">
    <meta name="twitter:card" content="summary_large_image">
    {% endif %}
    {% if theme_font_url %}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="{{ theme_font_url|safe }}">
    {% endif %}
    <link rel="stylesheet" href="/style-{{ styles_hash }}.css">
    {% if theme_css %}
    <style>{{ theme_css|safe }}</style>
    {% endif %}
</head>
<body>
    <a href="#main-content" class="skip-link">Skip to content</a>
    <header class="header-{{ header_layout }}">
        <div class="site-branding">
            <a href="/" class="site-title">{% if site_logo %}<img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo">{% else %}{{ site_title }}{% endif %}</a>
            {% if site_tagline %}
            <div class="site-tagline">{{ site_tagline }}</div>
            {% endif %}
        </div>
        <nav aria-label="Main Navigation">
            {% for item in header_menu %}
            <a href="{{ item.url|safe }}">{{ item.title }}</a>
            {% endfor %}
        </nav>
    </header>
    <main id="main-content">
        <h1>Search</h1>
        <form action="/search" method="GET" class="search-form" role="search">
            <input type="search" name="q" id="search-input" value="{{ query }}" placeholder="Search..." aria-label="Search posts">
            <button type="submit">Search</button>
        </form>
        {% if query %}
        <p class="search-results-info">Found {{ posts|length }} result(s) for "{{ query }}"</p>
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
        <nav aria-label="Footer Navigation">
            {% for item in footer_menu %}
            <a href="{{ item.url|safe }}">{{ item.title }}</a>
            {% endfor %}
        </nav>
        {% if footer_text %}
        <div class="footer-text">{{ footer_text }}</div>
        {% endif %}
    </footer>
</body>
</html>"##;

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
    <title>{{ site_title }}</title>
    <link>{{ origin }}/</link>
    <description>Recent posts from {{ site_title }}</description>
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

const DEFAULT_DOC: &str = r##"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ doc.title }} &mdash; Docs</title>
    <meta name="description" content="{{ doc.meta_description }}">
    <link rel="canonical" href="{{ doc.canonical|safe }}">
    {% if site_favicon %}
    <link rel="icon" href="{{ site_favicon|safe }}">
    {% endif %}
    {% if og_image %}
    <meta property="og:image" content="{{ og_image|safe }}">
    <meta name="twitter:image" content="{{ og_image|safe }}">
    <meta name="twitter:card" content="summary_large_image">
    {% endif %}
    {% if theme_font_url %}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="{{ theme_font_url|safe }}">
    {% endif %}
    <link rel="stylesheet" href="/style-{{ styles_hash }}.css">
    {% if theme_css %}
    <style>{{ theme_css|safe }}</style>
    {% endif %}
    {% if template_css %}
    <style>{{ template_css|safe }}</style>
    {% endif %}
</head>
<body class="docs-page">
    <a href="#main-content" class="skip-link">Skip to content</a>
    <header class="header-{{ header_layout }}">
        <div class="site-branding">
            <a href="/" class="site-title">{% if site_logo %}<img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo">{% else %}{{ site_title }}{% endif %}</a>
            {% if site_tagline %}
            <div class="site-tagline">{{ site_tagline }}</div>
            {% endif %}
        </div>
        <nav aria-label="Main Navigation">
            {% for item in header_menu %}
            <a href="{{ item.url|safe }}">{{ item.title }}</a>
            {% endfor %}
        </nav>
    </header>
    <div class="docs-layout">
        <aside class="docs-sidebar" aria-label="Documentation Sidebar">
            <div class="docs-search">
                <form action="/search" method="GET" role="search">
                    <input type="hidden" name="type" value="doc">
                    <input type="search" name="q" placeholder="Search docs..." aria-label="Search documentation" required>
                </form>
            </div>
            <nav class="docs-nav" aria-label="Documentation Navigation">
                {{ docs_tree_html|safe }}
            </nav>
        </aside>
        
        <main class="docs-main" id="main-content">
            {% if is_preview %}
            <div class="preview-banner" role="status">Preview Mode</div>
            {% endif %}
            <article>
                <h1>{{ doc.title }}</h1>
                <div class="prose docs-content" id="docs-content">
                    {{ doc.body_html|safe }}
                </div>
            </article>
            
            <nav class="docs-footer-nav" aria-label="Document Paging">
                <div>
                    {% if prev_doc %}
                    <a href="{{ prev_doc.path|safe }}">&larr; {{ prev_doc.title }}</a>
                    {% endif %}
                </div>
                <div>
                    {% if next_doc %}
                    <a href="{{ next_doc.path|safe }}">{{ next_doc.title }} &rarr;</a>
                    {% endif %}
                </div>
            </nav>
        </main>
        
        <aside class="docs-toc" aria-label="Table of contents">
            <h3>On this page</h3>
            <ul id="toc-container" class="toc-list"></ul>
        </aside>
    </div>
    <footer>
        <nav aria-label="Footer Navigation">
            {% for item in footer_menu %}
            <a href="{{ item.url|safe }}">{{ item.title }}</a>
            {% endfor %}
        </nav>
        {% if footer_text %}
        <div class="footer-text">{{ footer_text }}</div>
        {% endif %}
    </footer>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const content = document.getElementById('docs-content');
            const tocContainer = document.getElementById('toc-container');
            if (!content || !tocContainer) return;
            
            const headings = content.querySelectorAll('h2, h3');
            if (headings.length === 0) {
                const tocAside = document.querySelector('.docs-toc');
                if (tocAside) tocAside.style.display = 'none';
                return;
            }
            
            headings.forEach((heading, index) => {
                if (!heading.id) {
                    heading.id = 'heading-' + index;
                }
                const li = document.createElement('li');
                li.className = 'toc-' + heading.tagName.toLowerCase();
                const a = document.createElement('a');
                a.href = '#' + heading.id;
                a.textContent = heading.textContent;
                
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    heading.scrollIntoView({ behavior: 'smooth' });
                    history.pushState(null, null, '#' + heading.id);
                    document.querySelectorAll('.toc-list a').forEach((link) => link.classList.remove('active'));
                    a.classList.add('active');
                });
                
                li.appendChild(a);
                tocContainer.appendChild(li);
            });

            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            const id = entry.target.id;
                            const links = tocContainer.querySelectorAll('a');
                            links.forEach((link) => {
                                if (link.getAttribute('href') === '#' + id) {
                                    link.classList.add('active');
                                } else {
                                    link.classList.remove('active');
                                }
                            });
                        }
                    });
                }, { rootMargin: '0px 0px -70% 0px' });
                
                headings.forEach((h) => observer.observe(h));
            }
        });
    </script>
</body>
</html>"##;

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

fn create_env<'a>(
    section_templates: &'a [SectionTemplate],
    layout_templates: Option<&'a [LayoutTemplate]>,
) -> worker::Result<Environment<'a>> {
    let mut env = Environment::new();
    zygo_core::template_engine::configure_env(&mut env);

    let index_tmpl = layout_templates
        .and_then(|lt| lt.iter().find(|t| t.id == "index"))
        .map(|t| t.template_html.as_str())
        .unwrap_or(DEFAULT_INDEX);
    let post_tmpl = layout_templates
        .and_then(|lt| lt.iter().find(|t| t.id == "post"))
        .map(|t| t.template_html.as_str())
        .unwrap_or(DEFAULT_POST);
    let page_tmpl = layout_templates
        .and_then(|lt| lt.iter().find(|t| t.id == "page"))
        .map(|t| t.template_html.as_str())
        .unwrap_or(DEFAULT_PAGE);
    let doc_tmpl = layout_templates
        .and_then(|lt| lt.iter().find(|t| t.id == "doc"))
        .map(|t| t.template_html.as_str())
        .unwrap_or(DEFAULT_DOC);

    // Register built-in default templates or database overrides
    let _ = env.add_template("index", index_tmpl);
    let _ = env.add_template("post", post_tmpl);
    let _ = env.add_template("page", page_tmpl);
    let _ = env.add_template("doc", doc_tmpl);
    let _ = env.add_template("search", DEFAULT_SEARCH);
    let _ = env.add_template("sitemap", DEFAULT_SITEMAP);
    let _ = env.add_template("rss", DEFAULT_RSS);

    // Iterate over section_templates and add each template_html to the environment.
    // Skip broken templates instead of returning an error.
    for st in section_templates {
        let tmpl = st.template_html.as_deref().unwrap_or_default();
        if !tmpl.trim().is_empty() {
            let _ = env.add_template(&st.id, tmpl);
        } else if env.get_template(&st.id).is_err() {
            let _ = env.add_template(&st.id, tmpl);
        }
    }

    Ok(env)
}

fn build_docs_tree_html(docs: &[Entry], current_path: &str, parent_id: Option<i64>) -> String {
    let mut children: Vec<&Entry> = docs.iter().filter(|d| d.parent_id == parent_id).collect();
    if children.is_empty() {
        return String::new();
    }

    // Sort by sort_order
    children.sort_by_key(|d| d.sort_order.unwrap_or(0));

    let mut html = String::from("<ul>");
    for child in children {
        let path = child.path();
        let current_attr = if path == current_path {
            " aria-current=\"page\""
        } else {
            ""
        };
        html.push_str(&format!(
            "<li><a href=\"{}\"{}>{}</a>",
            path, current_attr, child.title
        ));

        let sub_tree = build_docs_tree_html(docs, current_path, Some(child.id));
        if !sub_tree.is_empty() {
            html.push_str(&sub_tree);
        }
        html.push_str("</li>");
    }
    html.push_str("</ul>");
    html
}

fn flatten_docs<'a>(docs: &'a [Entry], parent_id: Option<i64>, flattened: &mut Vec<&'a Entry>) {
    let mut children: Vec<&'a Entry> = docs.iter().filter(|d| d.parent_id == parent_id).collect();

    children.sort_by_key(|d| d.sort_order.unwrap_or(0));

    for child in children {
        let cid = child.id;
        flattened.push(child);
        flatten_docs(docs, Some(cid), flattened);
    }
}

pub fn generate_theme_root_css(
    settings: Option<&std::collections::HashMap<String, String>>,
) -> String {
    let tokens = ThemeTokens::resolve_from_settings(settings);

    let header_border = match tokens.header_border_style.as_str() {
        "none" => "none".to_string(),
        "solid" => format!("1px solid {}", tokens.color_border),
        _ => format!("3px double {}", tokens.color_border),
    };

    format!(
        ":root {{\n  --font-headline: {};\n  --font-body: {};\n  --color-bg: {};\n  --color-text: {};\n  --color-text-muted: {};\n  --color-accent: {};\n  --color-surface: {};\n  --color-border: {};\n  --content-max-width: {};\n  --font-size-base: {};\n  --line-height-body: {};\n  --header-layout: {};\n  --header-border-style: {};\n  --header-border: {header_border};\n  --header-title-size: {};\n  --header-nav-transform: {};\n  --header-padding: {};\n  --border-radius: {};\n  --box-shadow: {};\n}}",
        tokens.font_headline,
        tokens.font_body,
        tokens.color_bg,
        tokens.color_text,
        tokens.color_text_muted,
        tokens.color_accent,
        tokens.color_surface,
        tokens.color_border,
        tokens.max_width,
        tokens.font_size_base,
        tokens.line_height_body,
        tokens.header_layout,
        tokens.header_border_style,
        tokens.header_title_size,
        tokens.header_nav_transform,
        tokens.header_padding,
        tokens.border_radius,
        tokens.box_shadow,
    )
}

fn resolve_absolute_url(origin: &str, url: &str) -> String {
    let trimmed = url.trim();
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed.to_string()
    } else if trimmed.starts_with('/') {
        format!("{}{}", origin.trim_end_matches('/'), trimmed)
    } else {
        format!("{}/{}", origin.trim_end_matches('/'), trimmed)
    }
}

pub fn inject_theme_context(
    ctx: &mut serde_json::Map<String, serde_json::Value>,
    settings: Option<&std::collections::HashMap<String, String>>,
) {
    let tokens = ThemeTokens::resolve_from_settings(settings);

    let site_title = settings
        .and_then(|s| s.get("site_title").map(|v| v.as_str()))
        .filter(|v| !v.trim().is_empty())
        .unwrap_or("Zygo");

    let site_tagline = if !tokens.header_tagline.trim().is_empty() {
        tokens.header_tagline.as_str()
    } else {
        settings
            .and_then(|s| s.get("site_tagline").map(|v| v.as_str()))
            .filter(|v| !v.trim().is_empty())
            .unwrap_or("An Editorial Review & Journal")
    };

    let theme_css = generate_theme_root_css(settings);

    let default_hash = zygo_core::models::compute_styles_hash(&[include_str!("style.css")]);

    let styles_hash = settings
        .and_then(|s| s.get("styles_hash").map(|v| v.as_str()))
        .filter(|v| !v.trim().is_empty())
        .unwrap_or(&default_hash);

    if !tokens.font_url.trim().is_empty() {
        ctx.insert(
            "theme_font_url".to_string(),
            serde_json::Value::String(tokens.font_url),
        );
    }
    ctx.insert(
        "theme_css".to_string(),
        serde_json::Value::String(theme_css),
    );
    ctx.insert(
        "styles_hash".to_string(),
        serde_json::Value::String(styles_hash.to_string()),
    );
    ctx.insert(
        "site_title".to_string(),
        serde_json::Value::String(site_title.to_string()),
    );
    if !site_tagline.trim().is_empty() {
        ctx.insert(
            "site_tagline".to_string(),
            serde_json::Value::String(site_tagline.to_string()),
        );
    }
    ctx.insert(
        "header_layout".to_string(),
        serde_json::Value::String(tokens.header_layout),
    );

    let site_logo = settings
        .and_then(|s| s.get("site_logo").map(|v| v.as_str()))
        .filter(|v| !v.trim().is_empty());
    if let Some(logo) = site_logo {
        ctx.insert(
            "site_logo".to_string(),
            serde_json::Value::String(logo.to_string()),
        );
    }

    let site_favicon = settings
        .and_then(|s| s.get("site_favicon").map(|v| v.as_str()))
        .filter(|v| !v.trim().is_empty());
    if let Some(fav) = site_favicon {
        ctx.insert(
            "site_favicon".to_string(),
            serde_json::Value::String(fav.to_string()),
        );
    }

    let default_og_image = settings
        .and_then(|s| s.get("default_og_image").map(|v| v.as_str()))
        .filter(|v| !v.trim().is_empty());
    if let Some(og) = default_og_image {
        ctx.insert(
            "default_og_image".to_string(),
            serde_json::Value::String(og.to_string()),
        );
    }

    let footer_text = settings
        .and_then(|s| s.get("footer_text").map(|v| v.as_str()))
        .filter(|v| !v.trim().is_empty());
    if let Some(ft) = footer_text {
        ctx.insert(
            "footer_text".to_string(),
            serde_json::Value::String(ft.to_string()),
        );
    }

    if !ctx.contains_key("og_image") {
        let entry_cover = ctx
            .get("entry")
            .or_else(|| ctx.get("post"))
            .or_else(|| ctx.get("page"))
            .or_else(|| ctx.get("doc"))
            .and_then(|e| e.get("cover_image"))
            .and_then(|c| c.as_str())
            .filter(|c| !c.trim().is_empty());

        let raw_og = entry_cover.or(default_og_image);
        if let Some(raw_img) = raw_og {
            let origin = ctx.get("origin").and_then(|o| o.as_str()).unwrap_or("");
            let resolved = if !origin.is_empty() {
                resolve_absolute_url(origin, raw_img)
            } else {
                raw_img.to_string()
            };
            ctx.insert("og_image".to_string(), serde_json::Value::String(resolved));
        }
    }
}

pub fn render_doc(
    content_types: &[ContentType],
    doc: &Entry,
    all_docs: &[Entry],
    origin: &str,
    header_menu: &[MenuItem],
    footer_menu: &[MenuItem],
    settings: Option<&std::collections::HashMap<String, String>>,
    layout_templates: Option<&[LayoutTemplate]>,
) -> worker::Result<String> {
    let env = create_env(content_types, layout_templates)?;
    let entry_val = entry_to_context_value(doc, origin);

    let parsed_body: serde_json::Value =
        serde_json::from_str(&doc.body_json).unwrap_or(serde_json::Value::Null);

    let mut ctx = serde_json::Map::new();

    if let serde_json::Value::Object(ref body_map) = parsed_body {
        for (k, v) in body_map {
            ctx.insert(k.clone(), v.clone());
        }
    }

    ctx.insert("body".to_string(), parsed_body.clone());
    ctx.insert("body_data".to_string(), parsed_body.clone());
    ctx.insert("body_json".to_string(), parsed_body.clone());

    ctx.insert("entry".to_string(), entry_val.clone());
    ctx.insert("doc".to_string(), entry_val);

    let (sections_html, template_css) = render_sections(&env, content_types, &parsed_body);
    ctx.insert(
        "sections_html".to_string(),
        serde_json::Value::String(sections_html),
    );
    if let Some(css) = template_css {
        ctx.insert("template_css".to_string(), serde_json::Value::String(css));
    } else {
        ctx.insert("template_css".to_string(), serde_json::Value::Null);
    }

    ctx.insert("is_preview".to_string(), serde_json::Value::Bool(false));

    let tree_html = build_docs_tree_html(all_docs, &doc.path(), None);
    ctx.insert(
        "docs_tree_html".to_string(),
        serde_json::Value::String(tree_html),
    );

    let mut flat = Vec::new();
    flatten_docs(all_docs, None, &mut flat);

    let current_index = flat.iter().position(|d| d.id == doc.id);
    if let Some(idx) = current_index {
        if idx > 0 {
            ctx.insert(
                "prev_doc".to_string(),
                entry_to_context_value(&flat[idx - 1], origin),
            );
        }
        if idx < flat.len() - 1 {
            ctx.insert(
                "next_doc".to_string(),
                entry_to_context_value(&flat[idx + 1], origin),
            );
        }
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

    inject_theme_context(&mut ctx, settings);

    render_template(
        &env,
        &doc.r#type,
        Some("doc"),
        serde_json::Value::Object(ctx),
    )
}

fn render_sections(
    env: &Environment,
    section_templates: &[SectionTemplate],
    parsed_body: &serde_json::Value,
) -> (String, Option<String>) {
    let mut sections_html = String::new();
    let mut used_template_ids: Vec<String> = Vec::new();

    if let serde_json::Value::Array(sections) = parsed_body {
        for section in sections {
            let type_id = section
                .get("type_id")
                .or_else(|| section.get("template_id"))
                .or_else(|| section.get("type"))
                .and_then(|v| v.as_str());

            if let Some(tid) = type_id {
                if let Ok(tmpl) = env.get_template(tid) {
                    let section_data = section.get("data").unwrap_or(section);
                    if let Ok(rendered) = tmpl.render(section_data) {
                        sections_html.push_str(&format!(
                            "<div class=\"template-{}\" style=\"display: contents;\">{}</div>",
                            tid, rendered
                        ));
                        if !used_template_ids.iter().any(|id| id == tid) {
                            used_template_ids.push(tid.to_string());
                        }
                    }
                }
            }
        }
    }

    let mut used_css: Vec<String> = Vec::new();
    for tid in &used_template_ids {
        if let Some(st) = section_templates.iter().find(|t| &t.id == tid) {
            if let Some(ref css) = st.template_css {
                let trimmed = css.trim();
                if !trimmed.is_empty() {
                    used_css.push(format!(".template-{} {{\n{}\n}}", tid, trimmed));
                }
            }
        }
    }
    let template_css = if !used_css.is_empty() {
        Some(used_css.join("\n"))
    } else {
        None
    };

    (sections_html, template_css)
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

fn page_title(heading: Option<&str>, pagination: Option<&Pagination>, site_title: &str) -> String {
    let base_title = if let Some(h) = heading {
        h.to_string()
    } else {
        "Home".to_string()
    };

    if let Some(p) = pagination {
        if p.page > 1 {
            return format!("{base_title} (Page {}) \u{2014} {site_title}", p.page);
        }
    }

    format!("{base_title} \u{2014} {site_title}")
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
    settings: Option<&std::collections::HashMap<String, String>>,
    layout_templates: Option<&[LayoutTemplate]>,
) -> worker::Result<String> {
    render_index_internal(
        content_types,
        posts,
        origin,
        None,
        Some("/posts"),
        pagination,
        header_menu,
        footer_menu,
        settings,
        layout_templates,
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
    settings: Option<&std::collections::HashMap<String, String>>,
    layout_templates: Option<&[LayoutTemplate]>,
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
        settings,
        layout_templates,
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
    settings: Option<&std::collections::HashMap<String, String>>,
    layout_templates: Option<&[LayoutTemplate]>,
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
        settings,
        layout_templates,
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
    settings: Option<&std::collections::HashMap<String, String>>,
    layout_templates: Option<&[LayoutTemplate]>,
) -> worker::Result<String> {
    let env = create_env(content_types, layout_templates)?;

    let posts_vals: Vec<serde_json::Value> = posts
        .iter()
        .map(|p| entry_to_context_value(p, origin))
        .collect();

    let site_title = settings
        .and_then(|s| s.get("site_title").map(|v| v.as_str()))
        .filter(|v| !v.trim().is_empty())
        .unwrap_or("Zygo");

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
        serde_json::Value::String(page_title(heading, pagination.as_ref(), site_title)),
    );
    ctx.insert(
        "canonical_url".to_string(),
        serde_json::Value::String(canonical_url(origin, canonical_path, pagination.as_ref())),
    );
    ctx.insert(
        "header_menu".to_string(),
        serde_json::to_value(header_menu).unwrap_or_default(),
    );
    ctx.insert(
        "footer_menu".to_string(),
        serde_json::to_value(footer_menu).unwrap_or_default(),
    );

    inject_theme_context(&mut ctx, settings);

    render_template(&env, "index", None, serde_json::Value::Object(ctx))
}

pub fn render_post(
    content_types: &[ContentType],
    post: &Entry,
    origin: &str,
    header_menu: &[MenuItem],
    footer_menu: &[MenuItem],
    settings: Option<&std::collections::HashMap<String, String>>,
    layout_templates: Option<&[LayoutTemplate]>,
) -> worker::Result<String> {
    render_post_internal(
        content_types,
        post,
        origin,
        None,
        header_menu,
        footer_menu,
        settings,
        layout_templates,
    )
}

pub fn render_preview_post(
    content_types: &[ContentType],
    post: &Entry,
    origin: &str,
    rev: &EntryRevision,
    header_menu: &[MenuItem],
    footer_menu: &[MenuItem],
    settings: Option<&std::collections::HashMap<String, String>>,
    layout_templates: Option<&[LayoutTemplate]>,
) -> worker::Result<String> {
    render_post_internal(
        content_types,
        post,
        origin,
        Some(rev),
        header_menu,
        footer_menu,
        settings,
        layout_templates,
    )
}

fn render_post_internal(
    content_types: &[ContentType],
    post: &Entry,
    origin: &str,
    preview: Option<&EntryRevision>,
    header_menu: &[MenuItem],
    footer_menu: &[MenuItem],
    settings: Option<&std::collections::HashMap<String, String>>,
    layout_templates: Option<&[LayoutTemplate]>,
) -> worker::Result<String> {
    let env = create_env(content_types, layout_templates)?;
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
    ctx.insert("body_json".to_string(), parsed_body.clone());

    ctx.insert("entry".to_string(), entry_val.clone());
    ctx.insert("post".to_string(), entry_val);

    let (sections_html, template_css) = render_sections(&env, content_types, &parsed_body);
    ctx.insert(
        "sections_html".to_string(),
        serde_json::Value::String(sections_html),
    );
    if let Some(css) = template_css {
        ctx.insert("template_css".to_string(), serde_json::Value::String(css));
    } else {
        ctx.insert("template_css".to_string(), serde_json::Value::Null);
    }

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

    inject_theme_context(&mut ctx, settings);

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
    settings: Option<&std::collections::HashMap<String, String>>,
    layout_templates: Option<&[LayoutTemplate]>,
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
        settings,
        layout_templates,
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
    settings: Option<&std::collections::HashMap<String, String>>,
    layout_templates: Option<&[LayoutTemplate]>,
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
        settings,
        layout_templates,
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
    settings: Option<&std::collections::HashMap<String, String>>,
    layout_templates: Option<&[LayoutTemplate]>,
) -> worker::Result<String> {
    let env = create_env(content_types, layout_templates)?;
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
    ctx.insert("body_json".to_string(), parsed_body.clone());

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
    ctx.insert(
        "children".to_string(),
        serde_json::Value::Array(children_vals),
    );

    let (sections_html, template_css) = render_sections(&env, content_types, &parsed_body);
    ctx.insert(
        "sections_html".to_string(),
        serde_json::Value::String(sections_html),
    );
    if let Some(css) = template_css {
        ctx.insert("template_css".to_string(), serde_json::Value::String(css));
    } else {
        ctx.insert("template_css".to_string(), serde_json::Value::Null);
    }

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

    inject_theme_context(&mut ctx, settings);

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
    let minijinja_env = create_env(content_types, None)?;
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
    let minijinja_env = create_env(content_types, None)?;
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
    settings: Option<&std::collections::HashMap<String, String>>,
    layout_templates: Option<&[LayoutTemplate]>,
) -> worker::Result<String> {
    let env = create_env(content_types, layout_templates)?;
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

    inject_theme_context(&mut ctx, settings);

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
            body_json: r#"{"headline": "Welcome to My Blog", "author_bio": "Rust Enthusiast"}"#
                .to_string(),
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
        let html = render_index(
            &content_types,
            &posts,
            "https://example.com",
            None,
            &[],
            &[],
            None,
            None,
        )
        .unwrap();
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
        let html =
            render_post(&content_types, &post, "https://example.com", &[], &[], None, None).unwrap();
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
            template_html: Some(
                "<div class=\"banner\">Announcement: {{ post.title }} - {{ headline }}</div>"
                    .to_string(),
            ),
            ..Default::default()
        };
        let content_types = vec![ct];
        let html =
            render_post(&content_types, &post, "https://example.com", &[], &[], None, None).unwrap();
        assert!(html.contains(
            "<div class=\"banner\">Announcement: Hello World - Welcome to My Blog</div>"
        ));
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
        let breadcrumbs = vec![BreadcrumbItem {
            title: "Home".to_string(),
            path: "/".to_string(),
        }];
        let children = vec![dummy_post()];
        let html = render_page(
            &content_types,
            &page,
            "https://example.com",
            &breadcrumbs,
            &children,
            &[],
            &[],
            None,
            None,
        )
        .unwrap();
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
        let html = render_preview_post(
            &content_types,
            &post,
            "https://example.com",
            &rev,
            &[],
            &[],
            None,
            None,
        )
        .unwrap();
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
        let html = render_search_html(&content_types, "rust", &posts, &[], &[], None, None).unwrap();
        assert!(html.contains("Query: rust - Count: 1"));
    }

    #[test]
    fn test_default_fallbacks() {
        let content_types: Vec<ContentType> = vec![];
        let posts = vec![dummy_post()];
        let page = dummy_page();

        let index_html = render_index(
            &content_types,
            &posts,
            "https://example.com",
            None,
            &[],
            &[],
            None,
            None,
        )
        .unwrap();
        assert!(index_html.contains("Hello World"));
        assert!(index_html.contains("<header class=\"header-centered\">"));
        assert!(index_html.contains("<a href=\"/\" class=\"site-title\">Zygo</a>"));
        assert!(
            index_html
                .contains("<div class=\"site-tagline\">An Editorial Review &amp; Journal</div>")
        );

        let post_html = render_post(
            &content_types,
            &dummy_post(),
            "https://example.com",
            &[],
            &[],
            None,
            None,
        )
        .unwrap();
        assert!(post_html.contains("Hello World"));
        assert!(post_html.contains("<header class=\"header-centered\">"));

        let page_html = render_page(
            &content_types,
            &page,
            "https://example.com",
            &[],
            &[],
            &[],
            &[],
            None,
            None,
        )
        .unwrap();
        assert!(page_html.contains("About Us"));
        assert!(page_html.contains("<header class=\"header-centered\">"));

        let search_html =
            render_search_html(&content_types, "test", &posts, &[], &[], None, None).unwrap();
        assert!(search_html.contains("Search"));
        assert!(search_html.contains("<header class=\"header-centered\">"));
    }

    #[test]
    fn test_custom_theme_settings_injection() {
        let content_types: Vec<ContentType> = vec![];
        let posts = vec![dummy_post()];
        let mut settings = std::collections::HashMap::new();
        settings.insert("site_title".to_string(), "The Daily Review".to_string());
        settings.insert(
            "theme_header_tagline".to_string(),
            "Notes on Architecture".to_string(),
        );
        settings.insert("theme_header_layout".to_string(), "split".to_string());
        settings.insert("theme_header_border_style".to_string(), "none".to_string());
        settings.insert("theme_color_accent".to_string(), "#2563eb".to_string());
        settings.insert(
            "theme_font_url".to_string(),
            "https://fonts.googleapis.com/css2?family=Playfair+Display&display=swap".to_string(),
        );

        let html = render_index(
            &content_types,
            &posts,
            "https://example.com",
            None,
            &[],
            &[],
            Some(&settings),
            None,
        )
        .unwrap();
        assert!(html.contains("<header class=\"header-split\">"));
        assert!(html.contains("<a href=\"/\" class=\"site-title\">The Daily Review</a>"));
        assert!(html.contains("<div class=\"site-tagline\">Notes on Architecture</div>"));
        assert!(
            html.contains("https://fonts.googleapis.com/css2?family=Playfair+Display&display=swap")
        );
        assert!(html.contains("--color-accent: #2563eb;"));
        assert!(html.contains("--header-border: none;"));
    }

    #[test]
    fn test_active_theme_name_resolution() {
        let content_types: Vec<ContentType> = vec![];
        let posts = vec![dummy_post()];
        let mut settings = std::collections::HashMap::new();
        settings.insert(
            "theme_active_name".to_string(),
            "Bento-Brutalism".to_string(),
        );

        let html = render_index(
            &content_types,
            &posts,
            "https://example.com",
            None,
            &[],
            &[],
            Some(&settings),
            None,
        )
        .unwrap();
        assert!(html.contains("<header class=\"header-split\">"));
        assert!(html.contains("--color-accent: #007799;"));
        assert!(html.contains(
            "--font-headline: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;"
        ));
        assert!(
            html.contains(
                "<div class=\"site-tagline\">Specs, Dispatches &amp; Agentic Systems</div>"
            )
        );
    }

    #[test]
    fn test_video_embed_filter() {
        // YouTube formats
        assert_eq!(
            zygo_core::template_engine::video_embed_filter(
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            ),
            "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
        );
        assert_eq!(
            zygo_core::template_engine::video_embed_filter("https://youtu.be/dQw4w9WgXcQ?t=10s"),
            "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
        );
        assert_eq!(
            zygo_core::template_engine::video_embed_filter(
                "https://www.youtube.com/embed/dQw4w9WgXcQ"
            ),
            "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
        );
        assert_eq!(
            zygo_core::template_engine::video_embed_filter(
                "https://www.youtube.com/shorts/dQw4w9WgXcQ"
            ),
            "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
        );
        assert_eq!(
            zygo_core::template_engine::video_embed_filter(
                "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
            ),
            "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
        );

        // Vimeo formats
        assert_eq!(
            zygo_core::template_engine::video_embed_filter("https://vimeo.com/123456789"),
            "https://player.vimeo.com/video/123456789"
        );
        assert_eq!(
            zygo_core::template_engine::video_embed_filter(
                "https://player.vimeo.com/video/123456789?h=abcd"
            ),
            "https://player.vimeo.com/video/123456789"
        );
        assert_eq!(
            zygo_core::template_engine::video_embed_filter(
                "https://vimeo.com/123456789?param=value"
            ),
            "https://player.vimeo.com/video/123456789"
        );

        // Non-video or unsupported URLs
        assert_eq!(
            zygo_core::template_engine::video_embed_filter("https://example.com/video.mp4"),
            ""
        );
        assert_eq!(
            zygo_core::template_engine::video_embed_filter("https://dailymotion.com/video/x7"),
            ""
        );
        assert_eq!(zygo_core::template_engine::video_embed_filter(""), "");
        assert_eq!(zygo_core::template_engine::video_embed_filter("   "), "");
    }

    #[test]
    fn test_render_page_sections_and_css_inlining() {
        let hero_st = SectionTemplate {
            id: "hero".to_string(),
            name: "Hero Section".to_string(),
            template_html: Some("<section class=\"hero-section\"><h1>{{ headline }}</h1><p>{{ subtitle }}</p></section>".to_string()),
            template_css: Some(".hero-section { background: #000; color: #fff; }".to_string()),
            ..Default::default()
        };

        let text_st = SectionTemplate {
            id: "text".to_string(),
            name: "Text Section".to_string(),
            template_html: Some(
                "<section class=\"text-section\"><div>{{ content|safe }}</div></section>"
                    .to_string(),
            ),
            template_css: Some(".text-section { padding: 2rem; }".to_string()),
            ..Default::default()
        };

        let unused_st = SectionTemplate {
            id: "faq".to_string(),
            name: "FAQ Section".to_string(),
            template_html: Some(
                "<section class=\"faq-section\"><h2>FAQ</h2></section>".to_string(),
            ),
            template_css: Some(".faq-section { background: yellow; }".to_string()),
            ..Default::default()
        };

        let templates = vec![hero_st, text_st, unused_st];

        let mut page = dummy_page();
        page.body_json = serde_json::json!([
            {
                "type_id": "hero",
                "data": {
                    "headline": "Welcome to Zygo",
                    "subtitle": "Blazing fast edge CMS"
                }
            },
            {
                "type": "text",
                "data": {
                    "content": "<p>This is rendered from section template.</p>"
                }
            }
        ])
        .to_string();

        let html = render_page(
            &templates,
            &page,
            "https://example.com",
            &[],
            &[],
            &[],
            &[],
            None,
            None,
        )
        .unwrap();

        // Check rendered section content
        assert!(html.contains("<section class=\"hero-section\"><h1>Welcome to Zygo</h1><p>Blazing fast edge CMS</p></section>"));
        assert!(html.contains("<section class=\"text-section\"><div><p>This is rendered from section template.</p></div></section>"));

        // Check CSS inlining only for used sections
        assert!(html.contains(".hero-section { background: #000; color: #fff; }"));
        assert!(html.contains(".text-section { padding: 2rem; }"));
        assert!(!html.contains(".faq-section { background: yellow; }"));
    }

    #[test]
    fn test_skip_missing_or_failing_section_templates() {
        let valid_st = SectionTemplate {
            id: "hero".to_string(),
            name: "Hero".to_string(),
            template_html: Some("<div class=\"hero\">{{ headline }}</div>".to_string()),
            template_css: Some(".hero { color: red; }".to_string()),
            ..Default::default()
        };

        let templates = vec![valid_st];

        let mut page = dummy_page();
        page.body_json = serde_json::json!([
            {
                "type_id": "non_existent_section",
                "data": { "foo": "bar" }
            },
            {
                "type_id": "hero",
                "data": { "headline": "Hero Survived" }
            }
        ])
        .to_string();

        // Rendering page must succeed and skip missing section
        let html = render_page(
            &templates,
            &page,
            "https://example.com",
            &[],
            &[],
            &[],
            &[],
            None,
            None,
        )
        .unwrap();
        assert!(html.contains("<div class=\"hero\">Hero Survived</div>"));
        assert!(!html.contains("non_existent_section"));
    }

    #[test]
    fn test_create_env_skips_broken_templates() {
        let broken_st = SectionTemplate {
            id: "broken".to_string(),
            name: "Broken Template".to_string(),
            template_html: Some("{% if unclosed_tag %}<p>fail".to_string()),
            ..Default::default()
        };

        let valid_st = SectionTemplate {
            id: "valid".to_string(),
            name: "Valid Template".to_string(),
            template_html: Some("<p>Success</p>".to_string()),
            ..Default::default()
        };

        let templates = vec![broken_st, valid_st];
        let env_res = create_env(&templates, None);
        assert!(
            env_res.is_ok(),
            "create_env must succeed even with broken templates"
        );
        let env = env_res.unwrap();
        assert!(env.get_template("valid").is_ok());
        assert!(env.get_template("broken").is_err());
    }

    fn dummy_doc(id: i64, title: &str, slug: &str, body: &str) -> Entry {
        Entry {
            id,
            slug: slug.to_string(),
            title: title.to_string(),
            r#type: "doc".to_string(),
            status: "published".to_string(),
            description: Some("Doc description".to_string()),
            cover_image: None,
            canonical_url: None,
            schema_json: None,
            category: None,
            tags: None,
            published_at: Some("2026-10-10 12:00:00".to_string()),
            body_html: body.to_string(),
            body_json: "{}".to_string(),
            custom_fields_json: None,
            search_text: None,
            created_at: "2026-10-10 10:00:00".to_string(),
            parent_id: None,
            path: None,
            sort_order: None,
            deleted_at: None,
            author_id: None,
        }
    }

    #[test]
    fn test_render_doc_page_styling_and_layout() {
        let doc = dummy_doc(
            1,
            "Getting Started",
            "getting-started",
            "<h2>Introduction</h2><p>Welcome to {{ site_title }} documentation.</p><h3>Configuration</h3><p>Details here.</p>",
        );

        let all_docs = vec![
            dummy_doc(
                1,
                "Getting Started",
                "getting-started",
                "<h2>Introduction</h2><p>Welcome to {{ site_title }} documentation.</p><h3>Configuration</h3><p>Details here.</p>",
            ),
            dummy_doc(2, "Architecture", "architecture", "<p>Arch</p>"),
        ];
        let html = render_doc(&[], &doc, &all_docs, "https://example.com", &[], &[], None, None).unwrap();

        assert!(html.contains("<body class=\"docs-page\">"));
        assert!(html.contains("class=\"docs-layout\""));
        assert!(html.contains("class=\"docs-sidebar\""));
        assert!(html.contains("class=\"docs-main\""));
        assert!(html.contains("class=\"docs-toc\""));
        assert!(html.contains("class=\"prose docs-content\""));
        assert!(html.contains("Getting Started"));
        assert!(html.contains("Architecture"));
        assert!(html.contains("/style-"));
    }

    #[test]
    fn test_layout_template_db_override() {
        use zygo_core::models::LayoutTemplate;

        let custom_template = LayoutTemplate {
            id: "post".to_string(),
            name: "Custom Post Template".to_string(),
            description: Some("Customized post layout".to_string()),
            template_html: "<main class=\"custom-post\"><h1>{{ post.title }}</h1><div class=\"custom-content\">{{ post.body_html|safe }}</div></main>".to_string(),
            template_css: ".custom-post { margin: 2rem; }".to_string(),
            is_locked: false,
            created_at: "2026-10-14 10:00:00".to_string(),
            updated_at: "2026-10-14 10:00:00".to_string(),
        };

        let post = dummy_post();
        let templates = vec![custom_template];

        let html = render_post(
            &[],
            &post,
            "https://example.com",
            &[],
            &[],
            None,
            Some(&templates),
        )
        .unwrap();

        assert!(html.contains("<main class=\"custom-post\">"));
        assert!(html.contains("<h1>Hello World</h1>"));
        assert!(html.contains("<div class=\"custom-content\"><p>Hello <strong>world</strong> content</p></div>"));
    }

    #[test]
    fn test_render_all_10_section_templates_under_shipped_themes() {
        let templates = vec![
            SectionTemplate {
                id: "hero".to_string(),
                name: "Hero".to_string(),
                template_html: Some(r#"<section class="section-hero"><h1>{{ headline }}</h1></section>"#.to_string()),
                template_css: Some(".section-hero { border-radius: var(--border-radius); }".to_string()),
                ..Default::default()
            },
            SectionTemplate {
                id: "text".to_string(),
                name: "Text".to_string(),
                template_html: Some(r#"<section class="section-text"><h2>{{ title }}</h2>{{ body|safe }}</section>"#.to_string()),
                template_css: Some(".section-text { color: var(--color-text); }".to_string()),
                ..Default::default()
            },
            SectionTemplate {
                id: "text-image".to_string(),
                name: "Text + Image".to_string(),
                template_html: Some(r#"<section class="section-text-image"><h2>{{ title }}</h2><img src="{{ image }}"></section>"#.to_string()),
                template_css: Some(".section-text-image { border-color: var(--color-border); }".to_string()),
                ..Default::default()
            },
            SectionTemplate {
                id: "gallery".to_string(),
                name: "Gallery".to_string(),
                template_html: Some(r#"<section class="section-gallery"><h2>{{ title }}</h2>{% for img in images %}<figure><img src="{{ img.image }}"></figure>{% endfor %}</section>"#.to_string()),
                template_css: Some(".section-gallery { background: var(--color-surface); }".to_string()),
                ..Default::default()
            },
            SectionTemplate {
                id: "image-carousel".to_string(),
                name: "Carousel".to_string(),
                template_html: Some(r#"<section class="section-carousel"><h2>{{ title }}</h2>{% for s in slides %}<img src="{{ s.image }}">{% endfor %}</section>"#.to_string()),
                template_css: Some(".section-carousel { border-radius: var(--border-radius); }".to_string()),
                ..Default::default()
            },
            SectionTemplate {
                id: "call-to-action".to_string(),
                name: "CTA".to_string(),
                template_html: Some(r#"<section class="section-cta"><h2>{{ heading }}</h2><a href="{{ button_url }}">{{ button_label }}</a></section>"#.to_string()),
                template_css: Some(".section-cta { background: var(--color-accent); }".to_string()),
                ..Default::default()
            },
            SectionTemplate {
                id: "feature-grid".to_string(),
                name: "Features".to_string(),
                template_html: Some(r#"<section class="section-features"><h2>{{ title }}</h2>{% for f in features %}<h3>{{ f.title }}</h3>{% endfor %}</section>"#.to_string()),
                template_css: Some(".section-features { border-color: var(--color-border); }".to_string()),
                ..Default::default()
            },
            SectionTemplate {
                id: "testimonial".to_string(),
                name: "Testimonial".to_string(),
                template_html: Some(r#"<section class="section-testimonial"><blockquote>{{ quote }}</blockquote><cite>{{ author }}</cite></section>"#.to_string()),
                template_css: Some(".section-testimonial { border-radius: var(--border-radius); }".to_string()),
                ..Default::default()
            },
            SectionTemplate {
                id: "faq".to_string(),
                name: "FAQ".to_string(),
                template_html: Some(r#"<section class="section-faq"><h2>{{ title }}</h2>{% for q in questions %}<details><summary>{{ q.question }}</summary>{{ q.answer|safe }}</details>{% endfor %}</section>"#.to_string()),
                template_css: Some(".section-faq { background: var(--color-surface); }".to_string()),
                ..Default::default()
            },
            SectionTemplate {
                id: "video-embed".to_string(),
                name: "Video Embed".to_string(),
                template_html: Some(r#"<section class="section-video"><h2>{{ title }}</h2><iframe src="{{ video_url|video_embed }}"></iframe></section>"#.to_string()),
                template_css: Some(".section-video { border-radius: var(--border-radius); }".to_string()),
                ..Default::default()
            },
        ];

        let mut page = dummy_page();
        page.body_json = serde_json::json!([
            { "type_id": "hero", "data": { "headline": "Hero Title" } },
            { "type_id": "text", "data": { "title": "Text Title", "body": "<p>Prose</p>" } },
            { "type_id": "text-image", "data": { "title": "TI Title", "image": "/test.jpg" } },
            { "type_id": "gallery", "data": { "title": "Gallery Title", "images": [{ "image": "/1.jpg" }] } },
            { "type_id": "image-carousel", "data": { "title": "Carousel Title", "slides": [{ "image": "/2.jpg" }] } },
            { "type_id": "call-to-action", "data": { "heading": "CTA Title", "button_label": "Go", "button_url": "/start" } },
            { "type_id": "feature-grid", "data": { "title": "Features Title", "features": [{ "title": "Feat 1" }] } },
            { "type_id": "testimonial", "data": { "quote": "Great platform", "author": "Alice" } },
            { "type_id": "faq", "data": { "title": "FAQ Title", "questions": [{ "question": "Q1", "answer": "<p>A1</p>" }] } },
            { "type_id": "video-embed", "data": { "title": "Video Title", "video_url": "https://www.youtube.com/watch?v=123" } },
        ]).to_string();

        // 1. Render under Modern Editorial
        let mut modern_settings = std::collections::HashMap::new();
        modern_settings.insert("theme_active_name".to_string(), "Modern Editorial".to_string());
        let modern_html = render_page(
            &templates,
            &page,
            "https://example.com",
            &[],
            &[],
            &[],
            &[],
            Some(&modern_settings),
            None,
        ).unwrap();

        assert!(modern_html.contains("header-centered"));
        assert!(modern_html.contains("#991b1b")); // Modern editorial accent
        assert!(modern_html.contains("Hero Title"));
        assert!(modern_html.contains("Text Title"));
        assert!(modern_html.contains("TI Title"));
        assert!(modern_html.contains("Gallery Title"));
        assert!(modern_html.contains("Carousel Title"));
        assert!(modern_html.contains("CTA Title"));
        assert!(modern_html.contains("Features Title"));
        assert!(modern_html.contains("Great platform"));
        assert!(modern_html.contains("Alice"));
        assert!(modern_html.contains("FAQ Title"));
        assert!(modern_html.contains("Video Title"));

        // 2. Render under Bento-Brutalism
        let mut bento_settings = std::collections::HashMap::new();
        bento_settings.insert("theme_active_name".to_string(), "Bento-Brutalism".to_string());
        let bento_html = render_page(
            &templates,
            &page,
            "https://example.com",
            &[],
            &[],
            &[],
            &[],
            Some(&bento_settings),
            None,
        ).unwrap();

        assert!(bento_html.contains("header-split"));
        assert!(bento_html.contains("#007799")); // Bento brutalism cyan accent
        assert!(bento_html.contains("Hero Title"));
        assert!(bento_html.contains("Video Title"));
    }

    #[test]
    fn test_site_branding_and_og_rendering() {
        let mut settings = std::collections::HashMap::new();
        settings.insert("site_title".to_string(), "My Tech Blog".to_string());
        settings.insert("site_logo".to_string(), "https://example.com/logo.png".to_string());
        settings.insert("site_favicon".to_string(), "/favicon.ico".to_string());
        settings.insert("default_og_image".to_string(), "/default-og.png".to_string());
        settings.insert("footer_text".to_string(), "© 2026 My Tech Blog. All rights reserved.".to_string());

        let page = dummy_page();
        let html = render_page(
            &[],
            &page,
            "https://example.com",
            &[],
            &[],
            &[],
            &[],
            Some(&settings),
            None,
        ).unwrap();

        // Check favicon link
        assert!(html.contains(r#"<link rel="icon" href="/favicon.ico">"#));

        // Check logo in branding
        assert!(html.contains(r#"<img src="https://example.com/logo.png" alt="My Tech Blog" class="site-logo">"#));

        // Check default og:image resolved against origin
        assert!(html.contains(r#"<meta property="og:image" content="https://example.com/default-og.png">"#));
        assert!(html.contains(r#"<meta name="twitter:image" content="https://example.com/default-og.png">"#));

        // Check footer text
        assert!(html.contains(r#"<div class="footer-text">© 2026 My Tech Blog. All rights reserved.</div>"#));

        // When entry has its own cover image, it takes precedence
        let mut page_with_cover = dummy_page();
        page_with_cover.cover_image = Some("/custom-cover.jpg".to_string());
        let html_cover = render_page(
            &[],
            &page_with_cover,
            "https://example.com",
            &[],
            &[],
            &[],
            &[],
            Some(&settings),
            None,
        ).unwrap();

        assert!(html_cover.contains(r#"<meta property="og:image" content="https://example.com/custom-cover.jpg">"#));
        assert!(html_cover.contains(r#"<meta name="twitter:image" content="https://example.com/custom-cover.jpg">"#));
    }
}
