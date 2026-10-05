-- Zygo CMS Initial Schema (Squashed Migrations 0001 - 0013)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auth_provider_id TEXT UNIQUE NOT NULL,
    email TEXT,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'author',
    bio TEXT,
    website TEXT,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

-- 2. Entries Table
CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'post',         -- 'post' or 'page'
    status TEXT NOT NULL DEFAULT 'published',  -- 'draft' or 'published'
    description TEXT,
    cover_image TEXT,
    canonical_url TEXT,
    schema_json TEXT,
    category TEXT,
    tags TEXT,
    published_at DATETIME,
    body_html TEXT NOT NULL,
    body_json TEXT NOT NULL,
    custom_fields_json TEXT,
    parent_id INTEGER REFERENCES entries(id),
    path TEXT,
    sort_order INTEGER DEFAULT 0,
    author_id INTEGER REFERENCES users(id),
    search_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_path ON entries(path);
CREATE INDEX IF NOT EXISTS idx_entries_parent_id ON entries(parent_id);
CREATE INDEX IF NOT EXISTS idx_entries_deleted_at ON entries(deleted_at);
CREATE INDEX IF NOT EXISTS idx_entries_status_deleted ON entries(status, deleted_at);

-- 3. Entry Revisions Table
CREATE TABLE IF NOT EXISTS entry_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    cover_image TEXT,
    body_html TEXT NOT NULL,
    body_json TEXT NOT NULL,
    custom_fields_json TEXT,
    category TEXT,
    tags TEXT,
    preview_token TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_revisions_entry_id ON entry_revisions(entry_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_revisions_preview_token ON entry_revisions(preview_token);
CREATE INDEX IF NOT EXISTS idx_revisions_created_at ON entry_revisions(created_at);

-- 4. Media Table
CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_filename ON media(filename);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at);

-- 5. Menus Table
CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    items_json TEXT NOT NULL DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO menus (name, items_json) VALUES 
('header', '[{"title":"Home","url":"/","target":"_self","children":[]}]'),
('footer', '[]');

-- 6. Settings Table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings (key, value) VALUES ('analytics_enabled', 'false');

-- 7. FTS5 Search Index & Triggers
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
    title,
    description,
    content,
    content='entries',
    content_rowid='id',
    tokenize='porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
    INSERT INTO search_index(rowid, title, description, content) 
    VALUES (new.id, new.title, new.description, new.search_text);
END;

CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
    INSERT INTO search_index(search_index, rowid, title, description, content) 
    VALUES ('delete', old.id, old.title, old.description, old.search_text);
END;

CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON entries BEGIN
    INSERT INTO search_index(search_index, rowid, title, description, content) 
    VALUES ('delete', old.id, old.title, old.description, old.search_text);
    INSERT INTO search_index(rowid, title, description, content) 
    VALUES (new.id, new.title, new.description, new.search_text);
END;

-- 8. Initial Seed Entries
INSERT INTO entries (slug, title, type, status, category, tags, path, sort_order, search_text, published_at, body_html, body_json) VALUES (
    'hello-world',
    'Hello World!',
    'post',
    'published',
    'General',
    'welcome, cms',
    '/post/hello-world',
    0,
    'Hello Welcome to Zygo CMS.',
    CURRENT_TIMESTAMP,
    '<h1>Hello</h1><p>Welcome to Zygo CMS.</p>',
    '{}'
);

INSERT INTO entries (slug, title, type, status, path, sort_order, search_text, published_at, body_html, body_json) VALUES (
    'about',
    'About Us',
    'page',
    'published',
    '/about',
    0,
    'About This is a static page powered by Zygo CMS.',
    CURRENT_TIMESTAMP,
    '<h1>About</h1><p>This is a static page powered by Zygo CMS.</p>',
    '{}'
);

-- 9. Section Templates Table
CREATE TABLE IF NOT EXISTS section_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    schema_json TEXT NOT NULL DEFAULT '[]',
    template_html TEXT,
    template_css TEXT,
    css_classes_json TEXT DEFAULT '[]',
    is_locked BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Seed Built-In Section Templates (10 Built-ins)
-- 1) Hero
INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked) VALUES (
    'hero',
    'Hero',
    'Eye-catching hero section with heading, subheading, call-to-action button, and background or featured image.',
    '[{"name":"headline","type":"text","label":"Headline","required":true},{"name":"subheadline","type":"textarea","label":"Subheadline","required":false},{"name":"button_text","type":"text","label":"Button Text","required":false},{"name":"button_url","type":"url","label":"Button URL","required":false},{"name":"image","type":"image","label":"Image","required":false}]',
    '<section class="section-hero">
  <div class="hero-content">
    <h1>{{ headline }}</h1>
    {% if subheadline %}<p class="hero-subheadline">{{ subheadline }}</p>{% endif %}
    {% if button_text and button_url %}<a href="{{ button_url|safe }}" class="hero-btn">{{ button_text }}</a>{% endif %}
  </div>
  {% if image %}<div class="hero-image"><img src="{{ image|safe }}" alt="{{ headline }}"></div>{% endif %}
</section>',
    '.section-hero { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 1.5rem; text-align: center; }
.hero-content { max-width: 800px; margin: 0 auto; }
.hero-subheadline { font-size: 1.25rem; color: #666; margin: 1rem 0; }
.hero-btn { display: inline-block; padding: 0.75rem 1.5rem; background: #000; color: #fff; text-decoration: none; border-radius: 4px; }
.hero-image img { max-width: 100%; height: auto; margin-top: 2rem; border-radius: 8px; }',
    '["section-hero","hero-content","hero-subheadline","hero-btn","hero-image"]',
    1
);

-- 2) Text
INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked) VALUES (
    'text',
    'Text',
    'Simple text section for rich content and articles.',
    '[{"name":"title","type":"text","label":"Title","required":false},{"name":"body","type":"richtext","label":"Content","required":true}]',
    '<section class="section-text">
  <div class="text-container">
    {% if title %}<h2>{{ title }}</h2>{% endif %}
    <div class="text-prose">{{ body|safe }}</div>
  </div>
</section>',
    '.section-text { padding: 3rem 1.5rem; }
.text-container { max-width: 720px; margin: 0 auto; }
.text-prose { line-height: 1.7; }',
    '["section-text","text-container","text-prose"]',
    1
);

-- 3) Text + Image
INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked) VALUES (
    'text-image',
    'Text + Image',
    'Two-column section pairing text with an accompanying image.',
    '[{"name":"title","type":"text","label":"Title","required":true},{"name":"body","type":"richtext","label":"Content","required":true},{"name":"image","type":"image","label":"Image","required":true},{"name":"image_position","type":"select","label":"Image Position","required":false,"options":["right","left"]}]',
    '<section class="section-text-image image-{{ image_position }}">
  <div class="text-image-container">
    <div class="text-image-content">
      <h2>{{ title }}</h2>
      <div class="text-image-prose">{{ body|safe }}</div>
    </div>
    <div class="text-image-media">
      <img src="{{ image|safe }}" alt="{{ title }}">
    </div>
  </div>
</section>',
    '.section-text-image { padding: 3rem 1.5rem; }
.text-image-container { display: flex; gap: 2rem; align-items: center; max-width: 1000px; margin: 0 auto; flex-wrap: wrap; }
.text-image-content { flex: 1; min-width: 300px; }
.text-image-media { flex: 1; min-width: 300px; }
.text-image-media img { width: 100%; height: auto; border-radius: 8px; }
.image-left .text-image-container { flex-direction: row-reverse; }',
    '["section-text-image","image-left","text-image-container","text-image-content","text-image-prose","text-image-media"]',
    1
);

-- 4) Gallery
INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked) VALUES (
    'gallery',
    'Gallery',
    'Grid of images with optional captions.',
    '[{"name":"title","type":"text","label":"Title","required":false},{"name":"images","type":"list","label":"Images","required":true,"fields":[{"name":"image","type":"image","label":"Image","required":true},{"name":"caption","type":"text","label":"Caption","required":false}]}]',
    '<section class="section-gallery">
  {% if title %}<h2 class="gallery-title">{{ title }}</h2>{% endif %}
  <div class="gallery-grid">
    {% for item in images %}
    <figure class="gallery-item">
      <img src="{{ item.image|safe }}" alt="{{ item.caption }}">
      {% if item.caption %}<figcaption>{{ item.caption }}</figcaption>{% endif %}
    </figure>
    {% endfor %}
  </div>
</section>',
    '.section-gallery { padding: 3rem 1.5rem; max-width: 1200px; margin: 0 auto; }
.gallery-title { text-align: center; margin-bottom: 2rem; }
.gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem; }
.gallery-item { margin: 0; }
.gallery-item img { width: 100%; height: 200px; object-fit: cover; border-radius: 6px; }
.gallery-item figcaption { font-size: 0.875rem; color: #666; margin-top: 0.5rem; text-align: center; }',
    '["section-gallery","gallery-title","gallery-grid","gallery-item"]',
    1
);

-- 5) Image Carousel
INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked) VALUES (
    'image-carousel',
    'Image Carousel',
    'Smooth horizontal-scrolling carousel using pure CSS scroll-snap.',
    '[{"name":"title","type":"text","label":"Title","required":false},{"name":"slides","type":"list","label":"Slides","required":true,"fields":[{"name":"image","type":"image","label":"Image","required":true},{"name":"caption","type":"text","label":"Caption","required":false}]}]',
    '<section class="section-carousel">
  {% if title %}<h2 class="carousel-title">{{ title }}</h2>{% endif %}
  <div class="carousel-track">
    {% for slide in slides %}
    <div class="carousel-slide">
      <img src="{{ slide.image|safe }}" alt="{{ slide.caption }}">
      {% if slide.caption %}<p class="carousel-caption">{{ slide.caption }}</p>{% endif %}
    </div>
    {% endfor %}
  </div>
</section>',
    '.section-carousel { padding: 3rem 1.5rem; max-width: 1000px; margin: 0 auto; }
.carousel-title { text-align: center; margin-bottom: 1.5rem; }
.carousel-track { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 1rem; padding-bottom: 1rem; scrollbar-width: thin; }
.carousel-slide { flex: 0 0 80%; max-width: 80%; scroll-snap-align: center; }
.carousel-slide img { width: 100%; height: 400px; object-fit: cover; border-radius: 8px; }
.carousel-caption { font-size: 0.875rem; color: #666; margin-top: 0.5rem; text-align: center; }',
    '["section-carousel","carousel-title","carousel-track","carousel-slide","carousel-caption"]',
    1
);

-- 6) Call to Action
INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked) VALUES (
    'call-to-action',
    'Call to Action',
    'High-impact banner to drive conversions or newsletter signups.',
    '[{"name":"heading","type":"text","label":"Heading","required":true},{"name":"text","type":"textarea","label":"Description","required":false},{"name":"button_label","type":"text","label":"Button Label","required":true},{"name":"button_url","type":"url","label":"Button URL","required":true}]',
    '<section class="section-cta">
  <div class="cta-box">
    <h2>{{ heading }}</h2>
    {% if text %}<p>{{ text }}</p>{% endif %}
    <a href="{{ button_url|safe }}" class="cta-button">{{ button_label }}</a>
  </div>
</section>',
    '.section-cta { padding: 4rem 1.5rem; }
.cta-box { background: #f4f4f5; padding: 3rem 2rem; border-radius: 12px; text-align: center; max-width: 800px; margin: 0 auto; }
.cta-box h2 { margin-top: 0; }
.cta-box p { color: #555; margin: 1rem 0 2rem; font-size: 1.125rem; }
.cta-button { display: inline-block; padding: 0.75rem 2rem; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; }',
    '["section-cta","cta-box","cta-button"]',
    1
);

-- 7) Feature Grid
INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked) VALUES (
    'feature-grid',
    'Feature Grid',
    'Showcase key features, benefits, or services in a structured grid.',
    '[{"name":"title","type":"text","label":"Title","required":false},{"name":"features","type":"list","label":"Features","required":true,"fields":[{"name":"title","type":"text","label":"Feature Title","required":true},{"name":"description","type":"textarea","label":"Description","required":true},{"name":"icon","type":"image","label":"Icon / Image","required":false}]}]',
    '<section class="section-features">
  {% if title %}<h2 class="features-heading">{{ title }}</h2>{% endif %}
  <div class="features-grid">
    {% for feature in features %}
    <div class="feature-card">
      {% if feature.icon %}<img class="feature-icon" src="{{ feature.icon|safe }}" alt="{{ feature.title }}">{% endif %}
      <h3>{{ feature.title }}</h3>
      <p>{{ feature.description }}</p>
    </div>
    {% endfor %}
  </div>
</section>',
    '.section-features { padding: 4rem 1.5rem; max-width: 1100px; margin: 0 auto; }
.features-heading { text-align: center; margin-bottom: 3rem; }
.features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; }
.feature-card { padding: 1.5rem; border: 1px solid #e4e4e7; border-radius: 8px; }
.feature-icon { width: 48px; height: 48px; margin-bottom: 1rem; }',
    '["section-features","features-heading","features-grid","feature-card","feature-icon"]',
    1
);

-- 8) Testimonial / Quote
INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked) VALUES (
    'testimonial',
    'Testimonial / Quote',
    'Customer quote or testimonial with author name, role, and avatar.',
    '[{"name":"quote","type":"textarea","label":"Quote","required":true},{"name":"author","type":"text","label":"Author Name","required":true},{"name":"role","type":"text","label":"Author Role / Title","required":false},{"name":"avatar","type":"image","label":"Avatar","required":false}]',
    '<section class="section-testimonial">
  <blockquote class="testimonial-blockquote">
    <p class="testimonial-quote">&ldquo;{{ quote }}&rdquo;</p>
    <footer class="testimonial-footer">
      {% if avatar %}<img class="testimonial-avatar" src="{{ avatar|safe }}" alt="{{ author }}">{% endif %}
      <div class="testimonial-info">
        <cite class="testimonial-author">{{ author }}</cite>
        {% if role %}<span class="testimonial-role">{{ role }}</span>{% endif %}
      </div>
    </footer>
  </blockquote>
</section>',
    '.section-testimonial { padding: 4rem 1.5rem; max-width: 800px; margin: 0 auto; }
.testimonial-blockquote { margin: 0; text-align: center; }
.testimonial-quote { font-size: 1.5rem; font-style: italic; line-height: 1.6; margin-bottom: 2rem; }
.testimonial-footer { display: flex; align-items: center; justify-content: center; gap: 1rem; }
.testimonial-avatar { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; }
.testimonial-info { text-align: left; }
.testimonial-author { font-weight: bold; font-style: normal; display: block; }
.testimonial-role { font-size: 0.875rem; color: #666; }',
    '["section-testimonial","testimonial-blockquote","testimonial-quote","testimonial-footer","testimonial-avatar","testimonial-info","testimonial-author","testimonial-role"]',
    1
);

-- 9) FAQ
INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked) VALUES (
    'faq',
    'FAQ',
    'Frequently asked questions using accessible native HTML details elements.',
    '[{"name":"title","type":"text","label":"Title","required":false},{"name":"questions","type":"list","label":"Questions","required":true,"fields":[{"name":"question","type":"text","label":"Question","required":true},{"name":"answer","type":"richtext","label":"Answer","required":true}]}]',
    '<section class="section-faq">
  {% if title %}<h2 class="faq-title">{{ title }}</h2>{% endif %}
  <div class="faq-list">
    {% for item in questions %}
    <details class="faq-item">
      <summary class="faq-question">{{ item.question }}</summary>
      <div class="faq-answer">{{ item.answer|safe }}</div>
    </details>
    {% endfor %}
  </div>
</section>',
    '.section-faq { padding: 3rem 1.5rem; max-width: 800px; margin: 0 auto; }
.faq-title { text-align: center; margin-bottom: 2rem; }
.faq-list { display: flex; flex-direction: column; gap: 1rem; }
.faq-item { border: 1px solid #e4e4e7; border-radius: 8px; padding: 1rem 1.25rem; }
.faq-question { font-weight: 600; cursor: pointer; }
.faq-answer { margin-top: 1rem; line-height: 1.6; color: #444; }',
    '["section-faq","faq-title","faq-list","faq-item","faq-question","faq-answer"]',
    1
);

-- 10) Video Embed
INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked) VALUES (
    'video-embed',
    'Video Embed',
    'Responsive video player supporting YouTube and Vimeo embeds.',
    '[{"name":"title","type":"text","label":"Title","required":false},{"name":"video_url","type":"url","label":"Video URL (YouTube or Vimeo)","required":true}]',
    '<section class="section-video">
  <div class="video-container">
    {% if title %}<h2>{{ title }}</h2>{% endif %}
    {% set embed_url = video_url|video_embed %}
    {% if embed_url %}
    <div class="video-wrapper">
      <iframe src="{{ embed_url }}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
    {% endif %}
  </div>
</section>',
    '.section-video { padding: 3rem 1.5rem; }
.video-container { max-width: 900px; margin: 0 auto; text-align: center; }
.video-wrapper { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; }
.video-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }',
    '["section-video","video-container","video-wrapper"]',
    1
);