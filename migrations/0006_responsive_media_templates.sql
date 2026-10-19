-- 0006_responsive_media_templates.sql
-- Update built-in section and layout templates with responsive multi-tier WebP images,
-- loading="lazy", decoding="async", fetchpriority="high", and srcset with media_srcset filter.

-- 1) Update Hero Section Template
UPDATE section_templates SET template_html = '<section class="section-hero">
  <div class="hero-background" aria-hidden="true">
    {% if image %}
    <img src="{{ image|safe }}" alt="" class="hero-media" fetchpriority="high" decoding="async" srcset="{{ image|media_srcset|safe }}" sizes="100vw">
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
</section>' WHERE id = 'hero';

-- 2) Update Text + Image Section Template
UPDATE section_templates SET template_html = '<section class="section-text-image image-{{ image_position }}">
  <div class="text-image-container">
    <div class="text-image-content">
      <h2>{{ title }}</h2>
      <div class="text-image-prose">{{ body|safe }}</div>
    </div>
    <div class="text-image-media">
      <img src="{{ image|safe }}" alt="{{ title }}" loading="lazy" decoding="async" srcset="{{ image|media_srcset|safe }}" sizes="(max-width: 768px) 100vw, 50vw">
    </div>
  </div>
</section>' WHERE id = 'text-image';

-- 3) Update Gallery Section Template
UPDATE section_templates SET template_html = '<section class="section-gallery">
  {% if title %}<h2 class="gallery-title">{{ title }}</h2>{% endif %}
  <div class="gallery-grid">
    {% for item in images %}
    <figure class="gallery-item">
      <img src="{{ item.image|safe }}" alt="{{ item.caption }}" loading="lazy" decoding="async" srcset="{{ item.image|media_srcset|safe }}" sizes="(max-width: 768px) 100vw, 320px">
      {% if item.caption %}<figcaption>{{ item.caption }}</figcaption>{% endif %}
    </figure>
    {% endfor %}
  </div>
</section>' WHERE id = 'gallery';

-- 4) Update Image Carousel Section Template
UPDATE section_templates SET template_html = '<section class="section-carousel">
  {% if title %}<h2 class="carousel-title">{{ title }}</h2>{% endif %}
  <div class="carousel-track">
    {% for slide in slides %}
    <div class="carousel-slide">
      <img src="{{ slide.image|safe }}" alt="{{ slide.caption }}" loading="lazy" decoding="async" srcset="{{ slide.image|media_srcset|safe }}" sizes="100vw">
      {% if slide.caption %}<p class="carousel-caption">{{ slide.caption }}</p>{% endif %}
    </div>
    {% endfor %}
  </div>
</section>' WHERE id = 'image-carousel';

-- 5) Update Feature Grid Section Template
UPDATE section_templates SET template_html = '<section class="section-features">
  {% if title %}<h2 class="features-heading">{{ title }}</h2>{% endif %}
  <div class="features-grid">
    {% for feature in features %}
    <div class="feature-card">
      {% if feature.icon %}<img class="feature-icon" src="{{ feature.icon|safe }}?size=thumb" alt="{{ feature.title }}" loading="lazy" decoding="async">{% endif %}
      <h3>{{ feature.title }}</h3>
      <p>{{ feature.description }}</p>
    </div>
    {% endfor %}
  </div>
</section>' WHERE id = 'feature-grid';

-- 6) Update Testimonial / Quote Section Template
UPDATE section_templates SET template_html = '<section class="section-testimonial">
  <blockquote class="testimonial-blockquote">
    <p class="testimonial-quote">&ldquo;{{ quote }}&rdquo;</p>
    <footer class="testimonial-footer">
      {% if avatar %}<img class="testimonial-avatar" src="{{ avatar|safe }}?size=thumb" alt="{{ author }}" loading="lazy" decoding="async">{% endif %}
      <div class="testimonial-info">
        <cite class="testimonial-author">{{ author }}</cite>
        {% if role %}<span class="testimonial-role">{{ role }}</span>{% endif %}
      </div>
    </footer>
  </blockquote>
</section>' WHERE id = 'testimonial';

-- 7) Update Post Layout Template
UPDATE layout_templates SET template_html = REPLACE(
  template_html,
  '<img class="cover-image" src="{{ post.cover_image|safe }}" alt="{{ post.title }}">',
  '<img class="cover-image" src="{{ post.cover_image|safe }}" alt="{{ post.title }}" fetchpriority="high" decoding="async" srcset="{{ post.cover_image|media_srcset|safe }}" sizes="(max-width: 1024px) 100vw, 800px">'
) WHERE id = 'post';

-- 8) Update Page Layout Template
UPDATE layout_templates SET template_html = REPLACE(
  template_html,
  '<img class="cover-image" src="{{ page.cover_image|safe }}" alt="{{ page.title }}">',
  '<img class="cover-image" src="{{ page.cover_image|safe }}" alt="{{ page.title }}" fetchpriority="high" decoding="async" srcset="{{ page.cover_image|media_srcset|safe }}" sizes="(max-width: 1024px) 100vw, 800px">'
) WHERE id = 'page';
