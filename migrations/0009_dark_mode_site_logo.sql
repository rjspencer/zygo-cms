-- Migration 0009: Upgrade Layout Templates to Support Dark Mode Site Logo

UPDATE layout_templates
SET template_html = REPLACE(
    template_html,
    '<a href="/" class="site-title">{% if site_logo %}<img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo">{% else %}{{ site_title }}{% endif %}</a>',
    '<a href="/" class="site-title">{% if site_logo %}{% if site_logo_dark %}<picture class="site-logo-picture"><source srcset="{{ site_logo_dark|safe }}" media="(prefers-color-scheme: dark)"><img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo"></picture>{% else %}<img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo">{% endif %}{% elif site_logo_dark %}<img src="{{ site_logo_dark|safe }}" alt="{{ site_title }}" class="site-logo">{% else %}{{ site_title }}{% endif %}</a>'
)
WHERE INSTR(template_html, 'site_logo_dark') = 0
  AND INSTR(template_html, '<a href="/" class="site-title">{% if site_logo %}<img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo">{% else %}{{ site_title }}{% endif %}</a>') > 0;
