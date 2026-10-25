-- Migration: 0015_layout_templates_theme_switcher.sql
-- Description: Update layout_templates (post, doc, page) to include zero-FOUC script and theme switcher, and fix broken logo media reference in open-source entry.

-- 1. Insert theme_fouc_script before </head> in layout_templates
UPDATE layout_templates
SET template_html = REPLACE(
    template_html,
    '    {% if template_css %}
    <style>{{ template_css|safe }}</style>
    {% endif %}
</head>',
    '    {% if template_css %}
    <style>{{ template_css|safe }}</style>
    {% endif %}
    {% if theme_fouc_script %}
    {{ theme_fouc_script|safe }}
    {% endif %}
</head>'
)
WHERE INSTR(template_html, '{% if theme_fouc_script %}') = 0;

-- 2. Insert theme_switcher_html inside <header> in layout_templates
UPDATE layout_templates
SET template_html = REPLACE(
    template_html,
    '        </nav>
    </header>',
    '        </nav>
        {% if theme_switcher_html %}
        {{ theme_switcher_html|safe }}
        {% endif %}
    </header>'
)
WHERE INSTR(template_html, '{% if theme_switcher_html %}') = 0;

-- 3. Fix broken logo media reference in open-source entry
UPDATE entries
SET body_json = REPLACE(
    body_json,
    '/media/1792013603321-logo_prints_light.svg',
    '/media/1792530135426-logo_prints_light.webp'
)
WHERE id = 5;
