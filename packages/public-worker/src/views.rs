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
    {% if theme_fouc_script %}
    {{ theme_fouc_script|safe }}
    {% endif %}
</head>
<body>
    <a href="#main-content" class="skip-link">Skip to content</a>
    <header class="header-{{ header_layout }}">
        <div class="site-branding">
            <a href="/" class="site-title">{% if site_logo %}<img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo site-logo-light">{% if site_logo_dark %}<img src="{{ site_logo_dark|safe }}" alt="{{ site_title }}" class="site-logo site-logo-dark">{% endif %}{% elif site_logo_dark %}<img src="{{ site_logo_dark|safe }}" alt="{{ site_title }}" class="site-logo site-logo-dark">{% else %}{{ site_title }}{% endif %}</a>
            {% if site_tagline %}
            <div class="site-tagline">{{ site_tagline }}</div>
            {% endif %}
        </div>
        <nav aria-label="Main Navigation">
            {% for item in header_menu %}
            <a href="{{ item.url|safe }}"{% if current_path and item.url == current_path %} aria-current="page"{% endif %}>{{ item.title }}</a>
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
        <div class="footer-nav-row">
            <nav aria-label="Footer Navigation">
                {% for item in footer_menu %}
                <a href="{{ item.url|safe }}"{% if current_path and item.url == current_path %} aria-current="page"{% endif %}>{{ item.title }}</a>
                {% endfor %}
            </nav>
            {% if theme_switcher_html %}
            {{ theme_switcher_html|safe }}
            {% endif %}
        </div>
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
    {% if theme_fouc_script %}
    {{ theme_fouc_script|safe }}
    {% endif %}
</head>
<body>
    <a href="#main-content" class="skip-link">Skip to content</a>
    <header class="header-{{ header_layout }}">
        <div class="site-branding">
            <a href="/" class="site-title">{% if site_logo %}<img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo site-logo-light">{% if site_logo_dark %}<img src="{{ site_logo_dark|safe }}" alt="{{ site_title }}" class="site-logo site-logo-dark">{% endif %}{% elif site_logo_dark %}<img src="{{ site_logo_dark|safe }}" alt="{{ site_title }}" class="site-logo site-logo-dark">{% else %}{{ site_title }}{% endif %}</a>
            {% if site_tagline %}
            <div class="site-tagline">{{ site_tagline }}</div>
            {% endif %}
        </div>
        <nav aria-label="Main Navigation">
            {% for item in header_menu %}
            <a href="{{ item.url|safe }}"{% if current_path and item.url == current_path %} aria-current="page"{% endif %}>{{ item.title }}</a>
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
        <div class="footer-nav-row">
            <nav aria-label="Footer Navigation">
                {% for item in footer_menu %}
                <a href="{{ item.url|safe }}"{% if current_path and item.url == current_path %} aria-current="page"{% endif %}>{{ item.title }}</a>
                {% endfor %}
            </nav>
            {% if theme_switcher_html %}
            {{ theme_switcher_html|safe }}
            {% endif %}
        </div>
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
    {% if theme_fouc_script %}
    {{ theme_fouc_script|safe }}
    {% endif %}
</head>
<body>
    <a href="#main-content" class="skip-link">Skip to content</a>
    <header class="header-{{ header_layout }}">
        <div class="site-branding">
            <a href="/" class="site-title">{% if site_logo %}<img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo site-logo-light">{% if site_logo_dark %}<img src="{{ site_logo_dark|safe }}" alt="{{ site_title }}" class="site-logo site-logo-dark">{% endif %}{% elif site_logo_dark %}<img src="{{ site_logo_dark|safe }}" alt="{{ site_title }}" class="site-logo site-logo-dark">{% else %}{{ site_title }}{% endif %}</a>
            {% if site_tagline %}
            <div class="site-tagline">{{ site_tagline }}</div>
            {% endif %}
        </div>
        <nav aria-label="Main Navigation">
            {% for item in header_menu %}
            <a href="{{ item.url|safe }}"{% if current_path and item.url == current_path %} aria-current="page"{% endif %}>{{ item.title }}</a>
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
        <div class="footer-nav-row">
            <nav aria-label="Footer Navigation">
                {% for item in footer_menu %}
                <a href="{{ item.url|safe }}"{% if current_path and item.url == current_path %} aria-current="page"{% endif %}>{{ item.title }}</a>
                {% endfor %}
            </nav>
            {% if theme_switcher_html %}
            {{ theme_switcher_html|safe }}
            {% endif %}
        </div>
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
    {% if theme_fouc_script %}
    {{ theme_fouc_script|safe }}
    {% endif %}
</head>
<body>
    <a href="#main-content" class="skip-link">Skip to content</a>
    <header class="header-{{ header_layout }}">
        <div class="site-branding">
            <a href="/" class="site-title">{% if site_logo %}<img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo site-logo-light">{% if site_logo_dark %}<img src="{{ site_logo_dark|safe }}" alt="{{ site_title }}" class="site-logo site-logo-dark">{% endif %}{% elif site_logo_dark %}<img src="{{ site_logo_dark|safe }}" alt="{{ site_title }}" class="site-logo site-logo-dark">{% else %}{{ site_title }}{% endif %}</a>
            {% if site_tagline %}
            <div class="site-tagline">{{ site_tagline }}</div>
            {% endif %}
        </div>
        <nav aria-label="Main Navigation">
            {% for item in header_menu %}
            <a href="{{ item.url|safe }}"{% if current_path and item.url == current_path %} aria-current="page"{% endif %}>{{ item.title }}</a>
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
        <div class="footer-nav-row">
            <nav aria-label="Footer Navigation">
                {% for item in footer_menu %}
                <a href="{{ item.url|safe }}"{% if current_path and item.url == current_path %} aria-current="page"{% endif %}>{{ item.title }}</a>
                {% endfor %}
            </nav>
            {% if theme_switcher_html %}
            {{ theme_switcher_html|safe }}
            {% endif %}
        </div>
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
    {% if theme_fouc_script %}
    {{ theme_fouc_script|safe }}
    {% endif %}
</head>
<body class="docs-page">
    <a href="#main-content" class="skip-link">Skip to content</a>
    <header class="header-{{ header_layout }}">
        <div class="site-branding">
            <a href="/" class="site-title">{% if site_logo %}<img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo site-logo-light">{% if site_logo_dark %}<img src="{{ site_logo_dark|safe }}" alt="{{ site_title }}" class="site-logo site-logo-dark">{% endif %}{% elif site_logo_dark %}<img src="{{ site_logo_dark|safe }}" alt="{{ site_title }}" class="site-logo site-logo-dark">{% else %}{{ site_title }}{% endif %}</a>
            {% if site_tagline %}
            <div class="site-tagline">{{ site_tagline }}</div>
            {% endif %}
        </div>
        <nav aria-label="Main Navigation">
            {% for item in header_menu %}
            <a href="{{ item.url|safe }}"{% if current_path and item.url == current_path %} aria-current="page"{% endif %}>{{ item.title }}</a>
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
        <div class="footer-nav-row">
            <nav aria-label="Footer Navigation">
                {% for item in footer_menu %}
                <a href="{{ item.url|safe }}"{% if current_path and item.url == current_path %} aria-current="page"{% endif %}>{{ item.title }}</a>
                {% endfor %}
            </nav>
            {% if theme_switcher_html %}
            {{ theme_switcher_html|safe }}
            {% endif %}
        </div>
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

pub const ZERO_FOUC_SCRIPT: &str = r#"<script>(function(){try{var t=localStorage.getItem('zygo_theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>"#;

pub const THEME_SWITCHER_HTML: &str = r##"<div class="theme-switcher" role="group" aria-label="Theme switcher">
  <button type="button" class="theme-switcher-btn" data-theme-set="light" aria-label="Light theme" title="Light theme" aria-pressed="false"><svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M7.5 0C7.77614 0 8 0.223858 8 0.5V2.5C8 2.77614 7.77614 3 7.5 3C7.22386 3 7 2.77614 7 2.5V0.5C7 0.223858 7.22386 0 7.5 0ZM2.1967 2.1967C2.39196 2.00144 2.70854 2.00144 2.90381 2.1967L4.31802 3.61091C4.51328 3.80617 4.51328 4.12276 4.31802 4.31802C4.12276 4.51328 3.80617 4.51328 3.61091 4.31802L2.1967 2.90381C2.00144 2.70854 2.00144 2.39196 2.1967 2.1967ZM0.5 7C0.223858 7 0 7.22386 0 7.5C0 7.77614 0.223858 8 0.5 8H2.5C2.77614 8 3 7.77614 3 7.5C3 7.22386 2.77614 7 2.5 7H0.5ZM2.1967 12.8033C2.00144 12.608 2.00144 12.2915 2.1967 12.0962L3.61091 10.682C3.80617 10.4867 4.12276 10.4867 4.31802 10.682C4.51328 10.8772 4.51328 11.1938 4.31802 11.3891L2.90381 12.8033C2.70854 12.9986 2.39196 12.9986 2.1967 12.8033ZM12.5 7C12.2239 7 12 7.22386 12 7.5C12 7.77614 12 7.5 12 7.5C12 7.77614 12 7.5 12 7.5H14.5C14.7761 8 15 7.77614 15 7.5C15 7.22386 14.7761 7 14.5 7H12.5ZM10.682 4.31802C10.4867 4.12276 10.4867 3.80617 10.682 3.61091L12.0962 2.1967C12.2915 2.00144 12.608 2.00144 12.8033 2.1967C12.9986 2.39196 12.9986 2.70854 12.8033 2.90381L11.3891 4.31802C11.1938 4.51328 10.8772 4.51328 10.682 4.31802ZM8 12.5C8 12.2239 7.77614 12 7.5 12C7.22386 12 7 12.2239 7 12.5V14.5C7 14.7761 7.22386 15 7.5 15C7.77614 15 8 14.7761 8 14.5V12.5ZM10.682 10.682C10.8772 10.4867 11.1938 10.4867 11.3891 10.682L12.8033 12.0962C12.9986 12.2915 12.9986 12.608 12.8033 12.8033C12.608 12.9986 12.2915 12.9986 12.0962 12.8033L10.682 11.3891C10.4867 11.1938 10.4867 10.8772 10.682 10.682ZM5.5 7.5C5.5 6.39543 6.39543 5.5 7.5 5.5C8.60457 5.5 9.5 6.39543 9.5 7.5C9.5 8.60457 8.60457 9.5 7.5 9.5C6.39543 9.5 5.5 8.60457 5.5 7.5ZM7.5 4.5C5.84315 4.5 4.5 5.84315 4.5 7.5C4.5 9.15685 5.84315 10.5 7.5 10.5C9.15685 10.5 10.5 9.15685 10.5 7.5C10.5 5.84315 9.15685 4.5 7.5 4.5Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg></button>
  <button type="button" class="theme-switcher-btn" data-theme-set="dark" aria-label="Dark theme" title="Dark theme" aria-pressed="false"><svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2.89998 0.499976C2.89998 0.279062 2.72089 0.0999756 2.49998 0.0999756C2.27906 0.0999756 2.09998 0.279062 2.09998 0.499976V1.09998H1.49998C1.27906 1.09998 1.09998 1.27906 1.09998 1.49998C1.09998 1.72089 1.27906 1.89998 1.49998 1.89998H2.09998V2.49998C2.09998 2.72089 2.27906 2.89998 2.49998 2.89998C2.72089 2.89998 2.89998 2.72089 2.89998 2.49998V1.89998H3.49998C3.72089 1.89998 3.89998 1.72089 3.89998 1.49998C3.89998 1.27906 3.72089 1.09998 3.49998 1.09998H2.89998V0.499976ZM5.89998 3.49998C5.89998 3.27906 5.72089 3.09998 5.49998 3.09998C5.27906 3.09998 5.09998 3.27906 5.09998 3.49998V4.09998H4.49998C4.27906 4.09998 4.09998 4.27906 4.09998 4.49998C4.09998 4.72089 4.27906 4.89998 4.49998 4.89998H5.09998V5.49998C5.09998 5.72089 5.27906 5.89998 5.49998 5.89998C5.72089 5.89998 5.89998 5.72089 5.89998 5.49998V4.89998H6.49998C6.72089 4.89998 6.89998 4.72089 6.89998 4.49998C6.89998 4.27906 6.72089 4.09998 6.49998 4.09998H5.89998V3.49998ZM1.89998 6.49998C1.89998 6.27906 1.72089 6.09998 1.49998 6.09998C1.27906 6.09998 1.09998 6.27906 1.09998 6.49998V7.09998H0.499976C0.279062 7.09998 0.0999756 7.27906 0.0999756 7.49998C0.0999756 7.72089 0.279062 7.89998 0.499976 7.89998H1.09998V8.49998C1.09998 8.72089 1.27906 8.89997 1.49998 8.89997C1.72089 8.89997 1.89998 8.72089 1.89998 8.49998V7.89998H2.49998C2.72089 7.89998 2.89998 7.72089 2.89998 7.49998C2.89998 7.27906 2.72089 7.09998 2.49998 7.09998H1.89998V6.49998ZM8.54406 0.98184L8.24618 0.941586C8.03275 0.917676 7.90692 1.1655 8.02936 1.34194C8.17013 1.54479 8.29981 1.75592 8.41754 1.97445C8.91878 2.90485 9.20322 3.96932 9.20322 5.10022C9.20322 8.37201 6.82247 11.0878 3.69887 11.6097C3.45736 11.65 3.20988 11.6772 2.96008 11.6906C2.74563 11.702 2.62729 11.9535 2.77721 12.1072C2.84551 12.1773 2.91535 12.2458 2.98667 12.3128L3.05883 12.3795L3.31883 12.6045L3.50684 12.7532L3.62796 12.8433L3.81491 12.9742L3.99079 13.089C4.11175 13.1651 4.23536 13.2375 4.36157 13.3059L4.62496 13.4412L4.88553 13.5607L5.18837 13.6828L5.43169 13.7686C5.56564 13.8128 5.70149 13.8529 5.83857 13.8885C5.94262 13.9155 6.04767 13.9401 6.15405 13.9622C6.27993 13.9883 6.40713 14.0109 6.53544 14.0298L6.85241 14.0685L7.11934 14.0892C7.24637 14.0965 7.37436 14.1002 7.50322 14.1002C11.1483 14.1002 14.1032 11.1453 14.1032 7.50023C14.1032 7.25044 14.0893 7.00389 14.0623 6.76131L14.0255 6.48407C13.991 6.26083 13.9453 6.04129 13.8891 5.82642C13.8213 5.56709 13.7382 5.31398 13.6409 5.06881L13.5279 4.80132L13.4507 4.63542L13.3766 4.48666C13.2178 4.17773 13.0353 3.88295 12.8312 3.60423L12.6782 3.40352L12.4793 3.16432L12.3157 2.98361L12.1961 2.85951L12.0355 2.70246L11.8134 2.50184L11.4925 2.24191L11.2483 2.06498L10.9562 1.87446L10.6346 1.68894L10.3073 1.52378L10.1938 1.47176L9.95488 1.3706L9.67791 1.2669L9.42566 1.1846L9.10075 1.09489L8.83599 1.03486L8.54406 0.98184ZM10.4032 5.30023C10.4032 4.27588 10.2002 3.29829 9.83244 2.40604C11.7623 3.28995 13.1032 5.23862 13.1032 7.50023C13.1032 10.593 10.596 13.1002 7.50322 13.1002C6.63646 13.1002 5.81597 12.9036 5.08355 12.5522C6.5419 12.0941 7.81081 11.2082 8.74322 10.0416C8.87963 10.2284 9.10028 10.3497 9.34928 10.3497C9.76349 10.3497 10.0993 10.0139 10.0993 9.59971C10.0993 9.24256 9.84965 8.94373 9.51535 8.86816C9.57741 8.75165 9.63653 8.63334 9.6926 8.51332C9.88358 8.63163 10.1088 8.69993 10.35 8.69993C11.0403 8.69993 11.6 8.14028 11.6 7.44993C11.6 6.75976 11.0406 6.20024 10.3505 6.19993C10.3853 5.90487 10.4032 5.60464 10.4032 5.30023Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg></button>
</div>
<script>
(function(){
  var btns = document.querySelectorAll('.theme-switcher-btn');
  function updateActive(theme) {
    btns.forEach(function(b){
      var active = theme && b.getAttribute('data-theme-set') === theme;
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }
  var current = localStorage.getItem('zygo_theme');
  updateActive(current);
  btns.forEach(function(btn){
    btn.addEventListener('click', function(){
      var t = btn.getAttribute('data-theme-set');
      var now = localStorage.getItem('zygo_theme');
      if (now === t) {
        localStorage.removeItem('zygo_theme');
        document.documentElement.removeAttribute('data-theme');
        updateActive(null);
      } else {
        localStorage.setItem('zygo_theme', t);
        document.documentElement.setAttribute('data-theme', t);
        updateActive(t);
      }
    });
  });
})();
</script>"##;

pub fn format_theme_tokens_css(tokens: &ThemeTokens) -> String {
    let header_border = match tokens.header_border_style.as_str() {
        "none" => "none".to_string(),
        "solid" => format!("1px solid {}", tokens.color_border),
        _ => format!("3px double {}", tokens.color_border),
    };

    format!(
        "  --font-headline: {};\n  --font-body: {};\n  --color-bg: {};\n  --color-text: {};\n  --color-text-muted: {};\n  --color-accent: {};\n  --color-surface: {};\n  --color-border: {};\n  --content-max-width: {};\n  --font-size-base: {};\n  --line-height-body: {};\n  --header-layout: {};\n  --header-border-style: {};\n  --header-border: {header_border};\n  --header-title-size: {};\n  --header-nav-transform: {};\n  --header-padding: {};\n  --border-radius: {};\n  --box-shadow: {};",
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

pub fn generate_theme_root_css(
    settings: Option<&std::collections::HashMap<String, String>>,
) -> String {
    let primary_tokens = ThemeTokens::resolve_from_settings(settings);
    let dark_tokens = settings.and_then(|s| {
        let dark_id = s.get("theme_dark_id")?.trim();
        if dark_id.is_empty() {
            None
        } else {
            ThemeTokens::resolve_theme_tokens(dark_id, Some(s))
                .or_else(|| ThemeTokens::get_preset(dark_id))
        }
    });

    let primary_css = format_theme_tokens_css(&primary_tokens);
    let mut css = format!(":root, :root[data-theme=\"light\"] {{\n{}\n}}", primary_css);

    if let Some(ref dark) = dark_tokens {
        let dark_css = format_theme_tokens_css(dark);
        css.push_str(&format!("\n\n:root[data-theme=\"dark\"] {{\n{}\n}}", dark_css));
        css.push_str(&format!(
            "\n\n@media (prefers-color-scheme: dark) {{\n  :root:not([data-theme=\"light\"]) {{\n{}\n  }}\n}}",
            dark_css
        ));
    }

    css
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

pub fn civil_year_from_days(days: i64) -> i32 {
    let z = days + 719468;
    let era = (if z >= 0 { z } else { z - 146096 }) / 146097;
    let doe = (z - era * 146097) as u32;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let mut y = (yoe as i64) + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    if m <= 2 {
        y += 1;
    }
    y as i32
}

pub fn year_from_epoch_millis(millis: u64) -> i32 {
    let days = (millis / 86_400_000) as i64;
    civil_year_from_days(days)
}

pub fn get_current_year() -> i32 {
    #[cfg(target_arch = "wasm32")]
    let millis = worker::Date::now().as_millis();

    #[cfg(not(target_arch = "wasm32"))]
    let millis = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    year_from_epoch_millis(millis)
}

pub fn interpolate_footer_year(text: &str, year: i32) -> String {
    let year_str = year.to_string();
    let mut result = String::with_capacity(text.len());
    let mut rest = text;

    while let Some(start) = rest.find("{{") {
        result.push_str(&rest[..start]);
        let after_start = &rest[start + 2..];
        if let Some(end) = after_start.find("}}") {
            let tag = after_start[..end].trim();
            if tag.eq_ignore_ascii_case("year") || tag.eq_ignore_ascii_case("current_year") {
                result.push_str(&year_str);
            } else {
                result.push_str("{{");
                result.push_str(&after_start[..end]);
                result.push_str("}}");
            }
            rest = &after_start[end + 2..];
        } else {
            result.push_str("{{");
            rest = after_start;
            break;
        }
    }
    result.push_str(rest);
    result
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
            .unwrap_or("")
    };

    let theme_css = generate_theme_root_css(settings);

    let default_hash = zygo_core::models::compute_theme_styles_hash(&[include_str!("style.css")], settings);

    let styles_hash = settings
        .and_then(|s| s.get("styles_hash").map(|v| v.as_str()))
        .filter(|v| !v.trim().is_empty())
        .unwrap_or(&default_hash);

    let current_year = get_current_year();
    ctx.insert(
        "year".to_string(),
        serde_json::Value::Number(current_year.into()),
    );
    ctx.insert(
        "current_year".to_string(),
        serde_json::Value::Number(current_year.into()),
    );

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

    let site_logo_dark = settings
        .and_then(|s| s.get("site_logo_dark").map(|v| v.as_str()))
        .filter(|v| !v.trim().is_empty());
    if let Some(dark_logo) = site_logo_dark {
        ctx.insert(
            "site_logo_dark".to_string(),
            serde_json::Value::String(dark_logo.to_string()),
        );
    }

    let dark_id_opt = settings
        .and_then(|s| s.get("theme_dark_id").map(|v| v.trim()))
        .filter(|v| !v.is_empty());

    if let Some(dark_id) = dark_id_opt {
        ctx.insert(
            "theme_dark_id".to_string(),
            serde_json::Value::String(dark_id.to_string()),
        );
        ctx.insert(
            "theme_fouc_script".to_string(),
            serde_json::Value::String(ZERO_FOUC_SCRIPT.to_string()),
        );
        ctx.insert(
            "theme_switcher_html".to_string(),
            serde_json::Value::String(THEME_SWITCHER_HTML.to_string()),
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
        let interpolated = interpolate_footer_year(ft, current_year);
        ctx.insert(
            "footer_text".to_string(),
            serde_json::Value::String(interpolated),
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
        "current_path".to_string(),
        serde_json::Value::String(doc.path()),
    );
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

    let favicon = ctx
        .get("site_favicon")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let rendered = tmpl
        .render(ctx)
        .map_err(|e| worker::Error::RustError(e.to_string()))?;

    if name == "sitemap" || name == "rss" {
        return Ok(rendered);
    }

    Ok(inject_favicon(&rendered, favicon.as_deref()))
}

pub fn inject_favicon(html: &str, favicon: Option<&str>) -> String {
    let Some(fav) = favicon.map(|s| s.trim()).filter(|s| !s.is_empty()) else {
        return html.to_string();
    };

    let normalized = if fav.starts_with("http://") || fav.starts_with("https://") || fav.starts_with('/') {
        fav.to_string()
    } else {
        format!("/{}", fav)
    };

    let new_tag = format!("<link rel=\"icon\" href=\"{}\">", normalized);

    // If an existing favicon link exists, replace it
    if let Some((start, end)) = find_favicon_link(html) {
        let mut result = String::with_capacity(html.len() + new_tag.len());
        result.push_str(&html[..start]);
        result.push_str(&new_tag);
        result.push_str(&html[end..]);
        return result;
    }

    // Otherwise, inject before </head> (case-insensitive)
    let lower = html.to_ascii_lowercase();
    if let Some(pos) = lower.find("</head>") {
        let mut result = String::with_capacity(html.len() + new_tag.len() + 10);
        result.push_str(&html[..pos]);
        result.push_str("    ");
        result.push_str(&new_tag);
        result.push('\n');
        result.push_str(&html[pos..]);
        return result;
    }

    // Fallback: inject before <body if </head> is absent
    if let Some(pos) = lower.find("<body") {
        let mut result = String::with_capacity(html.len() + new_tag.len() + 10);
        result.push_str(&html[..pos]);
        result.push_str(&new_tag);
        result.push('\n');
        result.push_str(&html[pos..]);
        return result;
    }

    // Last resort: prepend
    format!("{}\n{}", new_tag, html)
}

fn find_favicon_link(html: &str) -> Option<(usize, usize)> {
    let lower = html.to_ascii_lowercase();
    let mut search_from = 0;
    while let Some(link_pos) = lower[search_from..].find("<link") {
        let actual_start = search_from + link_pos;
        if let Some(end_pos) = lower[actual_start..].find('>') {
            let actual_end = actual_start + end_pos + 1;
            let tag_content = &lower[actual_start..actual_end];
            if tag_content.contains("rel=\"icon\"")
                || tag_content.contains("rel='icon'")
                || tag_content.contains("rel=\"shortcut icon\"")
                || tag_content.contains("rel='shortcut icon'")
            {
                return Some((actual_start, actual_end));
            }
            search_from = actual_end;
        } else {
            break;
        }
    }
    None
}

fn page_title(
    heading: Option<&str>,
    canonical_path: Option<&str>,
    pagination: Option<&Pagination>,
    site_title: &str,
) -> String {
    let base_title = if let Some(h) = heading {
        h.to_string()
    } else if matches!(canonical_path, Some("/posts") | Some("/post")) {
        "Blog".to_string()
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
        "current_path".to_string(),
        serde_json::Value::String(canonical_path.unwrap_or("/posts").to_string()),
    );
    ctx.insert(
        "page_title".to_string(),
        serde_json::Value::String(page_title(
            heading,
            canonical_path,
            pagination.as_ref(),
            site_title,
        )),
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
        "current_path".to_string(),
        serde_json::Value::String(post.path()),
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
        "current_path".to_string(),
        serde_json::Value::String(page.path()),
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
        "current_path".to_string(),
        serde_json::Value::String("/search".to_string()),
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
        assert!(!index_html.contains("site-tagline"));

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
        assert!(html.contains("--font-size-base: 16px;"));
        assert!(html.contains("--line-height-body: 1.5;"));
        assert!(html.contains("--border-radius: 2px;"));
        assert!(html.contains("--box-shadow: 4px 6px 0 #0f172a;"));
        assert!(!html.contains("site-tagline"));
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
    fn test_render_all_15_section_templates_under_shipped_themes() {
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
            SectionTemplate {
                id: "pricing".to_string(),
                name: "Pricing".to_string(),
                template_html: Some(r#"<section class="section-pricing"><h2>{{ headline }}</h2>{% for p in plans %}<div>{{ p.name }} - {{ p.price }}</div>{% endfor %}</section>"#.to_string()),
                template_css: Some(".section-pricing { border-radius: var(--border-radius); }".to_string()),
                ..Default::default()
            },
            SectionTemplate {
                id: "stats".to_string(),
                name: "Stats".to_string(),
                template_html: Some(r#"<section class="section-stats"><h2>{{ headline }}</h2>{% for s in stats %}<span>{{ s.value }} - {{ s.label }}</span>{% endfor %}</section>"#.to_string()),
                template_css: Some(".section-stats { background: var(--color-surface); }".to_string()),
                ..Default::default()
            },
            SectionTemplate {
                id: "logo-cloud".to_string(),
                name: "Logo Cloud".to_string(),
                template_html: Some(r#"<section class="section-logo-cloud"><h2>{{ title }}</h2>{% for l in logos %}<img src="{{ l.image }}" alt="{{ l.name }}">{% endfor %}</section>"#.to_string()),
                template_css: Some(".section-logo-cloud { border-color: var(--color-border); }".to_string()),
                ..Default::default()
            },
            SectionTemplate {
                id: "team".to_string(),
                name: "Team".to_string(),
                template_html: Some(r#"<section class="section-team"><h2>{{ headline }}</h2>{% for m in members %}<h3>{{ m.name }} - {{ m.role }}</h3>{% endfor %}</section>"#.to_string()),
                template_css: Some(".section-team { border-radius: var(--border-radius); }".to_string()),
                ..Default::default()
            },
            SectionTemplate {
                id: "steps".to_string(),
                name: "Steps".to_string(),
                template_html: Some(r#"<section class="section-steps"><h2>{{ headline }}</h2>{% for st in steps %}<div>{{ st.step_number }}: {{ st.title }}</div>{% endfor %}</section>"#.to_string()),
                template_css: Some(".section-steps { background: var(--color-surface); }".to_string()),
                ..Default::default()
            },
            SectionTemplate {
                id: "contact-form".to_string(),
                name: "Contact Form".to_string(),
                template_html: Some(r#"<section class="section-contact-form"><h2>{{ heading }}</h2><form action="/forms/submit" method="POST"><button type="submit">{{ submit_label }}</button></form></section>"#.to_string()),
                template_css: Some(".section-contact-form { border-radius: var(--border-radius); }".to_string()),
                ..Default::default()
            },
            SectionTemplate {
                id: "newsletter".to_string(),
                name: "Newsletter Signup".to_string(),
                template_html: Some(r#"<section class="section-newsletter"><h2>{{ heading }}</h2><form action="/forms/submit" method="POST"><button type="submit">{{ submit_label }}</button></form></section>"#.to_string()),
                template_css: Some(".section-newsletter { background: var(--color-surface); }".to_string()),
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
            { "type_id": "pricing", "data": { "headline": "Pricing Title", "plans": [{ "name": "Basic", "price": "$10" }] } },
            { "type_id": "stats", "data": { "headline": "Stats Title", "stats": [{ "value": "100%", "label": "Reliability" }] } },
            { "type_id": "logo-cloud", "data": { "title": "Partners", "logos": [{ "name": "Acme", "image": "/logo.png" }] } },
            { "type_id": "team", "data": { "headline": "Team Title", "members": [{ "name": "Bob", "role": "Engineer" }] } },
            { "type_id": "steps", "data": { "headline": "Steps Title", "steps": [{ "step_number": "01", "title": "Step One" }] } },
            { "type_id": "contact-form", "data": { "heading": "Get in Touch", "submit_label": "Send Message" } },
            { "type_id": "newsletter", "data": { "heading": "Subscribe Today", "submit_label": "Join" } },
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
        assert!(modern_html.contains("Pricing Title"));
        assert!(modern_html.contains("Basic"));
        assert!(modern_html.contains("$10"));
        assert!(modern_html.contains("Stats Title"));
        assert!(modern_html.contains("100%"));
        assert!(modern_html.contains("Reliability"));
        assert!(modern_html.contains("Partners"));
        assert!(modern_html.contains("Acme"));
        assert!(modern_html.contains("Team Title"));
        assert!(modern_html.contains("Bob"));
        assert!(modern_html.contains("Engineer"));
        assert!(modern_html.contains("Steps Title"));
        assert!(modern_html.contains("01"));
        assert!(modern_html.contains("Step One"));
        assert!(modern_html.contains("Get in Touch"));
        assert!(modern_html.contains("Send Message"));
        assert!(modern_html.contains("Subscribe Today"));
        assert!(modern_html.contains("Join"));
        assert!(modern_html.contains(r#"action="/forms/submit""#));

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
        assert!(bento_html.contains("Pricing Title"));
        assert!(bento_html.contains("Basic"));
        assert!(bento_html.contains("$10"));
        assert!(bento_html.contains("Stats Title"));
        assert!(bento_html.contains("100%"));
        assert!(bento_html.contains("Reliability"));
        assert!(bento_html.contains("Partners"));
        assert!(bento_html.contains("Acme"));
        assert!(bento_html.contains("Team Title"));
        assert!(bento_html.contains("Bob"));
        assert!(bento_html.contains("Engineer"));
        assert!(bento_html.contains("Steps Title"));
        assert!(bento_html.contains("01"));
        assert!(bento_html.contains("Step One"));
        assert!(bento_html.contains("Get in Touch"));
        assert!(bento_html.contains("Send Message"));
        assert!(bento_html.contains("Subscribe Today"));
        assert!(bento_html.contains("Join"));
        assert!(bento_html.contains(r#"action="/forms/submit""#));

        // 3. Render under Bento-Brutalism (Dark)
        let mut dark_settings = std::collections::HashMap::new();
        dark_settings.insert("theme_active_name".to_string(), "Bento-Brutalism (Dark)".to_string());
        let dark_html = render_page(
            &templates,
            &page,
            "https://example.com",
            &[],
            &[],
            &[],
            &[],
            Some(&dark_settings),
            None,
        ).unwrap();

        assert!(dark_html.contains("header-split"));
        assert!(dark_html.contains("#38bdf8")); // Sky cyan accent
        assert!(dark_html.contains("#0b0f19")); // Deep slate midnight canvas
        assert!(dark_html.contains("#334155")); // Deep slate border
        assert!(dark_html.contains("Hero Title"));
        assert!(dark_html.contains("Video Title"));
        assert!(dark_html.contains("Pricing Title"));
        assert!(dark_html.contains("Subscribe Today"));
    }

    #[test]
    fn test_render_contact_and_newsletter_form_templates() {
        let contact_tmpl = SectionTemplate {
            id: "contact-form".to_string(),
            name: "Contact Form".to_string(),
            template_html: Some(r#"<section class="section-contact-form">
  <div class="contact-form-container">
    <div class="contact-form-card">
      <div class="contact-form-header">
        {% if heading %}<h2 class="contact-form-headline">{{ heading }}</h2>{% endif %}
        {% if subheading %}<p class="contact-form-subheadline">{{ subheading }}</p>{% endif %}
      </div>
      <form class="contact-form" action="/forms/submit" method="POST">
        <input type="hidden" name="form_name" value="contact">
        <div class="form-hp" aria-hidden="true" style="position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; overflow: hidden;">
          <input type="text" name="website" tabindex="-1" autocomplete="new-password">
        </div>
        <div class="contact-form-group">
          <label for="contact-sender-name" class="contact-form-label">Name</label>
          <input type="text" id="contact-sender-name" name="sender_name" class="contact-form-input" placeholder="Your name">
        </div>
        <div class="contact-form-group">
          <label for="contact-sender-email" class="contact-form-label">Email <span class="required-mark">*</span></label>
          <input type="email" id="contact-sender-email" name="sender_email" class="contact-form-input" required placeholder="your.email@example.com">
        </div>
        {% if show_phone %}
        <div class="contact-form-group">
          <label for="contact-phone" class="contact-form-label">Phone</label>
          <input type="tel" id="contact-phone" name="phone" class="contact-form-input" placeholder="+1 (555) 000-0000">
        </div>
        {% endif %}
        {% if show_subject %}
        <div class="contact-form-group">
          <label for="contact-subject" class="contact-form-label">Subject</label>
          <input type="text" id="contact-subject" name="subject" class="contact-form-input" placeholder="How can we help?">
        </div>
        {% endif %}
        <div class="contact-form-group">
          <label for="contact-message" class="contact-form-label">Message <span class="required-mark">*</span></label>
          <textarea id="contact-message" name="message" class="contact-form-textarea" rows="5" required placeholder="Write your message here..."></textarea>
        </div>
        <div class="contact-form-actions">
          <button type="submit" class="contact-form-btn">{{ submit_label }}</button>
        </div>
        {% if success_message %}
        <div class="contact-form-status" style="display: none;" role="status">
          <p>{{ success_message }}</p>
        </div>
        {% endif %}
      </form>
    </div>
  </div>
</section>"#.to_string()),
            template_css: Some(".section-contact-form { padding: 5rem 2rem; }".to_string()),
            ..Default::default()
        };

        let newsletter_tmpl = SectionTemplate {
            id: "newsletter".to_string(),
            name: "Newsletter Signup".to_string(),
            template_html: Some(r#"<section class="section-newsletter">
  <div class="newsletter-container">
    <div class="newsletter-header">
      {% if heading %}<h2 class="newsletter-headline">{{ heading }}</h2>{% endif %}
      {% if subheading %}<p class="newsletter-subheadline">{{ subheading }}</p>{% endif %}
    </div>
    <form class="newsletter-form" action="/forms/submit" method="POST">
      <input type="hidden" name="form_name" value="newsletter">
      <div class="form-hp" aria-hidden="true" style="position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; overflow: hidden;">
        <input type="text" name="website" tabindex="-1" autocomplete="new-password">
      </div>
      <div class="newsletter-input-group">
        <label for="newsletter-email" class="newsletter-sr-only">Email address</label>
        <input type="email" id="newsletter-email" name="sender_email" class="newsletter-input" required placeholder="Enter your email address">
        <button type="submit" class="newsletter-btn">{{ submit_label }}</button>
      </div>
      {% if success_message %}
      <div class="newsletter-status" style="display: none;" role="status">
        <p>{{ success_message }}</p>
      </div>
      {% endif %}
    </form>
  </div>
</section>"#.to_string()),
            template_css: Some(".section-newsletter { padding: 4rem 2rem; }".to_string()),
            ..Default::default()
        };

        let templates = vec![contact_tmpl, newsletter_tmpl];

        // 1. Render contact-form with show_phone: true and show_subject: true
        let mut page_full = dummy_page();
        page_full.body_json = serde_json::json!([
            {
                "type_id": "contact-form",
                "data": {
                    "heading": "Get in Touch",
                    "subheading": "Send us your project inquiry",
                    "submit_label": "Submit Inquiry",
                    "success_message": "Message received!",
                    "show_subject": true,
                    "show_phone": true
                }
            },
            {
                "type_id": "newsletter",
                "data": {
                    "heading": "Weekly Digest",
                    "subheading": "No spam, unsubscribe anytime",
                    "submit_label": "Subscribe Now",
                    "success_message": "Thanks for subscribing!"
                }
            }
        ]).to_string();

        let html = render_page(
            &templates,
            &page_full,
            "https://example.com",
            &[],
            &[],
            &[],
            &[],
            None,
            None,
        ).unwrap();

        // Contact form assertions
        assert!(html.contains(r#"action="/forms/submit""#));
        assert!(html.contains(r#"method="POST""#));
        assert!(html.contains(r#"name="website""#));
        assert!(html.contains(r#"tabindex="-1""#));
        assert!(html.contains(r#"autocomplete="new-password""#));
        assert!(html.contains("Get in Touch"));
        assert!(html.contains("Send us your project inquiry"));
        assert!(html.contains(r#"id="contact-sender-name""#));
        assert!(html.contains(r#"id="contact-sender-email""#));
        assert!(html.contains(r#"id="contact-phone""#));
        assert!(html.contains(r#"id="contact-subject""#));
        assert!(html.contains(r#"id="contact-message""#));
        assert!(html.contains("Submit Inquiry"));
        assert!(html.contains("Message received!"));

        // Newsletter assertions
        assert!(html.contains(r#"value="newsletter""#));
        assert!(html.contains("Weekly Digest"));
        assert!(html.contains("No spam, unsubscribe anytime"));
        assert!(html.contains(r#"id="newsletter-email""#));
        assert!(html.contains("Subscribe Now"));
        assert!(html.contains("Thanks for subscribing!"));

        // 2. Render contact-form with show_phone: false and show_subject: false
        let mut page_minimal = dummy_page();
        page_minimal.body_json = serde_json::json!([
            {
                "type_id": "contact-form",
                "data": {
                    "heading": "Contact Us",
                    "submit_label": "Send",
                    "show_subject": false,
                    "show_phone": false
                }
            }
        ]).to_string();

        let html_min = render_page(
            &templates,
            &page_minimal,
            "https://example.com",
            &[],
            &[],
            &[],
            &[],
            None,
            None,
        ).unwrap();

        assert!(html_min.contains("Contact Us"));
        assert!(!html_min.contains(r#"id="contact-phone""#));
        assert!(!html_min.contains(r#"id="contact-subject""#));
        assert!(html_min.contains(r#"id="contact-sender-email""#));
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
        assert!(html.contains(r#"<img src="https://example.com/logo.png" alt="My Tech Blog" class="site-logo site-logo-light">"#));

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

    #[test]
    fn test_footer_year_interpolation() {
        assert_eq!(civil_year_from_days(0), 1970);
        assert_eq!(civil_year_from_days(365), 1971);
        assert_eq!(civil_year_from_days(10957), 2000);
        assert_eq!(civil_year_from_days(20454), 2026);

        let current_year = get_current_year();
        assert!(current_year >= 2026);

        // Test interpolate_footer_year variations
        assert_eq!(
            interpolate_footer_year("Copyright {{ year }} Zygo CMS", 2026),
            "Copyright 2026 Zygo CMS"
        );
        assert_eq!(
            interpolate_footer_year("© {{year}} - All rights reserved", 2026),
            "© 2026 - All rights reserved"
        );
        assert_eq!(
            interpolate_footer_year("© {{ current_year }}", 2026),
            "© 2026"
        );
        assert_eq!(
            interpolate_footer_year("© {{current_year}}", 2026),
            "© 2026"
        );
        assert_eq!(
            interpolate_footer_year("© {{ Year }} {{YEAR}}", 2026),
            "© 2026 2026"
        );
        assert_eq!(
            interpolate_footer_year("Static footer text without year", 2026),
            "Static footer text without year"
        );
        // Preserves unrelated tags
        assert_eq!(
            interpolate_footer_year("{{ other_tag }} © {{ year }}", 2026),
            "{{ other_tag }} © 2026"
        );

        // Test full rendering through render_page
        let mut settings = std::collections::HashMap::new();
        settings.insert(
            "footer_text".to_string(),
            "Copyright {{ year }} Zygo CMS".to_string(),
        );

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

        let expected_footer = format!(r#"<div class="footer-text">Copyright {} Zygo CMS</div>"#, current_year);
        assert!(html.contains(&expected_footer));
    }

    #[test]
    fn test_layout_template_from_d1_renders_site_logo_and_footer() {
        let mut settings = std::collections::HashMap::new();
        settings.insert("site_title".to_string(), "Steph Wanicki Art".to_string());
        settings.insert("site_logo".to_string(), "https://example.com/logo.webp".to_string());
        settings.insert("footer_text".to_string(), "© {{ year }} Steph Wanicki Art".to_string());

        let default_post = zygo_core::models::layout_defaults::get_default_layout_template("post").unwrap();
        let lt = LayoutTemplate {
            id: "post".to_string(),
            name: default_post.name.unwrap_or_default(),
            description: default_post.description,
            template_html: default_post.template_html.unwrap_or_default(),
            template_css: default_post.template_css.unwrap_or_default(),
            is_locked: true,
            created_at: String::new(),
            updated_at: String::new(),
        };
        let lts = vec![lt];

        let mut post = dummy_page();
        post.r#type = "post".to_string();

        let html = render_post(
            &[],
            &post,
            "https://example.com",
            &[],
            &[],
            Some(&settings),
            Some(&lts),
        ).unwrap();

        assert!(html.contains(r#"<img src="https://example.com/logo.webp" alt="Steph Wanicki Art" class="site-logo site-logo-light">"#));
        let expected_footer = format!(r#"<div class="footer-text">© {} Steph Wanicki Art</div>"#, get_current_year());
        assert!(html.contains(&expected_footer));
    }

    #[test]
    fn test_site_logo_dark_rendering() {
        let mut settings = std::collections::HashMap::new();
        settings.insert("site_title".to_string(), "My Tech Blog".to_string());
        settings.insert("site_logo".to_string(), "https://example.com/logo.png".to_string());
        settings.insert("site_logo_dark".to_string(), "https://example.com/logo-dark.png".to_string());

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

        assert!(html.contains(r#"<img src="https://example.com/logo.png" alt="My Tech Blog" class="site-logo site-logo-light">"#));
        assert!(html.contains(r#"<img src="https://example.com/logo-dark.png" alt="My Tech Blog" class="site-logo site-logo-dark">"#));
    }

    #[test]
    fn test_single_theme_ssr_emission() {
        let mut settings = std::collections::HashMap::new();
        settings.insert("theme_primary_id".to_string(), "modern-editorial".to_string());

        let css = generate_theme_root_css(Some(&settings));
        assert!(css.contains(r#":root, :root[data-theme="light"] {"#));
        assert!(!css.contains(r#":root[data-theme="dark"] {"#));
        assert!(!css.contains(r#"@media (prefers-color-scheme: dark)"#));

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

        // Switcher and FOUC script should be absent when theme_dark_id is not set
        assert!(!html.contains("theme-switcher"));
        assert!(!html.contains("zygo_theme"));
    }

    #[test]
    fn test_dual_theme_ssr_emission() {
        let mut settings = std::collections::HashMap::new();
        settings.insert("theme_primary_id".to_string(), "bento-brutalism".to_string());
        settings.insert("theme_dark_id".to_string(), "bento-brutalism-dark".to_string());

        let css = generate_theme_root_css(Some(&settings));
        // Primary
        assert!(css.contains(r#":root, :root[data-theme="light"] {"#));
        assert!(css.contains("--color-bg: #f6f5f0;"));
        // Dark
        assert!(css.contains(r#":root[data-theme="dark"] {"#));
        assert!(css.contains("--color-bg: #0b0f19;"));
        // Media query
        assert!(css.contains(r#"@media (prefers-color-scheme: dark) {"#));
        assert!(css.contains(r#":root:not([data-theme="light"]) {"#));

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

        // Switcher and FOUC script must be present in footer with light and dark buttons
        assert!(html.contains(r#"<div class="theme-switcher" role="group" aria-label="Theme switcher">"#));
        assert!(html.contains(r#"data-theme-set="light""#));
        assert!(html.contains(r#"data-theme-set="dark""#));
        assert!(!html.contains(r#"data-theme-set="auto""#));
        assert!(html.contains("localStorage.getItem('zygo_theme')"));
        // Ensure switcher is located in footer rather than header
        let footer_pos = html.find("<footer>").expect("footer should be present");
        let switcher_pos = html.find(r#"class="theme-switcher""#).expect("theme-switcher should be present");
        assert!(switcher_pos > footer_pos, "theme-switcher must be inside footer");
    }

    #[test]
    fn test_explicit_site_tagline_rendering() {
        let mut settings = std::collections::HashMap::new();
        settings.insert("site_tagline".to_string(), "Custom Publication Tagline".to_string());

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

        assert!(html.contains(r#"<div class="site-tagline">Custom Publication Tagline</div>"#));
    }

    #[test]
    fn test_nav_aria_current_page_and_blog_index_title() {
        let mut settings = std::collections::HashMap::new();
        settings.insert("site_title".to_string(), "Zygodactyl Studios".to_string());

        let header_menu = vec![
            MenuItem {
                title: "Home".to_string(),
                url: "/".to_string(),
                target: "_self".to_string(),
                children: vec![],
            },
            MenuItem {
                title: "About".to_string(),
                url: "/about".to_string(),
                target: "_self".to_string(),
                children: vec![],
            },
            MenuItem {
                title: "Blog".to_string(),
                url: "/posts".to_string(),
                target: "_self".to_string(),
                children: vec![],
            },
        ];

        let page = dummy_page(); // path is "/about"
        let page_html = render_page(
            &[],
            &page,
            "https://zygodactylstudios.com",
            &[],
            &[],
            &header_menu,
            &[],
            Some(&settings),
            None,
        )
        .unwrap();

        assert!(page_html.contains(r#"<a href="/about" aria-current="page">About</a>"#));
        assert!(page_html.contains(r#"<a href="/">Home</a>"#));

        let index_html = render_index(
            &[],
            &[dummy_post()],
            "https://zygodactylstudios.com",
            None,
            &header_menu,
            &[],
            Some(&settings),
            None,
        )
        .unwrap();

        assert!(index_html.contains("<title>Blog \u{2014} Zygodactyl Studios</title>"));
        assert!(index_html.contains(r#"<a href="/posts" aria-current="page">Blog</a>"#));
    }

    #[test]
    fn test_inject_favicon_scenarios() {
        // 1. Injects into clean HTML before </head>
        let html1 = "<!DOCTYPE html><html><head><title>Test</title></head><body>Hello</body></html>";
        let out1 = inject_favicon(html1, Some("/favicon.ico"));
        assert!(out1.contains(r#"<link rel="icon" href="/favicon.ico">"#));
        assert!(out1.contains("</head>"));

        // 2. Normalizes relative path without leading slash
        let out2 = inject_favicon(html1, Some("media/logo.png"));
        assert!(out2.contains(r#"<link rel="icon" href="/media/logo.png">"#));

        // 3. Absolute URL preserved
        let out3 = inject_favicon(html1, Some("https://cdn.example.com/icon.svg"));
        assert!(out3.contains(r#"<link rel="icon" href="https://cdn.example.com/icon.svg">"#));

        // 4. Replaces existing favicon link
        let html_with_fav = "<!DOCTYPE html><html><head><link rel=\"icon\" href=\"/old.ico\"></head><body></body></html>";
        let out4 = inject_favicon(html_with_fav, Some("/new.ico"));
        assert!(out4.contains(r#"<link rel="icon" href="/new.ico">"#));
        assert!(!out4.contains("/old.ico"));

        // 5. Fallback when </head> is missing
        let html_no_head = "<!DOCTYPE html><html><body>Hello</body></html>";
        let out5 = inject_favicon(html_no_head, Some("/fav.ico"));
        assert!(out5.contains(r#"<link rel="icon" href="/fav.ico">"#));

        // 6. Untouched if favicon is None or empty
        assert_eq!(inject_favicon(html1, None), html1);
        assert_eq!(inject_favicon(html1, Some("   ")), html1);
    }

    #[test]
    fn test_favicon_injected_into_custom_db_layout_without_favicon() {
        // Layout template from DB that does NOT have any favicon markup in its HTML
        let db_template = LayoutTemplate {
            id: "page".to_string(),
            name: "Default Page".to_string(),
            description: Some("Custom DB layout".to_string()),
            template_html: "<!DOCTYPE html><html><head><title>{{ page.title }}</title></head><body><h1>{{ page.title }}</h1></body></html>".to_string(),
            template_css: "".to_string(),
            is_locked: false,
            created_at: String::new(),
            updated_at: String::new(),
        };

        let mut settings = std::collections::HashMap::new();
        settings.insert("site_favicon".to_string(), "/media/custom-fav.png".to_string());

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
            Some(&[db_template]),
        )
        .unwrap();

        assert!(html.contains(r#"<link rel="icon" href="/media/custom-fav.png">"#));
    }
}

