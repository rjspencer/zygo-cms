-- Migration: 0014_themes_table.sql
-- Description: Create themes table for theme records, seed built-in presets (modern-editorial, bento-brutalism, bento-brutalism-dark), set default theme_primary_id setting, and update layout templates to support light/dark site logos.

CREATE TABLE IF NOT EXISTS themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    tokens_json TEXT NOT NULL,
    is_locked INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed baseline built-in presets with is_locked = 1
INSERT OR IGNORE INTO themes (id, name, description, tokens_json, is_locked)
VALUES
    (
        'modern-editorial',
        'Modern Editorial',
        'Modern editorial typography with warm tones',
        '{"fontUrl":"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&display=swap","fontHeadline":"''Newsreader'', Georgia, serif","fontBody":"''Inter'', -apple-system, BlinkMacSystemFont, sans-serif","colorBg":"#faf8f5","colorText":"#1c1917","colorTextMuted":"#78716c","colorAccent":"#991b1b","colorSurface":"#ffffff","colorBorder":"#e7e5e4","maxWidth":"1920px","fontSizeBase":"18px","lineHeightBody":"1.75","headerLayout":"centered","headerBorderStyle":"double","headerTitleSize":"2rem","headerNavTransform":"uppercase","headerPadding":"1.75rem 2rem 1.25rem 2rem","headerTagline":"","borderRadius":"8px","boxShadow":"0 4px 6px rgba(0, 0, 0, 0.1)"}',
        1
    ),
    (
        'bento-brutalism',
        'Bento-Brutalism',
        'Clean lines with stark brutalist borders',
        '{"fontUrl":"https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap","fontHeadline":"''Space Grotesk'', -apple-system, BlinkMacSystemFont, sans-serif","fontBody":"''Inter'', -apple-system, BlinkMacSystemFont, sans-serif","colorBg":"#f6f5f0","colorText":"#0f172a","colorTextMuted":"#334155","colorAccent":"#007799","colorSurface":"#ffffff","colorBorder":"#0f172a","maxWidth":"1920px","fontSizeBase":"16px","lineHeightBody":"1.5","headerLayout":"split","headerBorderStyle":"solid","headerTitleSize":"1.5rem","headerNavTransform":"uppercase","headerPadding":"1.25rem 2rem","headerTagline":"","borderRadius":"2px","boxShadow":"4px 6px 0 #0f172a"}',
        1
    ),
    (
        'bento-brutalism-dark',
        'Bento-Brutalism (Dark)',
        'High-contrast dark variant with glowing cyan accents',
        '{"fontUrl":"https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap","fontHeadline":"''Space Grotesk'', -apple-system, BlinkMacSystemFont, sans-serif","fontBody":"''Inter'', -apple-system, BlinkMacSystemFont, sans-serif","colorBg":"#0b0f19","colorText":"#f8fafc","colorTextMuted":"#94a3b8","colorAccent":"#38bdf8","colorSurface":"#151d2f","colorBorder":"#334155","maxWidth":"1920px","fontSizeBase":"16px","lineHeightBody":"1.5","headerLayout":"split","headerBorderStyle":"solid","headerTitleSize":"1.5rem","headerNavTransform":"uppercase","headerPadding":"1.25rem 2rem","headerTagline":"","borderRadius":"2px","boxShadow":"4px 6px 0 #000000"}',
        1
    );

-- Seed default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('theme_primary_id', 'modern-editorial');

-- Update layout_templates table to use .site-logo-light and .site-logo-dark markup
UPDATE layout_templates
SET template_html = REPLACE(
    template_html,
    '<a href="/" class="site-title">{% if site_logo %}{% if site_logo_dark %}<picture class="site-logo-picture"><source srcset="{{ site_logo_dark|safe }}" media="(prefers-color-scheme: dark)"><img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo"></picture>{% else %}<img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo">{% endif %}{% elif site_logo_dark %}<img src="{{ site_logo_dark|safe }}" alt="{{ site_title }}" class="site-logo">{% else %}{{ site_title }}{% endif %}</a>',
    '<a href="/" class="site-title">{% if site_logo %}<img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo site-logo-light">{% if site_logo_dark %}<img src="{{ site_logo_dark|safe }}" alt="{{ site_title }}" class="site-logo site-logo-dark">{% endif %}{% elif site_logo_dark %}<img src="{{ site_logo_dark|safe }}" alt="{{ site_title }}" class="site-logo site-logo-dark">{% else %}{{ site_title }}{% endif %}</a>'
)
WHERE INSTR(template_html, '<picture class="site-logo-picture">') > 0;
