-- Migration: 0016_layout_templates_theme_switcher_footer.sql
-- Description: Move color mode theme switcher from <header> exclusively to <footer> inside <div class="footer-nav-row"> across layout_templates (post, doc, page).

-- 1. Remove theme_switcher_html from <header> in layout_templates
UPDATE layout_templates
SET template_html = REPLACE(
    template_html,
    '        {% if theme_switcher_html %}
        {{ theme_switcher_html|safe }}
        {% endif %}
    </header>',
    '    </header>'
)
WHERE INSTR(template_html, '{% if theme_switcher_html %}') > 0
  AND INSTR(template_html, '</header>') > INSTR(template_html, '{% if theme_switcher_html %}');

-- 2. Wrap footer navigation in <div class="footer-nav-row"> and include theme_switcher_html in layout_templates
UPDATE layout_templates
SET template_html = REPLACE(
    template_html,
    '    <footer>
        <nav aria-label="Footer Navigation">
            {% for item in footer_menu %}
            <a href="{{ item.url|safe }}"{% if current_path and item.url == current_path %} aria-current="page"{% endif %}>{{ item.title }}</a>
            {% endfor %}
        </nav>
        {% if footer_text %}',
    '    <footer>
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
        {% if footer_text %}'
)
WHERE INSTR(template_html, '<div class="footer-nav-row">') = 0;
