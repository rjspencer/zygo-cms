use super::layout_template::LayoutTemplatePayload;

pub const DEFAULT_POST_HTML: &str = r##"<!DOCTYPE html>
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
        {% if theme_switcher_html %}
        {{ theme_switcher_html|safe }}
        {% endif %}
    </header>
    <main id="main-content">
        {% if is_preview %}
        <div class="preview-banner" role="status">Preview Mode</div>
        {% endif %}
        <article>
            {% if post.cover_image %}
            <img class="cover-image" src="{{ post.cover_image|safe }}" alt="{{ post.title }}" fetchpriority="high" decoding="async" srcset="{{ post.cover_image|media_srcset|safe }}" sizes="(max-width: 1024px) 100vw, 800px">
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
            <a href="{{ item.url|safe }}"{% if current_path and item.url == current_path %} aria-current="page"{% endif %}>{{ item.title }}</a>
            {% endfor %}
        </nav>
        {% if footer_text %}
        <div class="footer-text">{{ footer_text }}</div>
        {% endif %}
    </footer>
</body>
</html>"##;

pub const DEFAULT_POST_CSS: &str = r##"/* Post Template & Posts List Styles */
.posts-list,
.post-list {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  margin-top: 2rem;
}

.post-summary {
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.post-summary:last-child {
  border-bottom: none;
}

.post-summary h2 {
  font-family: var(--font-headline);
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.post-summary h2 a {
  text-decoration: none;
  color: var(--color-text);
  transition: color 0.15s ease;
}

.post-summary h2 a:hover {
  color: var(--color-accent);
}

.post-summary .post-meta {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 0.75rem;
}

.post-summary p {
  color: var(--color-text-muted);
  line-height: 1.6;
}

.taxonomy-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.taxonomy-header a {
  display: inline-block;
  margin-top: 0.5rem;
  color: var(--color-accent);
  text-decoration: none;
  font-size: 0.875rem;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.875rem;
}

.pagination a {
  color: var(--color-accent);
  text-decoration: none;
  font-weight: 500;
}
"##;

pub const DEFAULT_PAGE_HTML: &str = r##"<!DOCTYPE html>
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
        {% if theme_switcher_html %}
        {{ theme_switcher_html|safe }}
        {% endif %}
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
            <img class="cover-image" src="{{ page.cover_image|safe }}" alt="{{ page.title }}" fetchpriority="high" decoding="async" srcset="{{ page.cover_image|media_srcset|safe }}" sizes="(max-width: 1024px) 100vw, 800px">
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
            <a href="{{ item.url|safe }}"{% if current_path and item.url == current_path %} aria-current="page"{% endif %}>{{ item.title }}</a>
            {% endfor %}
        </nav>
        {% if footer_text %}
        <div class="footer-text">{{ footer_text }}</div>
        {% endif %}
    </footer>
</body>
</html>"##;

pub const DEFAULT_PAGE_CSS: &str = "";

pub const DEFAULT_DOC_HTML: &str = r##"<!DOCTYPE html>
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
        {% if theme_switcher_html %}
        {{ theme_switcher_html|safe }}
        {% endif %}
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
            <a href="{{ item.url|safe }}"{% if current_path and item.url == current_path %} aria-current="page"{% endif %}>{{ item.title }}</a>
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
            
            headings.forEach((heading, idx) => {
                if (!heading.id) {
                    heading.id = 'heading-' + idx;
                }
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = '#' + heading.id;
                a.textContent = heading.textContent;
                if (heading.tagName === 'H3') {
                    li.classList.add('toc-h3');
                }
                
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

pub const DEFAULT_DOC_CSS: &str = r##"/* Docs Layout & Readability */
body:has(.docs-layout),
body.docs-page {
    max-width: 100%;
    margin: 0;
    padding: 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}
body:has(.docs-layout) header,
body.docs-page header {
    max-width: var(--docs-max-width, 1440px);
    margin: 0 auto;
    padding: var(--header-padding, 1.75rem 2rem 1.25rem 2rem);
    width: 100%;
    box-sizing: border-box;
}
body:has(.docs-layout) footer,
body.docs-page footer {
    max-width: var(--docs-max-width, 1440px);
    margin: auto auto 0 auto;
    padding: 2rem;
    width: 100%;
    box-sizing: border-box;
    border-top: 1px solid var(--color-border, #e7e5e4);
}
body:has(.docs-layout) footer nav,
body.docs-page footer nav {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
}
body:has(.docs-layout) footer nav a,
body.docs-page footer nav a {
    font-family: var(--font-body, system-ui, sans-serif);
    font-size: 0.825rem;
    font-weight: 600;
    text-transform: var(--header-nav-transform, uppercase);
    letter-spacing: 0.08em;
    color: var(--color-text-muted, #78716c);
    text-decoration: none;
    transition: color 0.15s ease;
}
body:has(.docs-layout) footer nav a:hover,
body.docs-page footer nav a:hover {
    color: var(--color-accent, #991b1b);
}
.docs-layout {
    display: flex;
    gap: 3rem;
    max-width: var(--docs-max-width, 1440px);
    margin: 0 auto;
    padding: 2rem;
    width: 100%;
    box-sizing: border-box;
    flex: 1;
}
.docs-sidebar {
    width: 260px;
    flex-shrink: 0;
    position: sticky;
    top: 2rem;
    align-self: flex-start;
    max-height: calc(100vh - 4rem);
    overflow-y: auto;
    padding: 1.25rem;
    background: color-mix(in srgb, var(--color-surface, #ffffff) 88%, transparent);
    border: 1px solid var(--color-border, #e7e5e4);
    border-radius: var(--border-radius, 8px);
    box-shadow: var(--box-shadow, 3px 3px 0px color-mix(in srgb, var(--color-border, #e7e5e4) 18%, transparent));
    scrollbar-width: thin;
}
.docs-search {
    margin-bottom: 1.25rem;
}
.docs-search input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    border: 1px solid var(--color-border, #e7e5e4);
    border-radius: var(--border-radius, 6px);
    background: var(--color-surface, #ffffff);
    color: var(--color-text, #1c1917);
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s ease;
}
.docs-search input:focus {
    border-color: var(--color-accent, #991b1b);
}
.docs-nav ul {
    list-style: none;
    margin: 0;
    padding: 0;
}
.docs-nav > ul > li {
    margin-bottom: 0.5rem;
}
.docs-nav a {
    display: block;
    padding: 0.4rem 0.6rem;
    font-size: 0.9rem;
    color: var(--color-text, #1c1917);
    text-decoration: none;
    border-radius: 4px;
    transition: all 0.15s ease;
    line-height: 1.35;
}
.docs-nav a:hover {
    background: color-mix(in srgb, var(--color-accent, #991b1b) 8%, transparent);
    color: var(--color-accent, #991b1b);
}
.docs-nav a.active {
    font-weight: 600;
    color: var(--color-accent, #991b1b);
    background: color-mix(in srgb, var(--color-accent, #991b1b) 12%, transparent);
    border-left: 3px solid var(--color-accent, #991b1b);
}
.docs-nav .docs-sub-nav {
    padding-left: 0.85rem;
    margin-top: 0.25rem;
    margin-bottom: 0.35rem;
    border-left: 1px solid var(--color-border, #e7e5e4);
}
.docs-nav .docs-sub-nav a {
    font-size: 0.825rem;
    padding: 0.3rem 0.5rem;
    color: var(--color-text-muted, #78716c);
}
.docs-nav .docs-sub-nav a:hover {
    color: var(--color-accent, #991b1b);
}
.docs-main {
    flex: 1;
    min-width: 0;
    max-width: 820px;
}
.docs-main article h1 {
    font-family: var(--font-headline, Georgia, serif);
    font-size: 2.5rem;
    margin-top: 0;
    margin-bottom: 1.5rem;
    color: var(--color-text, #1c1917);
    line-height: 1.2;
}
.docs-content {
    line-height: 1.7;
    font-size: 1.05rem;
    color: var(--color-text, #1c1917);
}
.docs-content h2 {
    font-family: var(--font-headline, Georgia, serif);
    font-size: 1.75rem;
    margin-top: 2.5rem;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border, #e7e5e4);
    scroll-margin-top: 2rem;
}
.docs-content h3 {
    font-size: 1.35rem;
    margin-top: 2rem;
    margin-bottom: 0.75rem;
    scroll-margin-top: 2rem;
}
.docs-content p, .docs-content ul, .docs-content ol {
    margin-bottom: 1.25rem;
}
.docs-content pre {
    background: #18181b;
    color: #f4f4f5;
    padding: 1.25rem;
    border-radius: var(--border-radius, 8px);
    box-shadow: var(--box-shadow, 0 4px 12px rgba(0, 0, 0, 0.05));
    overflow-x: auto;
    font-size: 0.9rem;
    margin: 1.5rem 0;
}
.docs-content code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.875em;
    background: color-mix(in srgb, var(--color-border, #e7e5e4) 40%, transparent);
    padding: 0.15em 0.35em;
    border-radius: var(--border-radius, 4px);
}
.docs-content pre code {
    background: transparent;
    padding: 0;
    color: inherit;
}
.docs-footer-nav {
    display: flex;
    justify-content: space-between;
    margin-top: 4rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-border, #e7e5e4);
}
.docs-footer-nav a {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-accent, #991b1b);
    text-decoration: none;
    font-weight: 500;
}
.docs-footer-nav a:hover {
    text-decoration: underline;
}
.docs-toc {
    width: 200px;
    flex-shrink: 0;
    position: sticky;
    top: 2rem;
    align-self: flex-start;
    max-height: calc(100vh - 4rem);
    overflow-y: auto;
}
.docs-toc h3 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted, #78716c);
    margin-top: 0;
    margin-bottom: 0.75rem;
}
.docs-toc ul {
    list-style: none;
    margin: 0;
    padding: 0;
    border-left: 1px solid var(--color-border, #e7e5e4);
}
.docs-toc li {
    margin: 0;
}
.docs-toc a {
    display: block;
    padding: 0.3rem 0 0.3rem 0.75rem;
    font-size: 0.825rem;
    color: var(--color-text-muted, #78716c);
    text-decoration: none;
    line-height: 1.3;
    transition: color 0.15s ease;
}
.docs-toc a:hover {
    color: var(--color-accent, #991b1b);
}
.docs-toc a.active {
    color: var(--color-accent, #991b1b);
    font-weight: 600;
    border-left: 2px solid var(--color-accent, #991b1b);
    margin-left: -1px;
}
.docs-toc .toc-h3 a {
    padding-left: 1.25rem;
}
@media (max-width: 1024px) {
    .docs-toc {
        display: none;
    }
}
@media (max-width: 768px) {
    .docs-layout {
        flex-direction: column;
        padding: 1rem;
        gap: 1.5rem;
    }
    .docs-sidebar {
        width: 100%;
        position: static;
        max-height: none;
    }
    .docs-main {
        max-width: 100%;
    }
    .docs-main article h1 {
        font-size: 2rem;
    }
    .docs-footer-nav {
        flex-direction: column;
        gap: 0.75rem;
    }
    .docs-footer-nav a {
        justify-content: center;
    }
}
"##;

pub fn get_default_layout_template(id: &str) -> Option<LayoutTemplatePayload> {
    match id {
        "post" => Some(LayoutTemplatePayload {
            name: Some("Post Template".to_string()),
            description: Some(
                "Layout and styles for single blog post articles and the /posts archive page."
                    .to_string(),
            ),
            template_html: Some(DEFAULT_POST_HTML.to_string()),
            template_css: Some(DEFAULT_POST_CSS.to_string()),
            is_locked: Some(false),
        }),
        "doc" => Some(LayoutTemplatePayload {
            name: Some("Documentation Layout".to_string()),
            description: Some(
                "Three-column technical documentation layout with sidebar tree and table of contents."
                    .to_string(),
            ),
            template_html: Some(DEFAULT_DOC_HTML.to_string()),
            template_css: Some(DEFAULT_DOC_CSS.to_string()),
            is_locked: Some(false),
        }),
        "page" => Some(LayoutTemplatePayload {
            name: Some("Page Template".to_string()),
            description: Some(
                "Default modular section-based page layout.".to_string(),
            ),
            template_html: Some(DEFAULT_PAGE_HTML.to_string()),
            template_css: Some(DEFAULT_PAGE_CSS.to_string()),
            is_locked: Some(false),
        }),
        _ => None,
    }
}
