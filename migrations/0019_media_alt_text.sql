-- Migration: 0019_media_alt_text.sql
-- Description: Add alt_text to media table and add image_alt schema and template support to hero section template.

ALTER TABLE media ADD COLUMN alt_text TEXT;

UPDATE section_templates
SET schema_json = '[{"name":"headline","type":"text","label":"Headline","required":true},{"name":"subheadline","type":"textarea","label":"Subheadline","required":false},{"name":"button_text","type":"text","label":"Button Text","required":false},{"name":"button_url","type":"url","label":"Button URL","required":false},{"name":"image","type":"image","label":"Background Image (or Video Fallback)","required":false},{"name":"video_url","type":"video","label":"Background Video (mp4/webm/ogg)","required":false},{"name":"image_alt","type":"text","label":"Background Image Alt Text","required":false}]',
    template_html = '<section class="section-hero">
  <div class="hero-background" aria-hidden="true">
    {% if image %}
    <img src="{{ image|safe }}" alt="{{ image_alt|default('''') }}" class="hero-media" fetchpriority="high" decoding="async" srcset="{{ image|media_srcset|safe }}" sizes="100vw">
    {% endif %}
    {% if video_url %}
    <video class="hero-media hero-video" autoplay loop muted playsinline{% if image %} poster="{{ image|safe }}"{% endif %}>
      <source src="{{ video_url|safe }}">
    </video>
    {% endif %}
    <div class="hero-overlay"></div>
  </div>
  <div class="hero-content">
    <h1 class="hero-headline">{{ headline }}</h1>
    {% if subheadline %}<p class="hero-subheadline">{{ subheadline }}</p>{% endif %}
    {% if button_text and button_url %}<a href="{{ button_url|safe }}" class="hero-btn">{{ button_text }}</a>{% endif %}
  </div>
</section>'
WHERE id = 'hero';
