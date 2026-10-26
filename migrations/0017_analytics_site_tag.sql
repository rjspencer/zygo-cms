-- Migration: 0017_analytics_site_tag.sql
-- Description: Add analytics_site_tag setting and inject Cloudflare Web Analytics beacon into layout templates.

INSERT OR IGNORE INTO settings (key, value) VALUES ('analytics_site_tag', '');

UPDATE layout_templates
SET template_html = REPLACE(
    template_html,
    '</head>',
    '    {% if analytics_site_tag %}
    <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=''{"token": "{{ analytics_site_tag }}"}''></script>
    {% endif %}
</head>'
)
WHERE INSTR(template_html, 'beacon.min.js') = 0;
