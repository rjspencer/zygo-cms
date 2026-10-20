-- Migration 0010: Carousel Full Width Screen Extension
-- Ensure .section-carousel has 0 left/right padding and .carousel-track extends full width (100% width, no max-width, 5rem left/right padding).

UPDATE section_templates
SET template_css = '.section-carousel { background: color-mix(in srgb, var(--color-accent, #991b1b) 7%, var(--color-bg, #faf8f5)); border-top: 1px solid color-mix(in srgb, var(--color-border, #e7e5e4) 60%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--color-border, #e7e5e4) 60%, transparent); padding: 5rem 0; box-sizing: border-box; width: 100%; }
.carousel-title { text-align: center; margin: 0 auto 2.5rem; max-width: 1200px; font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(1.75rem, 3vw, 2.25rem); font-weight: 700; color: var(--color-text, #1c1917); }
.carousel-track { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 1.5rem; padding: 0 5rem 1.5rem; width: 100%; box-sizing: border-box; scrollbar-width: thin; }
.carousel-slide { flex: 0 0 75%; max-width: 75%; scroll-snap-align: center; background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #e7e5e4); border-radius: var(--border-radius, 8px); overflow: hidden; box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.1)); }
.carousel-slide img { width: 100%; height: 420px; object-fit: cover; display: block; }
.carousel-caption { font-family: var(--font-body, system-ui, sans-serif); font-size: 0.875rem; color: var(--color-text-muted, #78716c); padding: 0.85rem 1.25rem; text-align: center; margin: 0; }
@media (max-width: 768px) { .section-carousel { padding: 3rem 0; } .carousel-track { padding: 0 1.25rem 1.5rem; } .carousel-slide { flex: 0 0 85%; max-width: 85%; } .carousel-slide img { height: 260px; } }'
WHERE id = 'image-carousel';
