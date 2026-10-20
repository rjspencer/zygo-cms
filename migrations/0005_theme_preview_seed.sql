-- Migration: 0005_theme_preview_seed.sql
-- Description: Harmonize section template styles with theme tokens, support wall-to-wall sections with padded text content, and seed /theme-preview page with all 10 section templates.

-- 1. Update Section Templates CSS to strictly consume CSS custom properties with generous padding
UPDATE section_templates SET template_css = '.section-hero { position: relative; display: flex; align-items: center; justify-content: center; min-height: 70vh; padding: 6rem 2rem; overflow: hidden; text-align: center; box-sizing: border-box; width: 100%; }
.hero-background { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; }
.hero-media { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; }
.hero-overlay { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 2; }
.hero-content { position: relative; z-index: 3; max-width: 800px; margin: 0 auto; color: #ffffff; padding: 0 1rem; box-sizing: border-box; }
.hero-headline { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; line-height: 1.15; margin: 0 0 1rem; color: #ffffff; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4); text-wrap: balance; }
.hero-subheadline { font-family: var(--font-body, system-ui, sans-serif); font-size: clamp(1.125rem, 2.5vw, 1.35rem); line-height: 1.5; color: rgba(255, 255, 255, 0.9); margin: 0 0 2rem; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4); text-wrap: pretty; }
.hero-btn { display: inline-block; padding: 0.875rem 2rem; background: #ffffff; color: #111111; font-weight: 600; text-decoration: none; border-radius: var(--border-radius, 6px); transition: transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease; box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.1)); }
.hero-btn:hover { background: #f4f4f5; transform: translateY(-1px); }
@media (max-width: 768px) { .section-hero { padding: 4.5rem 1.25rem; } }
@media (prefers-reduced-motion: reduce) { .hero-video { display: none; } }'
WHERE id = 'hero';

UPDATE section_templates SET template_css = '.section-text { padding: 4rem 2rem; box-sizing: border-box; width: 100%; }
.text-container { max-width: 740px; margin: 0 auto; }
.text-container h2 { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(1.75rem, 3vw, 2.25rem); font-weight: 700; color: var(--color-text, #1c1917); margin: 0 0 1.25rem 0; line-height: 1.25; }
.text-prose { font-family: var(--font-body, system-ui, sans-serif); font-size: var(--font-size-base, 18px); line-height: var(--line-height-body, 1.75); color: var(--color-text, #1c1917); }
.text-prose p { margin: 0 0 1.25rem 0; }
.text-prose p:last-child { margin-bottom: 0; }
@media (max-width: 768px) { .section-text { padding: 2.5rem 1.25rem; } }'
WHERE id = 'text';

UPDATE section_templates SET template_css = '.section-text-image { padding: 4rem 2rem; box-sizing: border-box; width: 100%; }
.text-image-container { display: flex; gap: 3rem; align-items: center; max-width: 1200px; margin: 0 auto; flex-wrap: wrap; }
.text-image-content { flex: 1; min-width: 300px; }
.text-image-content h2 { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(1.75rem, 3vw, 2.25rem); font-weight: 700; color: var(--color-text, #1c1917); margin: 0 0 1rem 0; line-height: 1.25; }
.text-image-prose { font-family: var(--font-body, system-ui, sans-serif); font-size: var(--font-size-base, 18px); line-height: var(--line-height-body, 1.75); color: var(--color-text, #1c1917); }
.text-image-prose p { margin: 0 0 1rem 0; }
.text-image-media { flex: 1; min-width: 300px; }
.text-image-media img { width: 100%; height: auto; border-radius: var(--border-radius, 8px); border: 1px solid var(--color-border, #e7e5e4); box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.1)); display: block; }
.image-left .text-image-container { flex-direction: row-reverse; }
@media (max-width: 768px) { .section-text-image { padding: 2.5rem 1.25rem; } .text-image-container { gap: 1.75rem; } }'
WHERE id = 'text-image';

UPDATE section_templates SET template_css = '.section-gallery { padding: 4rem 2rem; max-width: 1400px; margin: 0 auto; box-sizing: border-box; width: 100%; }
.gallery-title { text-align: center; margin-bottom: 2.5rem; font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(1.75rem, 3vw, 2.25rem); font-weight: 700; color: var(--color-text, #1c1917); }
.gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.75rem; }
.gallery-item { margin: 0; background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #e7e5e4); border-radius: var(--border-radius, 8px); overflow: hidden; box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.1)); }
.gallery-item img { width: 100%; height: 220px; object-fit: cover; display: block; }
.gallery-item figcaption { font-family: var(--font-body, system-ui, sans-serif); font-size: 0.875rem; color: var(--color-text-muted, #78716c); padding: 0.85rem 1rem; text-align: center; }
@media (max-width: 768px) { .section-gallery { padding: 2.5rem 1.25rem; } }'
WHERE id = 'gallery';

UPDATE section_templates SET template_css = '.section-carousel { background: color-mix(in srgb, var(--color-accent, #991b1b) 7%, var(--color-bg, #faf8f5)); border-top: 1px solid color-mix(in srgb, var(--color-border, #e7e5e4) 60%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--color-border, #e7e5e4) 60%, transparent); padding: 5rem 2rem; box-sizing: border-box; width: 100%; }
.carousel-title { text-align: center; margin: 0 auto 2.5rem; max-width: 1200px; font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(1.75rem, 3vw, 2.25rem); font-weight: 700; color: var(--color-text, #1c1917); }
.carousel-track { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 1.5rem; padding-bottom: 1.5rem; scrollbar-width: thin; max-width: 1200px; margin: 0 auto; }
.carousel-slide { flex: 0 0 75%; max-width: 75%; scroll-snap-align: center; background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #e7e5e4); border-radius: var(--border-radius, 8px); overflow: hidden; box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.1)); }
.carousel-slide img { width: 100%; height: 420px; object-fit: cover; display: block; }
.carousel-caption { font-family: var(--font-body, system-ui, sans-serif); font-size: 0.875rem; color: var(--color-text-muted, #78716c); padding: 0.85rem 1.25rem; text-align: center; margin: 0; }
@media (max-width: 768px) { .section-carousel { padding: 3rem 1.25rem; } .carousel-slide { flex: 0 0 85%; max-width: 85%; } .carousel-slide img { height: 260px; } }'
WHERE id = 'image-carousel';

UPDATE section_templates SET template_css = '.section-cta { padding: 4rem 2rem; box-sizing: border-box; width: 100%; }
.cta-box { background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #e7e5e4); padding: 3.5rem 2rem; border-radius: var(--border-radius, 8px); text-align: center; max-width: 900px; margin: 0 auto; box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.1)); box-sizing: border-box; }
.cta-box h2 { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(1.75rem, 3vw, 2.25rem); font-weight: 700; margin-top: 0; color: var(--color-text, #1c1917); }
.cta-box p { font-family: var(--font-body, system-ui, sans-serif); color: var(--color-text-muted, #78716c); margin: 1rem 0 2rem; font-size: 1.125rem; line-height: 1.6; }
.cta-button { display: inline-block; padding: 0.875rem 2.25rem; background: var(--color-accent, #991b1b); color: #ffffff; text-decoration: none; border-radius: var(--border-radius, 6px); font-weight: 600; font-family: var(--font-body, system-ui, sans-serif); transition: transform 0.15s ease, opacity 0.15s ease; }
.cta-button:hover { opacity: 0.9; transform: translateY(-1px); }
@media (max-width: 768px) { .section-cta { padding: 2.5rem 1.25rem; } .cta-box { padding: 2.25rem 1.25rem; } }'
WHERE id = 'call-to-action';

UPDATE section_templates SET template_css = '.section-features { background: color-mix(in srgb, var(--color-text, #1c1917) 6%, var(--color-bg, #faf8f5)); border-top: 1px solid color-mix(in srgb, var(--color-border, #e7e5e4) 60%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--color-border, #e7e5e4) 60%, transparent); padding: 5rem 2rem; box-sizing: border-box; width: 100%; }
.features-heading { text-align: center; margin: 0 auto 3rem; max-width: 1200px; font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(1.75rem, 3vw, 2.25rem); font-weight: 700; color: var(--color-text, #1c1917); }
.features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; max-width: 1200px; margin: 0 auto; }
.feature-card { padding: 2rem; background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #e7e5e4); border-radius: var(--border-radius, 8px); box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.1)); transition: transform 0.15s ease; box-sizing: border-box; }
.feature-card:hover { transform: translateY(-2px); }
.feature-card h3 { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: 1.35rem; font-weight: 700; color: var(--color-text, #1c1917); margin: 0 0 0.75rem 0; }
.feature-card p { font-family: var(--font-body, system-ui, sans-serif); font-size: 0.95rem; line-height: 1.6; color: var(--color-text-muted, #78716c); margin: 0; }
.feature-icon { width: 48px; height: 48px; margin-bottom: 1.25rem; }
@media (max-width: 768px) { .section-features { padding: 3rem 1.25rem; } .feature-card { padding: 1.5rem 1.25rem; } }'
WHERE id = 'feature-grid';

UPDATE section_templates SET template_css = '.section-testimonial { padding: 4rem 2rem; max-width: 840px; margin: 0 auto; box-sizing: border-box; width: 100%; }
.testimonial-blockquote { margin: 0; text-align: center; background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #e7e5e4); border-radius: var(--border-radius, 8px); padding: 3rem 2.5rem; box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.1)); box-sizing: border-box; }
.testimonial-quote { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(1.25rem, 2.5vw, 1.6rem); font-style: italic; line-height: 1.6; color: var(--color-text, #1c1917); margin: 0 0 2rem 0; }
.testimonial-footer { display: flex; align-items: center; justify-content: center; gap: 1rem; }
.testimonial-avatar { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-accent, #991b1b); }
.testimonial-info { text-align: left; }
.testimonial-author { font-family: var(--font-body, system-ui, sans-serif); font-weight: 700; font-style: normal; display: block; color: var(--color-text, #1c1917); }
.testimonial-role { font-family: var(--font-body, system-ui, sans-serif); font-size: 0.875rem; color: var(--color-text-muted, #78716c); }
@media (max-width: 768px) { .section-testimonial { padding: 2.5rem 1.25rem; } .testimonial-blockquote { padding: 2rem 1.25rem; } }'
WHERE id = 'testimonial';

UPDATE section_templates SET template_css = '.section-faq { padding: 4rem 2rem; max-width: 840px; margin: 0 auto; box-sizing: border-box; width: 100%; }
.faq-title { text-align: center; margin-bottom: 2.5rem; font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(1.75rem, 3vw, 2.25rem); font-weight: 700; color: var(--color-text, #1c1917); }
.faq-list { display: flex; flex-direction: column; gap: 1.25rem; }
.faq-item { background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #e7e5e4); border-radius: var(--border-radius, 8px); padding: 1.25rem 1.5rem; box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.1)); box-sizing: border-box; }
.faq-question { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: 1.15rem; font-weight: 600; color: var(--color-text, #1c1917); cursor: pointer; }
.faq-answer { font-family: var(--font-body, system-ui, sans-serif); margin-top: 1rem; line-height: 1.65; color: var(--color-text-muted, #78716c); }
.faq-answer p { margin: 0 0 0.75rem 0; }
.faq-answer p:last-child { margin-bottom: 0; }
@media (max-width: 768px) { .section-faq { padding: 2.5rem 1.25rem; } .faq-item { padding: 1rem 1.25rem; } }'
WHERE id = 'faq';

UPDATE section_templates SET template_css = '.section-video { padding: 4rem 2rem; box-sizing: border-box; width: 100%; }
.video-container { max-width: 1000px; margin: 0 auto; text-align: center; }
.video-container h2 { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(1.75rem, 3vw, 2.25rem); font-weight: 700; color: var(--color-text, #1c1917); margin: 0 0 2rem 0; }
.video-wrapper { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: var(--border-radius, 8px); border: 1px solid var(--color-border, #e7e5e4); box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.1)); }
.video-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
@media (max-width: 768px) { .section-video { padding: 2.5rem 1.25rem; } }'
WHERE id = 'video-embed';

-- 2. Update page layout template in layout_templates table
UPDATE layout_templates 
SET template_html = '<!DOCTYPE html>
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
</html>'
WHERE id = 'page';

-- 3. Seed /theme-preview page with all 10 section templates
INSERT INTO entries (slug, title, type, status, path, sort_order, search_text, published_at, body_html, body_json) VALUES (
    'theme-preview',
    'Theme & Section Showcase',
    'page',
    'published',
    '/theme-preview',
    10,
    'Theme Section Showcase Hero Text Gallery Carousel Features Testimonial FAQ Video Embed',
    CURRENT_TIMESTAMP,
    '',
    '[{"type_id":"hero","data":{"headline":"Designing Autonomous Systems with Elegance","subheadline":"An exploration into next-generation edge architecture, fluid editorial layouts, and reactive AI pair programming.","button_text":"Explore Documentation","button_url":"/docs","image":"https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80","video_url":""}},{"type_id":"text","data":{"title":"The Philosophy of Edge-First Publishing","body":"<p>Traditional web architectures impose significant latency and infrastructure overhead. By compiling content representations at the edge with zero-cold-start runtimes, Zygo CMS provides instant page loads and real-time updates without database connection pooling bottlenecks.</p><p>Every layout adheres strictly to typographic hierarchy, accessible focus states, and dynamic contrast ratios.</p>"}},{"type_id":"text-image","data":{"title":"Engineered for Extreme Performance","body":"<p>By pairing Cloudflare Workers and D1 with Rust-compiled Wasm templates, content is hydrated with near-zero latency worldwide.</p><p>All assets are cached intelligently at the network edge, with automatic invalidation across canonical URLs whenever revisions are published.</p>","image":"https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80","image_position":"right"}},{"type_id":"gallery","data":{"title":"Visual Design & System Architecture","images":[{"image":"https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80","caption":"Clean Minimalist Typography"},{"image":"https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80","caption":"Rust WebAssembly Core"},{"image":"https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80","caption":"Real-Time Telemetry & Metrics"}]}},{"type_id":"image-carousel","data":{"title":"Curated Workspaces & Editorial Showcase","slides":[{"image":"https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1000&q=80","caption":"Developer Workspace & CLI Tools"},{"image":"https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80","caption":"Collaborative Pair Programming Sessions"},{"image":"https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1000&q=80","caption":"High Velocity Delivery Pipeline"}]}},{"type_id":"call-to-action","data":{"heading":"Ready to Transform Your Content Workflow?","text":"Join leading publishers and developers building lightning-fast modern publications with Zygo CMS.","button_label":"Get Started Today","button_url":"/docs/quickstart"}},{"type_id":"feature-grid","data":{"title":"Core Capabilities","features":[{"title":"Edge-Rendered SSR","description":"Sub-50ms TTFB delivered globally using Cloudflare D1 and Rust micro-runtimes.","icon":""},{"title":"WebMCP Agent Parity","description":"Every human UI action can be orchestrated programmatically by autonomous AI coding agents.","icon":""},{"title":"Dynamic Theming Engine","description":"Tokenized color-mix, font presets, and fluid typography that adapt without rebuilding.","icon":""}]}},{"type_id":"testimonial","data":{"quote":"Zygo CMS represents the rare union of uncompromising editorial aesthetics and blistering edge performance. It has transformed how our team publishes.","author":"Elena Rostova","role":"Head of Engineering, Monolith Media","avatar":"https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80"}},{"type_id":"faq","data":{"title":"Frequently Asked Questions","questions":[{"question":"How does Zygo CMS handle database migrations?","answer":"<p>Zygo CMS uses Cloudflare D1 with strict expand/contract migrations, explicit column selection, and immutable revision logging for zero downtime.</p>"},{"question":"Can custom section templates be created in the Admin UI?","answer":"<p>Yes. The visual Template Editor allows creating custom MiniJinja section templates with dynamic field builders and server-side syntax validation.</p>"},{"question":"How does theme switching work?","answer":"<p>Themes are defined using CSS custom properties on <code>:root</code>. Switching active themes updates these tokens in real-time across both editorial posts and modular page sections.</p>"}]}},{"type_id":"video-embed","data":{"title":"Platform Architecture Walkthrough","video_url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}}]'
)
ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title,
    type = excluded.type,
    status = excluded.status,
    path = excluded.path,
    sort_order = excluded.sort_order,
    search_text = excluded.search_text,
    body_html = excluded.body_html,
    body_json = excluded.body_json,
    updated_at = CURRENT_TIMESTAMP;

-- 4. Add link to footer menu
UPDATE menus 
SET items_json = CASE 
    WHEN items_json = '[]' OR items_json = '' OR items_json IS NULL 
        THEN '[{"title":"Theme Preview","url":"/theme-preview","target":"_self","children":[]}]'
    WHEN items_json NOT LIKE '%/theme-preview%' 
        THEN json_insert(items_json, '$[#]', json('{"title":"Theme Preview","url":"/theme-preview","target":"_self","children":[]}'))
    ELSE items_json
END
WHERE name = 'footer';
