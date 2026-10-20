-- Migration 0008: Sync Site Logo and Footer Copyright Text in Layout Templates

-- 1. Upgrade site-title link in header to display site_logo when configured
UPDATE layout_templates
SET template_html = REPLACE(
    template_html,
    '<a href="/" class="site-title">{{ site_title }}</a>',
    '<a href="/" class="site-title">{% if site_logo %}<img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo">{% else %}{{ site_title }}{% endif %}</a>'
)
WHERE INSTR(template_html, 'site_logo') = 0
  AND INSTR(template_html, '<a href="/" class="site-title">{{ site_title }}</a>') > 0;

-- 2. Upgrade footer to render footer_text copyright line when configured
UPDATE layout_templates
SET template_html = REPLACE(
    template_html,
    '    </footer>',
    '        {% if footer_text %}
        <div class="footer-text">{{ footer_text }}</div>
        {% endif %}
    </footer>'
)
WHERE INSTR(template_html, 'footer_text') = 0
  AND INSTR(template_html, '</footer>') > 0;
