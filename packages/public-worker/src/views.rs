use minijinja::{Environment};
use zygo_core::models::{BreadcrumbItem, ContentType, SectionTemplate, Entry, EntryRevision, MenuItem, Pagination};

const DEFAULT_INDEX: &str = r##"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ page_title }}</title>
    <link rel="canonical" href="{{ canonical_url|safe }}">
    {% if theme_font_url %}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="{{ theme_font_url|safe }}">
    {% endif %}
    <link rel="stylesheet" href="/style.css">
    {% if theme_css %}
    <style>{{ theme_css|safe }}</style>
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
            <a href="/">Home</a>
            {% for item in header_menu %}
            <a href="{{ item.url|safe }}">{{ item.title }}</a>
            {% endfor %}
        </nav>
    </header>
    <main id="main-content">
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
    {% if theme_font_url %}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="{{ theme_font_url|safe }}">
    {% endif %}
    <link rel="stylesheet" href="/style.css">
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
            <a href="/">Home</a>
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
    {% if theme_font_url %}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="{{ theme_font_url|safe }}">
    {% endif %}
    <link rel="stylesheet" href="/style.css">
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
            <a href="/">Home</a>
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
            <img class="cover-image" src="{{ page.cover_image|safe }}" alt="{{ page.title }}">
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
</html>"##;

const DEFAULT_SEARCH: &str = r##"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Search &mdash; {{ site_title }}</title>
    {% if theme_font_url %}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="{{ theme_font_url|safe }}">
    {% endif %}
    <link rel="stylesheet" href="/style.css">
    {% if theme_css %}
    <style>{{ theme_css|safe }}</style>
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
            <a href="/">Home</a>
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

const DEFAULT_DOC: &str = r##"<!DOCTYPE html>
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
    <link rel="stylesheet" href="/style.css">
    {% if theme_css %}
    <style>{{ theme_css|safe }}</style>
    {% endif %}
    {% if template_css %}
    <style>{{ template_css|safe }}</style>
    {% endif %}
    <style>
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
            padding-right: 1rem;
            scrollbar-width: thin;
        }
        .docs-search {
            margin-bottom: 1.5rem;
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
            box-shadow: 0 0 0 3px rgba(153, 27, 27, 0.12);
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
            border-left: 1px solid var(--color-border, #e7e5e4);
            margin-left: 0.5rem;
        }
        .docs-nav li {
            margin: 0.25rem 0;
        }
        .docs-nav a {
            display: block;
            padding: 0.35rem 0.6rem;
            border-radius: 5px;
            text-decoration: none;
            color: var(--color-text-muted, #78716c);
            font-size: 0.875rem;
            font-weight: 500;
            line-height: 1.4;
            transition: background-color 0.15s ease, color 0.15s ease;
        }
        .docs-nav a:hover {
            color: var(--color-text, #1c1917);
            background: rgba(0, 0, 0, 0.04);
        }
        .docs-nav a[aria-current="page"] {
            font-weight: 600;
            color: var(--color-accent, #991b1b);
            background: rgba(153, 27, 27, 0.08);
        }
        .docs-main {
            flex: 1;
            min-width: 0;
            padding-bottom: 3rem;
        }
        .docs-main article > h1 {
            font-family: var(--font-headline, 'Newsreader', Georgia, serif);
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
            font-family: var(--font-headline, 'Newsreader', Georgia, serif);
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
            font-family: var(--font-headline, 'Newsreader', Georgia, serif);
            font-size: 1.3rem;
            font-weight: 600;
            margin-top: 2rem;
            margin-bottom: 0.75rem;
            scroll-margin-top: 2rem;
        }
        .docs-content h4 {
            font-family: var(--font-headline, 'Newsreader', Georgia, serif);
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
            color: #b91c1c;
        }
        .docs-content blockquote {
            border-left: 4px solid var(--color-accent, #991b1b);
            background: rgba(153, 27, 27, 0.04);
            margin: 1.75rem 0;
            padding: 1rem 1.5rem;
            border-radius: 0 6px 6px 0;
            color: var(--color-text, #1c1917);
            font-style: italic;
            max-width: 78ch;
        }
        .docs-content blockquote p {
            margin-bottom: 0;
        }
        .docs-content pre {
            background: #18181b;
            color: #f4f4f5;
            padding: 1.25rem 1.5rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1.75rem 0;
            font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
            font-size: 0.9rem;
            line-height: 1.6;
            border: 1px solid #27272a;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .docs-content code {
            font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
        }
        .docs-content :not(pre) > code {
            background: rgba(0, 0, 0, 0.06);
            color: var(--color-accent, #991b1b);
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-size: 0.88em;
            font-weight: 500;
        }
        .docs-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 2rem 0;
            font-size: 0.95rem;
        }
        .docs-content th,
        .docs-content td {
            border: 1px solid var(--color-border, #e7e5e4);
            padding: 0.75rem 1rem;
            text-align: left;
        }
        .docs-content th {
            background: rgba(0, 0, 0, 0.03);
            font-family: var(--font-body, system-ui, sans-serif);
            font-weight: 600;
            color: var(--color-text, #1c1917);
        }
        .docs-content hr {
            border: 0;
            border-top: 1px solid var(--color-border, #e7e5e4);
            margin: 2.5rem 0;
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
            margin-top: 4rem;
            padding-top: 1.75rem;
            border-top: 1px solid var(--color-border, #e7e5e4);
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
            transition: all 0.15s ease;
        }
        .docs-footer-nav a:hover {
            border-color: var(--color-accent, #991b1b);
            color: var(--color-accent, #991b1b);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
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
                padding-right: 0;
                border-bottom: 1px solid var(--color-border, #e7e5e4);
                padding-bottom: 1.5rem;
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
        }
    </style>
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
            <a href="/">Home</a>
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


fn create_env<'a>(section_templates: &'a [SectionTemplate]) -> worker::Result<Environment<'a>> {
    let mut env = Environment::new();
    zygo_core::template_engine::configure_env(&mut env);

    // Register built-in default templates
    let _ = env.add_template("index", DEFAULT_INDEX);
    let _ = env.add_template("post", DEFAULT_POST);
    let _ = env.add_template("page", DEFAULT_PAGE);
    let _ = env.add_template("doc", DEFAULT_DOC);
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
        let current_attr = if path == current_path { " aria-current=\"page\"" } else { "" };
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
    let mut children: Vec<&'a Entry> = docs.iter()
        .filter(|d| d.parent_id == parent_id)
        .collect();
        
    children.sort_by_key(|d| d.sort_order.unwrap_or(0));
    
    for child in children {
        let cid = child.id;
        flattened.push(child);
        flatten_docs(docs, Some(cid), flattened);
    }
}

pub fn inject_theme_context(
    ctx: &mut serde_json::Map<String, serde_json::Value>,
    settings: Option<&std::collections::HashMap<String, String>>,
) {
    let get_setting = |key: &str| -> Option<&str> {
        settings
            .and_then(|s| s.get(key).map(|v| v.as_str()))
            .filter(|v| !v.trim().is_empty())
    };

    let font_url = get_setting("theme_font_url").unwrap_or(
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&display=swap",
    );
    let font_headline = get_setting("theme_font_headline").unwrap_or("'Newsreader', Georgia, serif");
    let font_body = get_setting("theme_font_body")
        .unwrap_or("'Inter', -apple-system, BlinkMacSystemFont, sans-serif");
    let color_bg = get_setting("theme_color_bg").unwrap_or("#faf8f5");
    let color_text = get_setting("theme_color_text").unwrap_or("#1c1917");
    let color_text_muted = get_setting("theme_color_text_muted").unwrap_or("#78716c");
    let color_accent = get_setting("theme_color_accent").unwrap_or("#991b1b");
    let color_surface = get_setting("theme_color_surface").unwrap_or("#ffffff");
    let color_border = get_setting("theme_color_border").unwrap_or("#e7e5e4");
    let max_width = get_setting("theme_max_width").unwrap_or("740px");
    let font_size_base = get_setting("theme_font_size_base").unwrap_or("18px");
    let line_height = get_setting("theme_line_height").unwrap_or("1.75");
    let header_layout = get_setting("theme_header_layout").unwrap_or("centered");
    let header_border_style = get_setting("theme_header_border_style").unwrap_or("double");
    let header_title_size = get_setting("theme_header_title_size").unwrap_or("2rem");
    let header_nav_transform = get_setting("theme_header_nav_transform").unwrap_or("uppercase");
    let header_padding = get_setting("theme_header_padding").unwrap_or("1.75rem 0 1.25rem 0");

    let header_border = match header_border_style {
        "none" => "none".to_string(),
        "solid" => format!("1px solid {color_border}"),
        _ => format!("3px double {color_border}"),
    };

    let site_title = get_setting("site_title").unwrap_or("Zygo");
    let site_tagline = settings
        .and_then(|s| s.get("theme_header_tagline").or_else(|| s.get("site_tagline")))
        .map(|s| s.as_str())
        .unwrap_or("An Editorial Review & Journal");

    let theme_css = format!(
        ":root {{\n  --font-headline: {font_headline};\n  --font-body: {font_body};\n  --color-bg: {color_bg};\n  --color-text: {color_text};\n  --color-text-muted: {color_text_muted};\n  --color-accent: {color_accent};\n  --color-surface: {color_surface};\n  --color-border: {color_border};\n  --content-max-width: {max_width};\n  --font-size-base: {font_size_base};\n  --line-height-body: {line_height};\n  --header-layout: {header_layout};\n  --header-border-style: {header_border_style};\n  --header-border: {header_border};\n  --header-title-size: {header_title_size};\n  --header-nav-transform: {header_nav_transform};\n  --header-padding: {header_padding};\n}}"
    );

    if !font_url.trim().is_empty() {
        ctx.insert("theme_font_url".to_string(), serde_json::Value::String(font_url.to_string()));
    }
    ctx.insert("theme_css".to_string(), serde_json::Value::String(theme_css));
    ctx.insert("site_title".to_string(), serde_json::Value::String(site_title.to_string()));
    if !site_tagline.trim().is_empty() {
        ctx.insert("site_tagline".to_string(), serde_json::Value::String(site_tagline.to_string()));
    }
    ctx.insert("header_layout".to_string(), serde_json::Value::String(header_layout.to_string()));
}

pub fn render_doc(
    content_types: &[ContentType],
    doc: &Entry,
    all_docs: &[Entry],
    origin: &str,
    header_menu: &[MenuItem],
    footer_menu: &[MenuItem],
    settings: Option<&std::collections::HashMap<String, String>>,
) -> worker::Result<String> {
    let env = create_env(content_types)?;
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
    ctx.insert("docs_tree_html".to_string(), serde_json::Value::String(tree_html));
    
    let mut flat = Vec::new();
    flatten_docs(all_docs, None, &mut flat);
    
    let current_index = flat.iter().position(|d| d.id == doc.id);
    if let Some(idx) = current_index {
        if idx > 0 {
            ctx.insert("prev_doc".to_string(), entry_to_context_value(&flat[idx - 1], origin));
        }
        if idx < flat.len() - 1 {
            ctx.insert("next_doc".to_string(), entry_to_context_value(&flat[idx + 1], origin));
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
                        sections_html.push_str(&format!("<div class=\"template-{}\" style=\"display: contents;\">{}</div>", tid, rendered));
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
        settings,
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
) -> worker::Result<String> {
    let env = create_env(content_types)?;

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
) -> worker::Result<String> {
    render_post_internal(content_types, post, origin, None, header_menu, footer_menu, settings)
}

pub fn render_preview_post(
    content_types: &[ContentType],
    post: &Entry,
    origin: &str,
    rev: &EntryRevision,
    header_menu: &[MenuItem],
    footer_menu: &[MenuItem],
    settings: Option<&std::collections::HashMap<String, String>>,
) -> worker::Result<String> {
    render_post_internal(
        content_types,
        post,
        origin,
        Some(rev),
        header_menu,
        footer_menu,
        settings,
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
    ctx.insert("children".to_string(), serde_json::Value::Array(children_vals));

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
    settings: Option<&std::collections::HashMap<String, String>>,
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
        let html = render_index(&content_types, &posts, "https://example.com", None, &[], &[], None).unwrap();
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
        let html = render_post(&content_types, &post, "https://example.com", &[], &[], None).unwrap();
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
        let html = render_post(&content_types, &post, "https://example.com", &[], &[], None).unwrap();
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
        let html = render_page(&content_types, &page, "https://example.com", &breadcrumbs, &children, &[], &[], None).unwrap();
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
        let html = render_preview_post(&content_types, &post, "https://example.com", &rev, &[], &[], None).unwrap();
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
        let html = render_search_html(&content_types, "rust", &posts, &[], &[], None).unwrap();
        assert!(html.contains("Query: rust - Count: 1"));
    }

    #[test]
    fn test_default_fallbacks() {
        let content_types: Vec<ContentType> = vec![];
        let posts = vec![dummy_post()];
        let page = dummy_page();

        let index_html = render_index(&content_types, &posts, "https://example.com", None, &[], &[], None).unwrap();
        assert!(index_html.contains("Hello World"));
        assert!(index_html.contains("<header class=\"header-centered\">"));
        assert!(index_html.contains("<a href=\"/\" class=\"site-title\">Zygo</a>"));
        assert!(index_html.contains("<div class=\"site-tagline\">An Editorial Review &amp; Journal</div>"));

        let post_html = render_post(&content_types, &dummy_post(), "https://example.com", &[], &[], None).unwrap();
        assert!(post_html.contains("Hello World"));
        assert!(post_html.contains("<header class=\"header-centered\">"));

        let page_html = render_page(&content_types, &page, "https://example.com", &[], &[], &[], &[], None).unwrap();
        assert!(page_html.contains("About Us"));
        assert!(page_html.contains("<header class=\"header-centered\">"));

        let search_html = render_search_html(&content_types, "test", &posts, &[], &[], None).unwrap();
        assert!(search_html.contains("Search"));
        assert!(search_html.contains("<header class=\"header-centered\">"));
    }

    #[test]
    fn test_custom_theme_settings_injection() {
        let content_types: Vec<ContentType> = vec![];
        let posts = vec![dummy_post()];
        let mut settings = std::collections::HashMap::new();
        settings.insert("site_title".to_string(), "The Daily Review".to_string());
        settings.insert("theme_header_tagline".to_string(), "Notes on Architecture".to_string());
        settings.insert("theme_header_layout".to_string(), "split".to_string());
        settings.insert("theme_header_border_style".to_string(), "none".to_string());
        settings.insert("theme_color_accent".to_string(), "#2563eb".to_string());
        settings.insert("theme_font_url".to_string(), "https://fonts.googleapis.com/css2?family=Playfair+Display&display=swap".to_string());

        let html = render_index(&content_types, &posts, "https://example.com", None, &[], &[], Some(&settings)).unwrap();
        assert!(html.contains("<header class=\"header-split\">"));
        assert!(html.contains("<a href=\"/\" class=\"site-title\">The Daily Review</a>"));
        assert!(html.contains("<div class=\"site-tagline\">Notes on Architecture</div>"));
        assert!(html.contains("https://fonts.googleapis.com/css2?family=Playfair+Display&display=swap"));
        assert!(html.contains("--color-accent: #2563eb;"));
        assert!(html.contains("--header-border: none;"));
    }

    #[test]
    fn test_video_embed_filter() {
        // YouTube formats
        assert_eq!(
            zygo_core::template_engine::video_embed_filter("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
            "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
        );
        assert_eq!(
            zygo_core::template_engine::video_embed_filter("https://youtu.be/dQw4w9WgXcQ?t=10s"),
            "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
        );
        assert_eq!(
            zygo_core::template_engine::video_embed_filter("https://www.youtube.com/embed/dQw4w9WgXcQ"),
            "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
        );
        assert_eq!(
            zygo_core::template_engine::video_embed_filter("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
            "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
        );
        assert_eq!(
            zygo_core::template_engine::video_embed_filter("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"),
            "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
        );

        // Vimeo formats
        assert_eq!(
            zygo_core::template_engine::video_embed_filter("https://vimeo.com/123456789"),
            "https://player.vimeo.com/video/123456789"
        );
        assert_eq!(
            zygo_core::template_engine::video_embed_filter("https://player.vimeo.com/video/123456789?h=abcd"),
            "https://player.vimeo.com/video/123456789"
        );
        assert_eq!(
            zygo_core::template_engine::video_embed_filter("https://vimeo.com/123456789?param=value"),
            "https://player.vimeo.com/video/123456789"
        );

        // Non-video or unsupported URLs
        assert_eq!(zygo_core::template_engine::video_embed_filter("https://example.com/video.mp4"), "");
        assert_eq!(zygo_core::template_engine::video_embed_filter("https://dailymotion.com/video/x7"), "");
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
            template_html: Some("<section class=\"text-section\"><div>{{ content|safe }}</div></section>".to_string()),
            template_css: Some(".text-section { padding: 2rem; }".to_string()),
            ..Default::default()
        };

        let unused_st = SectionTemplate {
            id: "faq".to_string(),
            name: "FAQ Section".to_string(),
            template_html: Some("<section class=\"faq-section\"><h2>FAQ</h2></section>".to_string()),
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
        ]).to_string();

        let html = render_page(&templates, &page, "https://example.com", &[], &[], &[], &[], None).unwrap();

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
        ]).to_string();

        // Rendering page must succeed and skip missing section
        let html = render_page(&templates, &page, "https://example.com", &[], &[], &[], &[], None).unwrap();
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
        let env_res = create_env(&templates);
        assert!(env_res.is_ok(), "create_env must succeed even with broken templates");
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
        let doc = dummy_doc(1, "Getting Started", "getting-started", "<h2>Introduction</h2><p>Welcome to Zygo CMS documentation.</p><h3>Configuration</h3><p>Details here.</p>");

        let all_docs = vec![
            dummy_doc(1, "Getting Started", "getting-started", "<h2>Introduction</h2><p>Welcome to Zygo CMS documentation.</p><h3>Configuration</h3><p>Details here.</p>"),
            dummy_doc(2, "Architecture", "architecture", "<p>Arch</p>"),
        ];
        let html = render_doc(&[], &doc, &all_docs, "https://example.com", &[], &[], None).unwrap();

        assert!(html.contains("<body class=\"docs-page\">"));
        assert!(html.contains("class=\"docs-layout\""));
        assert!(html.contains("class=\"docs-sidebar\""));
        assert!(html.contains("class=\"docs-main\""));
        assert!(html.contains("class=\"docs-toc\""));
        assert!(html.contains("class=\"prose docs-content\""));
        assert!(html.contains("Getting Started"));
        assert!(html.contains("Architecture"));
        assert!(html.contains("max-width: 100%"));
        assert!(html.contains("max-width: var(--docs-max-width, 1440px)"));
    }
}
