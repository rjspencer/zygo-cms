-- Migration 0011: Template Guards, Active Nav State (aria-current="page"), and Button Polish

-- 1. Upgrade header and footer navigation links in layout_templates to emit aria-current="page"
UPDATE layout_templates
SET template_html = REPLACE(
    template_html,
    '<a href="{{ item.url|safe }}">{{ item.title }}</a>',
    '<a href="{{ item.url|safe }}"{% if current_path and item.url == current_path %} aria-current="page"{% endif %}>{{ item.title }}</a>'
)
WHERE INSTR(template_html, '<a href="{{ item.url|safe }}">{{ item.title }}</a>') > 0;

-- 2. Guard optional/empty title, image, and image_position in text-image section template
UPDATE section_templates
SET template_html = '<section class="section-text-image image-{% if image_position %}{{ image_position }}{% else %}right{% endif %}">
  <div class="text-image-container">
    <div class="text-image-content">
      {% if title %}<h2>{{ title }}</h2>{% endif %}
      <div class="text-image-prose">{{ body|safe }}</div>
    </div>
    {% if image %}
    <div class="text-image-media">
      <img src="{{ image|safe }}" alt="{{ title }}" loading="lazy" decoding="async" srcset="{{ image|media_srcset|safe }}" sizes="(max-width: 768px) 100vw, 50vw">
    </div>
    {% endif %}
  </div>
</section>'
WHERE id = 'text-image';

-- 3. Polish Hero and Call-to-Action button borders and shadows for brutalist/modern themes
UPDATE section_templates
SET template_css = '.section-hero { position: relative; display: flex; align-items: center; justify-content: center; min-height: 70vh; padding: 6rem 2rem; overflow: hidden; text-align: center; box-sizing: border-box; width: 100%; }
.hero-background { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; }
.hero-media { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; }
.hero-overlay { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 2; }
.hero-content { position: relative; z-index: 3; max-width: 800px; margin: 0 auto; color: #ffffff; padding: 0 1rem; box-sizing: border-box; }
.hero-headline { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; line-height: 1.15; margin: 0 0 1rem; color: #ffffff; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4); text-wrap: balance; }
.hero-subheadline { font-family: var(--font-body, system-ui, sans-serif); font-size: clamp(1.125rem, 2.5vw, 1.35rem); line-height: 1.5; color: rgba(255, 255, 255, 0.9); margin: 0 0 2rem; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4); text-wrap: pretty; }
.hero-btn { display: inline-block; padding: 0.875rem 2rem; background: #ffffff; color: #111111; font-weight: 600; text-decoration: none; border: 1px solid var(--color-border, #e7e5e4); border-radius: var(--border-radius, 6px); transition: transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease; box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.1)); }
.hero-btn:hover { background: #f4f4f5; transform: translateY(-1px); }
@media (max-width: 768px) { .section-hero { padding: 4.5rem 1.25rem; } }
@media (prefers-reduced-motion: reduce) { .hero-video { display: none; } }'
WHERE id = 'hero';

UPDATE section_templates
SET template_css = '.section-cta { padding: 4rem 2rem; box-sizing: border-box; width: 100%; }
.cta-box { background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #e7e5e4); padding: 3.5rem 2rem; border-radius: var(--border-radius, 8px); text-align: center; max-width: 900px; margin: 0 auto; box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.1)); box-sizing: border-box; }
.cta-box h2 { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(1.75rem, 3vw, 2.25rem); font-weight: 700; margin-top: 0; color: var(--color-text, #1c1917); }
.cta-box p { font-family: var(--font-body, system-ui, sans-serif); color: var(--color-text-muted, #78716c); margin: 1rem 0 2rem; font-size: 1.125rem; line-height: 1.6; }
.cta-button { display: inline-block; padding: 0.875rem 2.25rem; background: var(--color-accent, #991b1b); color: #ffffff; text-decoration: none; border: 1px solid var(--color-border, transparent); border-radius: var(--border-radius, 6px); font-weight: 600; font-family: var(--font-body, system-ui, sans-serif); box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.1)); transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease; }
.cta-button:hover { opacity: 0.9; transform: translateY(-1px); }
@media (max-width: 768px) { .section-cta { padding: 2.5rem 1.25rem; } .cta-box { padding: 2.25rem 1.25rem; } }'
WHERE id = 'call-to-action';
