-- Migration: 0004_layout_templates.sql
-- Description: Introduces layout_templates and layout_template_revisions for editable public layouts and styles.

CREATE TABLE IF NOT EXISTS layout_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    template_html TEXT NOT NULL,
    template_css TEXT NOT NULL DEFAULT '',
    is_locked INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS layout_template_revisions (
    id TEXT PRIMARY KEY,
    layout_template_id TEXT NOT NULL,
    template_html TEXT NOT NULL,
    template_css TEXT NOT NULL DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(layout_template_id) REFERENCES layout_templates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_layout_template_revisions_id ON layout_template_revisions(layout_template_id);

-- 1. Seed Post Template
INSERT INTO layout_templates (id, name, description, template_html, template_css, is_locked) VALUES (
    'post',
    'Post Template',
    'Layout and styles for single blog post articles and the /posts archive page.',
    '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ post.title }} &mdash; {{ site_title }}</title>
    <meta name="description" content="{{ post.meta_description }}">
    <link rel="canonical" href="{{ post.canonical|safe }}">
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
            <a href="/" class="site-title">{{ site_title }}</a>
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
            <a href="{{ item.url|safe }}">{{ item.title }}</a>
            {% endfor %}
        </nav>
    </footer>
</body>
</html>',
    '/* Post Template & Posts List Styles */
.posts-list,
.post-list {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.post-summary,
.post-item {
  display: flex;
  flex-direction: column;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e7e5e4);
  border-radius: var(--border-radius, 8px);
  padding: 1.5rem 1.75rem;
  box-shadow: 3px 3px 0px color-mix(in srgb, var(--color-border, #e7e5e4) 22%, transparent);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.post-summary:hover,
.post-item:hover {
  transform: translate(-1px, -1px);
  border-color: var(--color-accent, #991b1b);
  box-shadow: 4px 4px 0px color-mix(in srgb, var(--color-accent, #991b1b) 30%, var(--color-border, #e7e5e4));
}

.post-summary h2,
.post-item h2,
.post-link {
  font-family: var(--font-headline, ''Newsreader'', Georgia, serif);
  font-size: 1.55rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 0 0 0.5rem 0;
  text-wrap: balance;
}

.post-summary h2 a,
.post-item h2 a,
.post-link {
  color: var(--color-text, #1c1917);
  text-decoration: none;
  transition: color 0.15s ease;
  display: block;
}

.post-summary h2 a:hover,
.post-item h2 a:hover,
.post-link:hover {
  color: var(--color-accent, #991b1b);
}

.post-meta {
  font-family: var(--font-body, system-ui, sans-serif);
  font-size: 0.825rem;
  color: var(--color-text-muted, #78716c);
  margin-bottom: 0.75rem;
}

.post-summary p,
.post-item p {
  color: var(--color-text, #1c1917);
  line-height: var(--line-height-body, 1.75);
  margin: 0;
  text-wrap: pretty;
}

article > h1 {
  font-family: var(--font-headline, ''Newsreader'', Georgia, serif);
  font-size: clamp(2rem, 1.6rem + 1.5vw, 2.75rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--color-text, #1c1917);
  text-wrap: balance;
}

article > .post-meta {
  font-family: var(--font-body, system-ui, sans-serif);
  font-size: 0.875rem;
  color: var(--color-text-muted, #78716c);
  margin-bottom: 2rem;
}

.cover-image {
  width: 100%;
  max-height: 480px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 2rem;
  border: 1px solid var(--color-border, #e7e5e4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  display: block;
}',
    0
);

-- 2. Seed Docs Template
INSERT INTO layout_templates (id, name, description, template_html, template_css, is_locked) VALUES (
    'doc',
    'Docs Template',
    'Layout and styles for documentation pages, sidebar tree navigation, and on-page TOC.',
    '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ doc.title }} &mdash; Docs</title>
    <meta name="description" content="{{ doc.meta_description }}">
    <link rel="canonical" href="{{ doc.canonical|safe }}">
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
            <a href="/" class="site-title">{{ site_title }}</a>
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
    </footer>
    <script>
        document.addEventListener(''DOMContentLoaded'', () => {
            const content = document.getElementById(''docs-content'');
            const tocContainer = document.getElementById(''toc-container'');
            if (!content || !tocContainer) return;
            
            const headings = content.querySelectorAll(''h2, h3'');
            if (headings.length === 0) {
                const tocAside = document.querySelector(''.docs-toc'');
                if (tocAside) tocAside.style.display = ''none'';
                return;
            }
            
            headings.forEach((heading, index) => {
                if (!heading.id) {
                    heading.id = ''heading-'' + index;
                }
                const li = document.createElement(''li'');
                li.className = ''toc-'' + heading.tagName.toLowerCase();
                const a = document.createElement(''a'');
                a.href = ''#'' + heading.id;
                a.textContent = heading.textContent;
                
                a.addEventListener(''click'', (e) => {
                    e.preventDefault();
                    heading.scrollIntoView({ behavior: ''smooth'' });
                    history.pushState(null, null, ''#'' + heading.id);
                    document.querySelectorAll(''.toc-list a'').forEach((link) => link.classList.remove(''active''));
                    a.classList.add(''active'');
                });
                
                li.appendChild(a);
                tocContainer.appendChild(li);
            });

            if (''IntersectionObserver'' in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            const id = entry.target.id;
                            const links = tocContainer.querySelectorAll(''a'');
                            links.forEach((link) => {
                                if (link.getAttribute(''href'') === ''#'' + id) {
                                    link.classList.add(''active'');
                                } else {
                                    link.classList.remove(''active'');
                                }
                            });
                        }
                    });
                }, { rootMargin: ''0px 0px -70% 0px'' });
                
                headings.forEach((h) => observer.observe(h));
            }
        });
    </script>
</body>
</html>',
    '/* Docs Layout & Readability */
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
    border-radius: 8px;
    box-shadow: 3px 3px 0px color-mix(in srgb, var(--color-border, #e7e5e4) 18%, transparent);
    scrollbar-width: thin;
}
.docs-search {
    margin-bottom: 1.25rem;
}
.docs-search form {
    margin: 0;
}
.docs-search input {
    width: 100%;
    padding: 0.6rem 0.85rem;
    border: 1px solid var(--color-border, #e7e5e4);
    border-radius: 6px;
    background: var(--color-surface, #ffffff);
    color: var(--color-text, #1c1917);
    font-family: var(--font-body, system-ui, sans-serif);
    font-size: 0.875rem;
    line-height: 1.4;
    box-sizing: border-box;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.docs-search input:focus {
    outline: none;
    border-color: var(--color-accent, #991b1b);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent, #991b1b) 15%, transparent);
}
.docs-search input::placeholder {
    color: var(--color-text-muted, #78716c);
}
.docs-nav ul {
    list-style: none;
    padding: 0;
    margin: 0;
}
.docs-nav > ul > li {
    margin-bottom: 0.75rem;
}
.docs-nav ul ul {
    padding-left: 0.85rem;
    margin-top: 0.25rem;
    border-left: 1.5px solid var(--color-border, #e7e5e4);
    margin-left: 0.5rem;
}
.docs-nav li {
    margin: 0.25rem 0;
}
.docs-nav a {
    display: block;
    padding: 0.4rem 0.65rem;
    border-radius: 0 5px 5px 0;
    border-left: 3px solid transparent;
    text-decoration: none;
    color: var(--color-text-muted, #78716c);
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.4;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.docs-nav a:hover {
    color: var(--color-text, #1c1917);
    background: color-mix(in srgb, var(--color-text, #1c1917) 5%, transparent);
}
.docs-nav a[aria-current="page"] {
    font-weight: 700;
    color: var(--color-accent, #991b1b);
    border-left-color: var(--color-accent, #991b1b);
    background: color-mix(in srgb, var(--color-accent, #991b1b) 10%, var(--color-surface, #ffffff));
}
.docs-main {
    flex: 1;
    min-width: 0;
    padding-bottom: 3rem;
}
.docs-main > article {
    background: var(--color-surface, #ffffff);
    border: 1px solid var(--color-border, #e7e5e4);
    border-radius: 8px;
    padding: 2.25rem 2.5rem;
    box-shadow: 3px 3px 0px color-mix(in srgb, var(--color-border, #e7e5e4) 18%, transparent);
}
.docs-main article > h1 {
    font-family: var(--font-headline, ''Newsreader'', Georgia, serif);
    font-size: 2.25rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin-top: 0;
    margin-bottom: 1.5rem;
    color: var(--color-text, #1c1917);
}
.docs-content {
    font-size: 1.05rem;
    line-height: 1.8;
    color: var(--color-text, #1c1917);
}
.docs-content > p,
.docs-content > ul,
.docs-content > ol {
    max-width: 78ch;
    margin-bottom: 1.5rem;
}
.docs-content > ul,
.docs-content > ol {
    padding-left: 1.5rem;
}
.docs-content li {
    margin-bottom: 0.5rem;
}
.docs-content h2 {
    font-family: var(--font-headline, ''Newsreader'', Georgia, serif);
    font-size: 1.65rem;
    font-weight: 700;
    margin-top: 2.75rem;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border, #e7e5e4);
    scroll-margin-top: 2rem;
    letter-spacing: -0.01em;
}
.docs-content h3 {
    font-family: var(--font-headline, ''Newsreader'', Georgia, serif);
    font-size: 1.3rem;
    font-weight: 600;
    margin-top: 2rem;
    margin-bottom: 0.75rem;
    scroll-margin-top: 2rem;
}
.docs-content h4 {
    font-family: var(--font-headline, ''Newsreader'', Georgia, serif);
    font-size: 1.1rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    scroll-margin-top: 2rem;
}
.docs-content a {
    color: var(--color-accent, #991b1b);
    text-decoration: underline;
    text-underline-offset: 3px;
    transition: color 0.15s ease;
}
.docs-content a:hover {
    color: color-mix(in srgb, var(--color-accent, #991b1b) 80%, black);
}
.docs-toc {
    width: 240px;
    flex-shrink: 0;
    position: sticky;
    top: 2rem;
    align-self: flex-start;
    max-height: calc(100vh - 4rem);
    overflow-y: auto;
    padding-left: 1.25rem;
    border-left: 1px solid var(--color-border, #e7e5e4);
    scrollbar-width: thin;
}
.docs-toc h3 {
    font-family: var(--font-body, system-ui, sans-serif);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted, #78716c);
    margin-top: 0;
    margin-bottom: 0.75rem;
    font-weight: 700;
}
.toc-list {
    list-style: none;
    padding: 0;
    margin: 0;
}
.toc-list li {
    margin: 0.35rem 0;
    line-height: 1.4;
}
.toc-list a {
    color: var(--color-text-muted, #78716c);
    text-decoration: none;
    font-size: 0.85rem;
    transition: color 0.15s ease, border-color 0.15s ease;
    display: block;
    padding: 0.2rem 0 0.2rem 0.5rem;
    margin-left: -1.25rem;
    border-left: 2px solid transparent;
}
.toc-list a:hover {
    color: var(--color-text, #1c1917);
}
.toc-list a.active {
    color: var(--color-accent, #991b1b);
    border-left-color: var(--color-accent, #991b1b);
    font-weight: 600;
}
.toc-h2 {
    margin-left: 0;
}
.toc-h3 {
    margin-left: 0.75rem;
}
.docs-footer-nav {
    display: flex;
    justify-content: space-between;
    gap: 1.5rem;
    margin-top: 2.5rem;
    padding-top: 1.5rem;
}
.docs-footer-nav a {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1.15rem;
    border: 1px solid var(--color-border, #e7e5e4);
    border-radius: 6px;
    background: var(--color-surface, #ffffff);
    color: var(--color-text, #1c1917);
    font-family: var(--font-body, system-ui, sans-serif);
    font-size: 0.875rem;
    font-weight: 600;
    text-decoration: none;
    box-shadow: 3px 3px 0px color-mix(in srgb, var(--color-border, #e7e5e4) 22%, transparent);
    transition: all 0.15s ease;
}
.docs-footer-nav a:hover {
    border-color: var(--color-accent, #991b1b);
    color: var(--color-accent, #991b1b);
    transform: translate(-1px, -1px);
    box-shadow: 4px 4px 0px color-mix(in srgb, var(--color-accent, #991b1b) 35%, var(--color-border, #e7e5e4));
}
@media (max-width: 1100px) {
    .docs-toc {
        display: none;
    }
    .docs-layout {
        gap: 2rem;
    }
}
@media (max-width: 768px) {
    body:has(.docs-layout) header,
    body.docs-page header {
        padding: 1.25rem 1rem 1rem 1rem;
    }
    .docs-layout {
        flex-direction: column;
        padding: 1rem;
        gap: 2rem;
    }
    .docs-sidebar {
        width: 100%;
        position: static;
        max-height: none;
        box-sizing: border-box;
    }
    .docs-main > article {
        padding: 1.5rem 1.25rem;
    }
    body:has(.docs-layout) footer,
    body.docs-page footer {
        padding: 1.5rem 1rem;
    }
    .docs-footer-nav {
        flex-direction: column;
        gap: 0.75rem;
    }
    .docs-footer-nav a {
        justify-content: center;
    }
}',
    0
);

-- 3. Seed Page Template
INSERT INTO layout_templates (id, name, description, template_html, template_css, is_locked) VALUES (
    'page',
    'Page Template',
    'Layout and styles for standard static pages, subpages navigation, and breadcrumbs.',
    '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ page.title }} &mdash; {{ site_title }}</title>
    <meta name="description" content="{{ page.meta_description }}">
    <link rel="canonical" href="{{ page.canonical|safe }}">
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
            <a href="/" class="site-title">{{ site_title }}</a>
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
            {% if sections_html %}
            {{ sections_html|safe }}
            {% else %}
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
    </footer>
</body>
</html>',
    '',
    0
);
