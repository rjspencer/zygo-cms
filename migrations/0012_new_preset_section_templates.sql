-- Migration: 0012_new_preset_section_templates.sql
-- Description: Seed 5 new preset section templates (pricing, stats, logo-cloud, team, steps), update /theme-preview page with all 15 presets, and remove Theme Preview from footer navigation menu.

-- 1. Insert / Upsert 5 New Preset Section Templates

-- 1a) Pricing Table
INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked)
VALUES (
    'pricing',
    'Pricing Table',
    'Responsive multi-tier pricing cards with billing period, price, feature items, highlight badge, and CTA button.',
    '[{"name":"headline","type":"text","label":"Headline","required":false},{"name":"subheadline","type":"textarea","label":"Subheadline","required":false},{"name":"plans","type":"list","label":"Pricing Plans","required":true,"fields":[{"name":"name","type":"text","label":"Plan Name","required":true},{"name":"price","type":"text","label":"Price","required":true},{"name":"period","type":"text","label":"Billing Period (e.g. / month)","required":false},{"name":"description","type":"text","label":"Description","required":false},{"name":"features","type":"textarea","label":"Features (one per line)","required":true},{"name":"button_text","type":"text","label":"Button Text","required":true},{"name":"button_url","type":"url","label":"Button URL","required":true},{"name":"is_featured","type":"boolean","label":"Highlight as Featured","required":false},{"name":"badge_text","type":"text","label":"Badge Text (e.g. Most Popular)","required":false}]}]',
    '<section class="section-pricing">
  <div class="pricing-header">
    {% if headline %}<h2 class="pricing-headline">{{ headline }}</h2>{% endif %}
    {% if subheadline %}<p class="pricing-subheadline">{{ subheadline }}</p>{% endif %}
  </div>
  <div class="pricing-grid">
    {% for plan in plans %}
    <div class="pricing-card{% if plan.is_featured %} is-featured{% endif %}">
      {% if plan.badge_text %}<span class="pricing-badge">{{ plan.badge_text }}</span>{% endif %}
      <h3 class="pricing-plan-name">{{ plan.name }}</h3>
      {% if plan.description %}<p class="pricing-plan-desc">{{ plan.description }}</p>{% endif %}
      <div class="pricing-price-wrap">
        <span class="pricing-price">{{ plan.price }}</span>
        {% if plan.period %}<span class="pricing-period">{{ plan.period }}</span>{% endif %}
      </div>
      <div class="pricing-features">
        <p class="pricing-features-text">{{ plan.features }}</p>
      </div>
      <a href="{{ plan.button_url|safe }}" class="pricing-btn">{{ plan.button_text }}</a>
    </div>
    {% endfor %}
  </div>
</section>',
    '.section-pricing { padding: 5rem 2rem; box-sizing: border-box; width: 100%; max-width: 1200px; margin: 0 auto; }
.pricing-header { text-align: center; margin-bottom: 3.5rem; }
.pricing-headline { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 700; color: var(--color-text, #1c1917); margin: 0 0 1rem; }
.pricing-subheadline { font-family: var(--font-body, system-ui, sans-serif); font-size: 1.125rem; color: var(--color-text-muted, #78716c); max-width: 680px; margin: 0 auto; line-height: 1.6; }
.pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; align-items: stretch; }
.pricing-card { position: relative; display: flex; flex-direction: column; padding: 2.5rem 2rem; background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #e7e5e4); border-radius: var(--border-radius, 8px); box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.05)); box-sizing: border-box; }
.pricing-card.is-featured { border-color: var(--color-accent, #991b1b); box-shadow: 0 0 0 2px var(--color-accent, #991b1b), var(--box-shadow, 0 8px 16px rgba(0, 0, 0, 0.1)); }
.pricing-badge { position: absolute; top: -12px; right: 24px; padding: 0.25rem 0.75rem; background: var(--color-accent, #991b1b); color: #ffffff; font-family: var(--font-body, system-ui, sans-serif); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 9999px; }
.pricing-plan-name { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: 1.5rem; font-weight: 700; color: var(--color-text, #1c1917); margin: 0 0 0.5rem; }
.pricing-plan-desc { font-family: var(--font-body, system-ui, sans-serif); font-size: 0.95rem; color: var(--color-text-muted, #78716c); margin: 0 0 1.5rem; line-height: 1.5; }
.pricing-price-wrap { display: flex; align-items: baseline; gap: 0.35rem; margin-bottom: 2rem; }
.pricing-price { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: 2.5rem; font-weight: 800; color: var(--color-text, #1c1917); line-height: 1; }
.pricing-period { font-family: var(--font-body, system-ui, sans-serif); font-size: 0.95rem; color: var(--color-text-muted, #78716c); }
.pricing-features { flex: 1; margin-bottom: 2rem; border-top: 1px solid color-mix(in srgb, var(--color-border, #e7e5e4) 60%, transparent); padding-top: 1.5rem; }
.pricing-features-text { font-family: var(--font-body, system-ui, sans-serif); font-size: 0.95rem; line-height: 1.8; color: var(--color-text, #1c1917); margin: 0; white-space: pre-line; }
.pricing-btn { display: block; text-align: center; padding: 0.875rem 1.5rem; background: var(--color-accent, #991b1b); color: #ffffff; text-decoration: none; font-family: var(--font-body, system-ui, sans-serif); font-weight: 600; border-radius: var(--border-radius, 6px); transition: opacity 0.15s ease, transform 0.15s ease; }
.pricing-btn:hover { opacity: 0.9; transform: translateY(-1px); }
@media (max-width: 768px) { .section-pricing { padding: 3rem 1.25rem; } .pricing-card { padding: 2rem 1.5rem; } }',
    '["section-pricing","pricing-header","pricing-headline","pricing-subheadline","pricing-grid","pricing-card","is-featured","pricing-badge","pricing-plan-name","pricing-plan-desc","pricing-price-wrap","pricing-price","pricing-period","pricing-features","pricing-features-text","pricing-btn"]',
    1
)
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    schema_json = excluded.schema_json,
    template_html = excluded.template_html,
    template_css = excluded.template_css,
    css_classes_json = excluded.css_classes_json,
    is_locked = excluded.is_locked,
    updated_at = CURRENT_TIMESTAMP;

-- 1b) Stats Bar
INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked)
VALUES (
    'stats',
    'Stats Bar',
    'High-impact numeric metrics with labels and optional descriptions.',
    '[{"name":"headline","type":"text","label":"Headline","required":false},{"name":"stats","type":"list","label":"Key Metrics","required":true,"fields":[{"name":"value","type":"text","label":"Metric Value (e.g. 99.9%)","required":true},{"name":"label","type":"text","label":"Metric Label","required":true},{"name":"description","type":"text","label":"Description","required":false}]}]',
    '<section class="section-stats">
  <div class="stats-container">
    {% if headline %}<h2 class="stats-headline">{{ headline }}</h2>{% endif %}
    <div class="stats-grid">
      {% for stat in stats %}
      <div class="stat-card">
        <span class="stat-value">{{ stat.value }}</span>
        <span class="stat-label">{{ stat.label }}</span>
        {% if stat.description %}<p class="stat-desc">{{ stat.description }}</p>{% endif %}
      </div>
      {% endfor %}
    </div>
  </div>
</section>',
    '.section-stats { background: color-mix(in srgb, var(--color-accent, #991b1b) 5%, var(--color-bg, #faf8f5)); border-top: 1px solid color-mix(in srgb, var(--color-border, #e7e5e4) 60%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--color-border, #e7e5e4) 60%, transparent); padding: 5rem 2rem; box-sizing: border-box; width: 100%; }
.stats-container { max-width: 1200px; margin: 0 auto; }
.stats-headline { text-align: center; margin: 0 0 3rem; font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(1.75rem, 3vw, 2.25rem); font-weight: 700; color: var(--color-text, #1c1917); }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 2rem; text-align: center; }
.stat-card { padding: 2rem 1.5rem; background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #e7e5e4); border-radius: var(--border-radius, 8px); box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.05)); box-sizing: border-box; }
.stat-value { display: block; font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(2.5rem, 5vw, 3.5rem); font-weight: 800; color: var(--color-accent, #991b1b); line-height: 1.1; margin-bottom: 0.5rem; }
.stat-label { display: block; font-family: var(--font-body, system-ui, sans-serif); font-size: 1.05rem; font-weight: 600; color: var(--color-text, #1c1917); margin-bottom: 0.5rem; }
.stat-desc { font-family: var(--font-body, system-ui, sans-serif); font-size: 0.9rem; color: var(--color-text-muted, #78716c); margin: 0; line-height: 1.5; }
@media (max-width: 768px) { .section-stats { padding: 3rem 1.25rem; } .stat-card { padding: 1.5rem 1rem; } }',
    '["section-stats","stats-container","stats-headline","stats-grid","stat-card","stat-value","stat-label","stat-desc"]',
    1
)
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    schema_json = excluded.schema_json,
    template_html = excluded.template_html,
    template_css = excluded.template_css,
    css_classes_json = excluded.css_classes_json,
    is_locked = excluded.is_locked,
    updated_at = CURRENT_TIMESTAMP;

-- 1c) Logo Cloud
INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked)
VALUES (
    'logo-cloud',
    'Logo Cloud',
    'Responsive row or grid of partner, sponsor, or client logos.',
    '[{"name":"title","type":"text","label":"Section Title","required":false},{"name":"logos","type":"list","label":"Logos","required":true,"fields":[{"name":"name","type":"text","label":"Company / Partner Name","required":true},{"name":"image","type":"image","label":"Logo Image (SVG/PNG/WebP)","required":true},{"name":"url","type":"url","label":"Website URL","required":false}]}]',
    '<section class="section-logo-cloud">
  <div class="logo-cloud-container">
    {% if title %}<h2 class="logo-cloud-title">{{ title }}</h2>{% endif %}
    <div class="logo-cloud-grid">
      {% for logo in logos %}
      <div class="logo-cloud-item">
        {% if logo.url %}<a href="{{ logo.url|safe }}" target="_blank" rel="noopener noreferrer" class="logo-cloud-link">{% endif %}
        <img src="{{ logo.image|safe }}" alt="{{ logo.name }}" class="logo-cloud-img" loading="lazy" decoding="async">
        {% if logo.url %}</a>{% endif %}
      </div>
      {% endfor %}
    </div>
  </div>
</section>',
    '.section-logo-cloud { padding: 4rem 2rem; box-sizing: border-box; width: 100%; border-top: 1px solid color-mix(in srgb, var(--color-border, #e7e5e4) 60%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--color-border, #e7e5e4) 60%, transparent); }
.logo-cloud-container { max-width: 1200px; margin: 0 auto; text-align: center; }
.logo-cloud-title { font-family: var(--font-body, system-ui, sans-serif); font-size: 0.875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-text-muted, #78716c); margin: 0 0 2.5rem; }
.logo-cloud-grid { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 3rem 4rem; }
.logo-cloud-item { display: flex; align-items: center; justify-content: center; }
.logo-cloud-link { display: inline-flex; align-items: center; justify-content: center; opacity: 0.7; transition: opacity 0.2s ease, transform 0.2s ease; }
.logo-cloud-link:hover { opacity: 1; transform: scale(1.05); }
.logo-cloud-img { max-height: 40px; width: auto; max-width: 150px; object-fit: contain; filter: grayscale(100%); opacity: 0.75; transition: filter 0.2s ease, opacity 0.2s ease; }
.logo-cloud-item:hover .logo-cloud-img { filter: grayscale(0%); opacity: 1; }
@media (max-width: 768px) { .section-logo-cloud { padding: 2.5rem 1.25rem; } .logo-cloud-grid { gap: 2rem 2.5rem; } }',
    '["section-logo-cloud","logo-cloud-container","logo-cloud-title","logo-cloud-grid","logo-cloud-item","logo-cloud-link","logo-cloud-img"]',
    1
)
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    schema_json = excluded.schema_json,
    template_html = excluded.template_html,
    template_css = excluded.template_css,
    css_classes_json = excluded.css_classes_json,
    is_locked = excluded.is_locked,
    updated_at = CURRENT_TIMESTAMP;

-- 1d) Team Grid
INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked)
VALUES (
    'team',
    'Team Grid',
    'Showcase team members, contributors, or leadership with photos, roles, bios, and links.',
    '[{"name":"headline","type":"text","label":"Headline","required":false},{"name":"subheadline","type":"textarea","label":"Subheadline","required":false},{"name":"members","type":"list","label":"Team Members","required":true,"fields":[{"name":"name","type":"text","label":"Full Name","required":true},{"name":"role","type":"text","label":"Role / Title","required":true},{"name":"bio","type":"textarea","label":"Short Bio","required":false},{"name":"avatar","type":"image","label":"Profile Photo","required":true},{"name":"social_url","type":"url","label":"Social / Profile URL","required":false},{"name":"social_label","type":"text","label":"Social Label (e.g. LinkedIn, GitHub)","required":false}]}]',
    '<section class="section-team">
  <div class="team-header">
    {% if headline %}<h2 class="team-headline">{{ headline }}</h2>{% endif %}
    {% if subheadline %}<p class="team-subheadline">{{ subheadline }}</p>{% endif %}
  </div>
  <div class="team-grid">
    {% for member in members %}
    <div class="team-card">
      <div class="team-avatar-wrap">
        <img src="{{ member.avatar|safe }}" alt="{{ member.name }}" class="team-avatar" loading="lazy" decoding="async">
      </div>
      <h3 class="team-name">{{ member.name }}</h3>
      <span class="team-role">{{ member.role }}</span>
      {% if member.bio %}<p class="team-bio">{{ member.bio }}</p>{% endif %}
      {% if member.social_url %}
      <a href="{{ member.social_url|safe }}" target="_blank" rel="noopener noreferrer" class="team-social-link">
        {% if member.social_label %}{{ member.social_label }}{% else %}Profile &rarr;{% endif %}
      </a>
      {% endif %}
    </div>
    {% endfor %}
  </div>
</section>',
    '.section-team { padding: 5rem 2rem; box-sizing: border-box; width: 100%; max-width: 1200px; margin: 0 auto; }
.team-header { text-align: center; margin-bottom: 3.5rem; }
.team-headline { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 700; color: var(--color-text, #1c1917); margin: 0 0 1rem; }
.team-subheadline { font-family: var(--font-body, system-ui, sans-serif); font-size: 1.125rem; color: var(--color-text-muted, #78716c); max-width: 680px; margin: 0 auto; line-height: 1.6; }
.team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 2.5rem 2rem; }
.team-card { text-align: center; background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #e7e5e4); border-radius: var(--border-radius, 8px); padding: 2.5rem 1.5rem; box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.05)); box-sizing: border-box; }
.team-avatar-wrap { width: 120px; height: 120px; margin: 0 auto 1.5rem; border-radius: 50%; overflow: hidden; border: 3px solid var(--color-border, #e7e5e4); }
.team-avatar { width: 100%; height: 100%; object-fit: cover; display: block; }
.team-name { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: 1.35rem; font-weight: 700; color: var(--color-text, #1c1917); margin: 0 0 0.35rem; }
.team-role { display: block; font-family: var(--font-body, system-ui, sans-serif); font-size: 0.9rem; font-weight: 600; color: var(--color-accent, #991b1b); margin-bottom: 1rem; }
.team-bio { font-family: var(--font-body, system-ui, sans-serif); font-size: 0.9rem; line-height: 1.6; color: var(--color-text-muted, #78716c); margin: 0 0 1.25rem; }
.team-social-link { display: inline-block; font-family: var(--font-body, system-ui, sans-serif); font-size: 0.85rem; font-weight: 600; color: var(--color-text, #1c1917); text-decoration: none; border-bottom: 1px solid var(--color-border, #e7e5e4); padding-bottom: 2px; transition: color 0.15s ease, border-color 0.15s ease; }
.team-social-link:hover { color: var(--color-accent, #991b1b); border-color: var(--color-accent, #991b1b); }
@media (max-width: 768px) { .section-team { padding: 3rem 1.25rem; } .team-card { padding: 2rem 1.25rem; } }',
    '["section-team","team-header","team-headline","team-subheadline","team-grid","team-card","team-avatar-wrap","team-avatar","team-name","team-role","team-bio","team-social-link"]',
    1
)
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    schema_json = excluded.schema_json,
    template_html = excluded.template_html,
    template_css = excluded.template_css,
    css_classes_json = excluded.css_classes_json,
    is_locked = excluded.is_locked,
    updated_at = CURRENT_TIMESTAMP;

-- 1e) Process Steps
INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked)
VALUES (
    'steps',
    'Process Steps',
    'Numbered sequence of steps or milestones detailing a process or roadmap.',
    '[{"name":"headline","type":"text","label":"Headline","required":false},{"name":"subheadline","type":"textarea","label":"Subheadline","required":false},{"name":"steps","type":"list","label":"Process Steps","required":true,"fields":[{"name":"step_number","type":"text","label":"Step Number (e.g. 01)","required":true},{"name":"title","type":"text","label":"Title","required":true},{"name":"description","type":"textarea","label":"Description","required":true},{"name":"link_text","type":"text","label":"Link Text","required":false},{"name":"link_url","type":"url","label":"Link URL","required":false}]}]',
    '<section class="section-steps">
  <div class="steps-header">
    {% if headline %}<h2 class="steps-headline">{{ headline }}</h2>{% endif %}
    {% if subheadline %}<p class="steps-subheadline">{{ subheadline }}</p>{% endif %}
  </div>
  <div class="steps-grid">
    {% for step in steps %}
    <div class="step-card">
      <div class="step-number-wrap">
        <span class="step-number">{{ step.step_number }}</span>
      </div>
      <h3 class="step-title">{{ step.title }}</h3>
      <p class="step-description">{{ step.description }}</p>
      {% if step.link_url and step.link_text %}
      <a href="{{ step.link_url|safe }}" class="step-link">{{ step.link_text }} &rarr;</a>
      {% endif %}
    </div>
    {% endfor %}
  </div>
</section>',
    '.section-steps { padding: 5rem 2rem; box-sizing: border-box; width: 100%; max-width: 1200px; margin: 0 auto; }
.steps-header { text-align: center; margin-bottom: 3.5rem; }
.steps-headline { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 700; color: var(--color-text, #1c1917); margin: 0 0 1rem; }
.steps-subheadline { font-family: var(--font-body, system-ui, sans-serif); font-size: 1.125rem; color: var(--color-text-muted, #78716c); max-width: 680px; margin: 0 auto; line-height: 1.6; }
.steps-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; }
.step-card { position: relative; padding: 2.5rem 2rem; background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #e7e5e4); border-radius: var(--border-radius, 8px); box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.05)); box-sizing: border-box; }
.step-number-wrap { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: color-mix(in srgb, var(--color-accent, #991b1b) 12%, transparent); border-radius: var(--border-radius, 6px); margin-bottom: 1.5rem; }
.step-number { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: 1.25rem; font-weight: 800; color: var(--color-accent, #991b1b); }
.step-title { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: 1.35rem; font-weight: 700; color: var(--color-text, #1c1917); margin: 0 0 0.75rem; }
.step-description { font-family: var(--font-body, system-ui, sans-serif); font-size: 0.95rem; line-height: 1.6; color: var(--color-text-muted, #78716c); margin: 0 0 1.25rem; }
.step-link { display: inline-block; font-family: var(--font-body, system-ui, sans-serif); font-size: 0.9rem; font-weight: 600; color: var(--color-accent, #991b1b); text-decoration: none; transition: transform 0.15s ease; }
.step-link:hover { transform: translateX(3px); }
@media (max-width: 768px) { .section-steps { padding: 3rem 1.25rem; } .step-card { padding: 2rem 1.5rem; } }',
    '["section-steps","steps-header","steps-headline","steps-subheadline","steps-grid","step-card","step-number-wrap","step-number","step-title","step-description","step-link"]',
    1
)
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    schema_json = excluded.schema_json,
    template_html = excluded.template_html,
    template_css = excluded.template_css,
    css_classes_json = excluded.css_classes_json,
    is_locked = excluded.is_locked,
    updated_at = CURRENT_TIMESTAMP;

-- 2. Seed /theme-preview page entry with all 15 preset section templates
INSERT INTO entries (slug, title, type, status, path, sort_order, search_text, published_at, body_html, body_json) VALUES (
    'theme-preview',
    'Theme & Section Showcase',
    'page',
    'published',
    '/theme-preview',
    10,
    'Theme Section Showcase Hero Text Gallery Carousel Features Testimonial FAQ Video Embed Pricing Stats Logo Cloud Team Steps',
    CURRENT_TIMESTAMP,
    '',
    '[{"type_id": "hero", "data": {"headline": "Designing Autonomous Systems with Elegance", "subheadline": "An exploration into next-generation edge architecture, fluid editorial layouts, and reactive AI pair programming.", "button_text": "Explore Documentation", "button_url": "/docs", "image": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80", "video_url": ""}}, {"type_id": "text", "data": {"title": "The Philosophy of Edge-First Publishing", "body": "<p>Traditional web architectures impose significant latency and infrastructure overhead. By compiling content representations at the edge with zero-cold-start runtimes, Zygo CMS provides instant page loads and real-time updates without database connection pooling bottlenecks.</p><p>Every layout adheres strictly to typographic hierarchy, accessible focus states, and dynamic contrast ratios.</p>"}}, {"type_id": "text-image", "data": {"title": "Engineered for Extreme Performance", "body": "<p>By pairing Cloudflare Workers and D1 with Rust-compiled Wasm templates, content is hydrated with near-zero latency worldwide.</p><p>All assets are cached intelligently at the network edge, with automatic invalidation across canonical URLs whenever revisions are published.</p>", "image": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80", "image_position": "right"}}, {"type_id": "gallery", "data": {"title": "Visual Design & System Architecture", "images": [{"image": "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80", "caption": "Clean Minimalist Typography"}, {"image": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80", "caption": "Rust WebAssembly Core"}, {"image": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80", "caption": "Real-Time Telemetry & Metrics"}]}}, {"type_id": "image-carousel", "data": {"title": "Curated Workspaces & Editorial Showcase", "slides": [{"image": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1000&q=80", "caption": "Developer Workspace & CLI Tools"}, {"image": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80", "caption": "Collaborative Pair Programming Sessions"}, {"image": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1000&q=80", "caption": "High Velocity Delivery Pipeline"}]}}, {"type_id": "call-to-action", "data": {"heading": "Ready to Transform Your Content Workflow?", "text": "Join leading publishers and developers building lightning-fast modern publications with Zygo CMS.", "button_label": "Get Started Today", "button_url": "/docs/quickstart"}}, {"type_id": "feature-grid", "data": {"title": "Core Capabilities", "features": [{"title": "Edge-Rendered SSR", "description": "Sub-50ms TTFB delivered globally using Cloudflare D1 and Rust micro-runtimes.", "icon": ""}, {"title": "WebMCP Agent Parity", "description": "Every human UI action can be orchestrated programmatically by autonomous AI coding agents.", "icon": ""}, {"title": "Dynamic Theming Engine", "description": "Tokenized color-mix, font presets, and fluid typography that adapt without rebuilding.", "icon": ""}]}}, {"type_id": "testimonial", "data": {"quote": "Zygo CMS represents the rare union of uncompromising editorial aesthetics and blistering edge performance. It has transformed how our team publishes.", "author": "Elena Rostova", "role": "Head of Engineering, Monolith Media", "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80"}}, {"type_id": "faq", "data": {"title": "Frequently Asked Questions", "questions": [{"question": "How does Zygo CMS handle database migrations?", "answer": "<p>Zygo CMS uses Cloudflare D1 with strict expand/contract migrations, explicit column selection, and immutable revision logging for zero downtime.</p>"}, {"question": "Can custom section templates be created in the Admin UI?", "answer": "<p>Yes. The visual Template Editor allows creating custom MiniJinja section templates with dynamic field builders and server-side syntax validation.</p>"}, {"question": "How does theme switching work?", "answer": "<p>Themes are defined using CSS custom properties on <code>:root</code>. Switching active themes updates these tokens in real-time across both editorial posts and modular page sections.</p>"}]}}, {"type_id": "video-embed", "data": {"title": "Platform Architecture Walkthrough", "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}}, {"type_id": "pricing", "data": {"headline": "Simple, Predictable Pricing", "subheadline": "Choose the perfect plan for your publication, from solo creators to global media teams.", "plans": [{"name": "Starter", "price": "$0", "period": "/ month", "description": "Essential publishing tools for indie creators and developers.", "features": "Unlimited edge SSR requests\nUp to 100 published pages\nCommunity Discord support\nStandard CSS themes", "button_text": "Start Free", "button_url": "/signup", "is_featured": false, "badge_text": ""}, {"name": "Professional", "price": "$29", "period": "/ month", "description": "Advanced edge capabilities and AI agent orchestration for growing teams.", "features": "Unlimited pages & media\nFull WebMCP & CLI MCP agent access\nCustom section templates\nPriority edge cache purging\nDedicated email support", "button_text": "Get Started", "button_url": "/signup?plan=pro", "is_featured": true, "badge_text": "Most Popular"}, {"name": "Enterprise", "price": "$99", "period": "/ month", "description": "Dedicated infrastructure, SLA guarantees, and custom integrations.", "features": "Dedicated Cloudflare D1 database\nCustom Wasm micro-runtimes\n99.99% uptime SLA\n24/7 technical phone support\nCustom SSO & Cloudflare Access", "button_text": "Contact Sales", "button_url": "/contact", "is_featured": false, "badge_text": ""}]}}, {"type_id": "stats", "data": {"headline": "Engineered for Zero Cold Starts", "stats": [{"value": "<25ms", "label": "Edge TTFB", "description": "Delivered across 300+ Cloudflare global edge locations."}, {"value": "100%", "label": "GDPR Compliant", "description": "Zero client-side tracking cookies or layout shifts."}, {"value": "15+", "label": "Modular Presets", "description": "Responsive MiniJinja section templates out of the box."}, {"value": "99.99%", "label": "Uptime SLA", "description": "Decoupled edge architecture with zero database connection pools."}]}}, {"type_id": "logo-cloud", "data": {"title": "Trusted by Next-Generation Media Leaders", "logos": [{"name": "Cloudflare", "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&h=80&q=80", "url": "https://cloudflare.com"}, {"name": "Rust Foundation", "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&h=80&q=80", "url": "https://rust-lang.org"}, {"name": "WasmEdge", "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&h=80&q=80", "url": "https://wasmedge.org"}, {"name": "Radix Themes", "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&h=80&q=80", "url": "https://radix-ui.com"}]}}, {"type_id": "team", "data": {"headline": "Meet the Core Maintainers", "subheadline": "Architects, engineers, and designers building the future of edge-native editorial publishing.", "members": [{"name": "Dr. Sarah Chen", "role": "Systems Architect", "bio": "Specializing in distributed systems, WebAssembly runtimes, and low-latency edge storage architectures.", "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&h=300&q=80", "social_url": "https://github.com", "social_label": "GitHub"}, {"name": "Marcus Aurelius Vance", "role": "Lead Product Designer", "bio": "Obsessed with editorial typography, design token pipelines, and intuitive authoring experiences.", "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&h=300&q=80", "social_url": "https://twitter.com", "social_label": "X / Twitter"}, {"name": "Amina Morales", "role": "AI Integrations Engineer", "bio": "Driving model context protocols, human-agent UI parity, and reactive pair programming workflows.", "avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&h=300&q=80", "social_url": "https://linkedin.com", "social_label": "LinkedIn"}]}}, {"type_id": "steps", "data": {"headline": "How Zygo CMS Works", "subheadline": "From initial scaffolding to global distribution in under ten minutes.", "steps": [{"step_number": "01", "title": "Clone & Configure", "description": "Scaffold your workspace with our zero-setup CLI tool and link your Cloudflare D1 database.", "link_text": "Read Setup Guide", "link_url": "/docs"}, {"step_number": "02", "title": "Choose Your Design Tokens", "description": "Customize your publication theme with live CSS custom property previews and typography pairings.", "link_text": "Browse Themes", "link_url": "/themes"}, {"step_number": "03", "title": "Compose Sections", "description": "Mix and match 15 responsive preset section templates or create bespoke MiniJinja components.", "link_text": "Explore Templates", "link_url": "/templates"}, {"step_number": "04", "title": "Publish Globally", "description": "Deploy instantly to the Cloudflare edge network with automated canonical cache invalidation.", "link_text": "Deploy Now", "link_url": "/deploy"}]}}]'
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

-- 3. Remove Theme Preview link from footer navigation menu
UPDATE menus 
SET items_json = COALESCE(
    (SELECT json_group_array(json(value)) 
     FROM json_each(menus.items_json) 
     WHERE json_extract(value, '$.url') != '/theme-preview'),
    '[]'
)
WHERE name = 'footer' AND items_json LIKE '%/theme-preview%';
