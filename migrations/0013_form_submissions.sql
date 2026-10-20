-- Migration: 0013_form_submissions.sql
-- Description: Create form_submissions table for contact/newsletter inbox and seed contact-form and newsletter preset section templates.

CREATE TABLE IF NOT EXISTS form_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_name TEXT NOT NULL DEFAULT 'contact',
    page_path TEXT,
    sender_name TEXT,
    sender_email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL DEFAULT '',
    metadata_json TEXT DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'unread',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_name ON form_submissions(form_name);

-- 1. Contact Form Preset Template
INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked)
VALUES (
    'contact-form',
    'Contact Form',
    'Responsive contact inquiry form with honeypot spam protection, configurable subject/phone fields, and lead capture.',
    '[{"name":"heading","type":"text","label":"Heading","required":true},{"name":"subheading","type":"textarea","label":"Subheading","required":false},{"name":"submit_label","type":"text","label":"Submit Button Label","required":true},{"name":"success_message","type":"text","label":"Success Message","required":false},{"name":"show_subject","type":"boolean","label":"Show Subject Field","required":false},{"name":"show_phone","type":"boolean","label":"Show Phone Field","required":false}]',
    '<section class="section-contact-form">
  <div class="contact-form-container">
    <div class="contact-form-card">
      <div class="contact-form-header">
        {% if heading %}<h2 class="contact-form-headline">{{ heading }}</h2>{% endif %}
        {% if subheading %}<p class="contact-form-subheadline">{{ subheading }}</p>{% endif %}
      </div>
      <form class="contact-form" action="/forms/submit" method="POST">
        <input type="hidden" name="form_name" value="contact">
        <div class="form-hp" aria-hidden="true" style="position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; overflow: hidden;">
          <input type="text" name="website" tabindex="-1" autocomplete="new-password">
        </div>
        <div class="contact-form-group">
          <label for="contact-sender-name" class="contact-form-label">Name</label>
          <input type="text" id="contact-sender-name" name="sender_name" class="contact-form-input" placeholder="Your name">
        </div>
        <div class="contact-form-group">
          <label for="contact-sender-email" class="contact-form-label">Email <span class="required-mark">*</span></label>
          <input type="email" id="contact-sender-email" name="sender_email" class="contact-form-input" required placeholder="your.email@example.com">
        </div>
        {% if show_phone %}
        <div class="contact-form-group">
          <label for="contact-phone" class="contact-form-label">Phone</label>
          <input type="tel" id="contact-phone" name="phone" class="contact-form-input" placeholder="+1 (555) 000-0000">
        </div>
        {% endif %}
        {% if show_subject %}
        <div class="contact-form-group">
          <label for="contact-subject" class="contact-form-label">Subject</label>
          <input type="text" id="contact-subject" name="subject" class="contact-form-input" placeholder="How can we help?">
        </div>
        {% endif %}
        <div class="contact-form-group">
          <label for="contact-message" class="contact-form-label">Message <span class="required-mark">*</span></label>
          <textarea id="contact-message" name="message" class="contact-form-textarea" rows="5" required placeholder="Write your message here..."></textarea>
        </div>
        <div class="contact-form-actions">
          <button type="submit" class="contact-form-btn">{{ submit_label }}</button>
        </div>
        {% if success_message %}
        <div class="contact-form-status" style="display: none;" role="status">
          <p>{{ success_message }}</p>
        </div>
        {% endif %}
      </form>
    </div>
  </div>
</section>',
    '.section-contact-form { padding: 5rem 2rem; box-sizing: border-box; width: 100%; max-width: 800px; margin: 0 auto; }
.contact-form-container { width: 100%; }
.contact-form-card { background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #e7e5e4); border-radius: var(--border-radius, 8px); padding: 3rem 2.5rem; box-shadow: var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.05)); box-sizing: border-box; }
.contact-form-header { text-align: center; margin-bottom: 2.5rem; }
.contact-form-headline { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 700; color: var(--color-text, #1c1917); margin: 0 0 1rem; }
.contact-form-subheadline { font-family: var(--font-body, system-ui, sans-serif); font-size: 1.05rem; color: var(--color-text-muted, #78716c); max-width: 600px; margin: 0 auto; line-height: 1.6; }
.form-hp { position: absolute !important; left: -9999px !important; width: 1px !important; height: 1px !important; opacity: 0 !important; overflow: hidden !important; }
.contact-form-group { margin-bottom: 1.5rem; text-align: left; }
.contact-form-label { display: block; font-family: var(--font-body, system-ui, sans-serif); font-size: 0.9rem; font-weight: 600; color: var(--color-text, #1c1917); margin-bottom: 0.5rem; }
.required-mark { color: var(--color-accent, #991b1b); }
.contact-form-input, .contact-form-textarea { width: 100%; box-sizing: border-box; padding: 0.75rem 1rem; font-family: var(--font-body, system-ui, sans-serif); font-size: 0.95rem; color: var(--color-text, #1c1917); background: var(--color-bg, #faf8f5); border: 1px solid var(--color-border, #e7e5e4); border-radius: var(--border-radius, 6px); transition: border-color 0.15s ease, box-shadow 0.15s ease; outline: none; }
.contact-form-input:focus, .contact-form-textarea:focus { border-color: var(--color-accent, #991b1b); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent, #991b1b) 20%, transparent); }
.contact-form-actions { margin-top: 2rem; }
.contact-form-btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 0.875rem 2rem; background: var(--color-accent, #991b1b); color: #ffffff; font-family: var(--font-body, system-ui, sans-serif); font-size: 1rem; font-weight: 600; border: none; border-radius: var(--border-radius, 6px); cursor: pointer; transition: opacity 0.15s ease, transform 0.15s ease; }
.contact-form-btn:hover { opacity: 0.9; transform: translateY(-1px); }
.contact-form-status { margin-top: 1.5rem; padding: 1rem; border-radius: var(--border-radius, 6px); font-family: var(--font-body, system-ui, sans-serif); font-size: 0.95rem; text-align: center; }
@media (max-width: 768px) { .section-contact-form { padding: 3rem 1.25rem; } .contact-form-card { padding: 2rem 1.25rem; } }',
    '["section-contact-form","contact-form-container","contact-form-card","contact-form-header","contact-form-headline","contact-form-subheadline","contact-form","form-hp","contact-form-group","contact-form-label","required-mark","contact-form-input","contact-form-textarea","contact-form-actions","contact-form-btn","contact-form-status"]',
    1
)
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    schema_json = excluded.schema_json,
    template_html = excluded.template_html,
    template_css = excluded.template_css,
    css_classes_json = excluded.css_classes_json,
    is_locked = excluded.is_locked,
    updated_at = CURRENT_TIMESTAMP;

-- 2. Newsletter Signup Preset Template
INSERT INTO section_templates (id, name, description, schema_json, template_html, template_css, css_classes_json, is_locked)
VALUES (
    'newsletter',
    'Newsletter Signup',
    'High-conversion inline newsletter subscription box with honeypot spam protection.',
    '[{"name":"heading","type":"text","label":"Heading","required":true},{"name":"subheading","type":"textarea","label":"Subheading","required":false},{"name":"submit_label","type":"text","label":"Button Label","required":true},{"name":"success_message","type":"text","label":"Success Message","required":false}]',
    '<section class="section-newsletter">
  <div class="newsletter-container">
    <div class="newsletter-header">
      {% if heading %}<h2 class="newsletter-headline">{{ heading }}</h2>{% endif %}
      {% if subheading %}<p class="newsletter-subheadline">{{ subheading }}</p>{% endif %}
    </div>
    <form class="newsletter-form" action="/forms/submit" method="POST">
      <input type="hidden" name="form_name" value="newsletter">
      <div class="form-hp" aria-hidden="true" style="position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; overflow: hidden;">
        <input type="text" name="website" tabindex="-1" autocomplete="new-password">
      </div>
      <div class="newsletter-input-group">
        <label for="newsletter-email" class="newsletter-sr-only">Email address</label>
        <input type="email" id="newsletter-email" name="sender_email" class="newsletter-input" required placeholder="Enter your email address">
        <button type="submit" class="newsletter-btn">{{ submit_label }}</button>
      </div>
      {% if success_message %}
      <div class="newsletter-status" style="display: none;" role="status">
        <p>{{ success_message }}</p>
      </div>
      {% endif %}
    </form>
  </div>
</section>',
    '.section-newsletter { background: color-mix(in srgb, var(--color-accent, #991b1b) 5%, var(--color-bg, #faf8f5)); border-top: 1px solid color-mix(in srgb, var(--color-border, #e7e5e4) 60%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--color-border, #e7e5e4) 60%, transparent); padding: 5rem 2rem; box-sizing: border-box; width: 100%; text-align: center; }
.newsletter-container { max-width: 640px; margin: 0 auto; }
.newsletter-header { margin-bottom: 2rem; }
.newsletter-headline { font-family: var(--font-headline, ''Newsreader'', Georgia, serif); font-size: clamp(1.75rem, 3vw, 2.25rem); font-weight: 700; color: var(--color-text, #1c1917); margin: 0 0 0.75rem; }
.newsletter-subheadline { font-family: var(--font-body, system-ui, sans-serif); font-size: 1.05rem; color: var(--color-text-muted, #78716c); margin: 0 auto; max-width: 540px; line-height: 1.6; }
.newsletter-form { max-width: 520px; margin: 0 auto; position: relative; }
.form-hp { position: absolute !important; left: -9999px !important; width: 1px !important; height: 1px !important; opacity: 0 !important; overflow: hidden !important; }
.newsletter-input-group { display: flex; gap: 0.75rem; align-items: stretch; }
.newsletter-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
.newsletter-input { flex: 1; min-width: 0; padding: 0.75rem 1rem; font-family: var(--font-body, system-ui, sans-serif); font-size: 0.95rem; color: var(--color-text, #1c1917); background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #e7e5e4); border-radius: var(--border-radius, 6px); outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
.newsletter-input:focus { border-color: var(--color-accent, #991b1b); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent, #991b1b) 20%, transparent); }
.newsletter-btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.75rem 1.75rem; background: var(--color-accent, #991b1b); color: #ffffff; font-family: var(--font-body, system-ui, sans-serif); font-size: 0.95rem; font-weight: 600; border: none; border-radius: var(--border-radius, 6px); cursor: pointer; white-space: nowrap; transition: opacity 0.15s ease, transform 0.15s ease; }
.newsletter-btn:hover { opacity: 0.9; transform: translateY(-1px); }
.newsletter-status { margin-top: 1.5rem; padding: 1rem; border-radius: var(--border-radius, 6px); font-family: var(--font-body, system-ui, sans-serif); font-size: 0.95rem; text-align: center; }
@media (max-width: 640px) { .section-newsletter { padding: 3rem 1.25rem; } .newsletter-input-group { flex-direction: column; } .newsletter-btn { width: 100%; } }',
    '["section-newsletter","newsletter-container","newsletter-header","newsletter-headline","newsletter-subheadline","newsletter-form","form-hp","newsletter-input-group","newsletter-sr-only","newsletter-input","newsletter-btn","newsletter-status"]',
    1
)
ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    schema_json = excluded.schema_json,
    template_html = excluded.template_html,
    template_css = excluded.template_css,
    css_classes_json = excluded.css_classes_json,
    is_locked = excluded.is_locked,
    updated_at = CURRENT_TIMESTAMP;

-- 3. Seed / Update /theme-preview page entry with all preset section templates including contact-form and newsletter
INSERT INTO entries (slug, title, type, status, path, sort_order, search_text, published_at, body_html, body_json) VALUES (
    'theme-preview',
    'Theme & Section Showcase',
    'page',
    'published',
    '/theme-preview',
    10,
    'Theme Section Showcase Hero Text Gallery Carousel Features Testimonial FAQ Video Embed Pricing Stats Logo Cloud Team Steps Contact Form Newsletter',
    CURRENT_TIMESTAMP,
    '',
    '[{"type_id": "hero", "data": {"headline": "Designing Autonomous Systems with Elegance", "subheadline": "An exploration into next-generation edge architecture, fluid editorial layouts, and reactive AI pair programming.", "button_text": "Explore Documentation", "button_url": "/docs", "image": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80", "video_url": ""}}, {"type_id": "text", "data": {"title": "The Philosophy of Edge-First Publishing", "body": "<p>Traditional web architectures impose significant latency and infrastructure overhead. By compiling content representations at the edge with zero-cold-start runtimes, Zygo CMS provides instant page loads and real-time updates without database connection pooling bottlenecks.</p><p>Every layout adheres strictly to typographic hierarchy, accessible focus states, and dynamic contrast ratios.</p>"}}, {"type_id": "text-image", "data": {"title": "Engineered for Extreme Performance", "body": "<p>By pairing Cloudflare Workers and D1 with Rust-compiled Wasm templates, content is hydrated with near-zero latency worldwide.</p><p>All assets are cached intelligently at the network edge, with automatic invalidation across canonical URLs whenever revisions are published.</p>", "image": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80", "image_position": "right"}}, {"type_id": "gallery", "data": {"title": "Visual Design & System Architecture", "images": [{"image": "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80", "caption": "Clean Minimalist Typography"}, {"image": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80", "caption": "Rust WebAssembly Core"}, {"image": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80", "caption": "Real-Time Telemetry & Metrics"}]}}, {"type_id": "image-carousel", "data": {"title": "Curated Workspaces & Editorial Showcase", "slides": [{"image": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1000&q=80", "caption": "Developer Workspace & CLI Tools"}, {"image": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80", "caption": "Collaborative Pair Programming Sessions"}, {"image": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1000&q=80", "caption": "High Velocity Delivery Pipeline"}]}}, {"type_id": "call-to-action", "data": {"heading": "Ready to Transform Your Content Workflow?", "text": "Join leading publishers and developers building lightning-fast modern publications with Zygo CMS.", "button_label": "Get Started Today", "button_url": "/docs/quickstart"}}, {"type_id": "feature-grid", "data": {"title": "Core Capabilities", "features": [{"title": "Edge-Rendered SSR", "description": "Sub-50ms TTFB delivered globally using Cloudflare D1 and Rust micro-runtimes.", "icon": ""}, {"title": "WebMCP Agent Parity", "description": "Every human UI action can be orchestrated programmatically by autonomous AI coding agents.", "icon": ""}, {"title": "Dynamic Theming Engine", "description": "Tokenized color-mix, font presets, and fluid typography that adapt without rebuilding.", "icon": ""}]}}, {"type_id": "testimonial", "data": {"quote": "Zygo CMS represents the rare union of uncompromising editorial aesthetics and blistering edge performance. It has transformed how our team publishes.", "author": "Elena Rostova", "role": "Head of Engineering, Monolith Media", "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80"}}, {"type_id": "faq", "data": {"title": "Frequently Asked Questions", "questions": [{"question": "How does Zygo CMS handle database migrations?", "answer": "<p>Zygo CMS uses Cloudflare D1 with strict expand/contract migrations, explicit column selection, and immutable revision logging for zero downtime.</p>"}, {"question": "Can custom section templates be created in the Admin UI?", "answer": "<p>Yes. The visual Template Editor allows creating custom MiniJinja section templates with dynamic field builders and server-side syntax validation.</p>"}, {"question": "How does theme switching work?", "answer": "<p>Themes are defined using CSS custom properties on <code>:root</code>. Switching active themes updates these tokens in real-time across both editorial posts and modular page sections.</p>"}]}}, {"type_id": "video-embed", "data": {"title": "Platform Architecture Walkthrough", "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}}, {"type_id": "pricing", "data": {"headline": "Simple, Predictable Pricing", "subheadline": "Choose the perfect plan for your publication, from solo creators to global media teams.", "plans": [{"name": "Starter", "price": "$0", "period": "/ month", "description": "Essential publishing tools for indie creators and developers.", "features": "Unlimited edge SSR requests\nUp to 100 published pages\nCommunity Discord support\nStandard CSS themes", "button_text": "Start Free", "button_url": "/signup", "is_featured": false, "badge_text": ""}, {"name": "Professional", "price": "$29", "period": "/ month", "description": "Advanced edge capabilities and AI agent orchestration for growing teams.", "features": "Unlimited pages & media\nFull WebMCP & CLI MCP agent access\nCustom section templates\nPriority edge cache purging\nDedicated email support", "button_text": "Get Started", "button_url": "/signup?plan=pro", "is_featured": true, "badge_text": "Most Popular"}, {"name": "Enterprise", "price": "$99", "period": "/ month", "description": "Dedicated infrastructure, SLA guarantees, and custom integrations.", "features": "Dedicated Cloudflare D1 database\nCustom Wasm micro-runtimes\n99.99% uptime SLA\n24/7 technical phone support\nCustom SSO & Cloudflare Access", "button_text": "Contact Sales", "button_url": "/contact", "is_featured": false, "badge_text": ""}]}}, {"type_id": "stats", "data": {"headline": "Engineered for Zero Cold Starts", "stats": [{"value": "<25ms", "label": "Edge TTFB", "description": "Delivered across 300+ Cloudflare global edge locations."}, {"value": "100%", "label": "GDPR Compliant", "description": "Zero client-side tracking cookies or layout shifts."}, {"value": "15+", "label": "Modular Presets", "description": "Responsive MiniJinja section templates out of the box."}, {"value": "99.99%", "label": "Uptime SLA", "description": "Decoupled edge architecture with zero database connection pools."}]}}, {"type_id": "logo-cloud", "data": {"title": "Trusted by Next-Generation Media Leaders", "logos": [{"name": "Cloudflare", "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&h=80&q=80", "url": "https://cloudflare.com"}, {"name": "Rust Foundation", "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&h=80&q=80", "url": "https://rust-lang.org"}, {"name": "WasmEdge", "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&h=80&q=80", "url": "https://wasmedge.org"}, {"name": "Radix Themes", "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&h=80&q=80", "url": "https://radix-ui.com"}]}}, {"type_id": "team", "data": {"headline": "Meet the Core Maintainers", "subheadline": "Architects, engineers, and designers building the future of edge-native editorial publishing.", "members": [{"name": "Dr. Sarah Chen", "role": "Systems Architect", "bio": "Specializing in distributed systems, WebAssembly runtimes, and low-latency edge storage architectures.", "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&h=300&q=80", "social_url": "https://github.com", "social_label": "GitHub"}, {"name": "Marcus Aurelius Vance", "role": "Lead Product Designer", "bio": "Obsessed with editorial typography, design token pipelines, and intuitive authoring experiences.", "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&h=300&q=80", "social_url": "https://twitter.com", "social_label": "X / Twitter"}, {"name": "Amina Morales", "role": "AI Integrations Engineer", "bio": "Driving model context protocols, human-agent UI parity, and reactive pair programming workflows.", "avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&h=300&q=80", "social_url": "https://linkedin.com", "social_label": "LinkedIn"}]}}, {"type_id": "steps", "data": {"headline": "How Zygo CMS Works", "subheadline": "From initial scaffolding to global distribution in under ten minutes.", "steps": [{"step_number": "01", "title": "Clone & Configure", "description": "Scaffold your workspace with our zero-setup CLI tool and link your Cloudflare D1 database.", "link_text": "Read Setup Guide", "link_url": "/docs"}, {"step_number": "02", "title": "Choose Your Design Tokens", "description": "Customize your publication theme with live CSS custom property previews and typography pairings.", "link_text": "Browse Themes", "link_url": "/themes"}, {"step_number": "03", "title": "Compose Sections", "description": "Mix and match 15 responsive preset section templates or create bespoke MiniJinja components.", "link_text": "Explore Templates", "link_url": "/templates"}, {"step_number": "04", "title": "Publish Globally", "description": "Deploy instantly to the Cloudflare edge network with automated canonical cache invalidation.", "link_text": "Deploy Now", "link_url": "/deploy"}]}}, {"type_id": "contact-form", "data": {"heading": "Get in Touch with Our Team", "subheading": "Have questions about edge architecture, enterprise deployments, or custom migrations? Send us a message.", "submit_label": "Send Message", "success_message": "Thank you for reaching out! A specialist will get back to you shortly.", "show_subject": true, "show_phone": true}}, {"type_id": "newsletter", "data": {"heading": "Subscribe to the Edge Dispatch", "subheading": "Get bi-weekly technical deep dives on WebAssembly, Cloudflare Workers, and autonomous agent orchestration.", "submit_label": "Subscribe", "success_message": "Welcome aboard! Check your inbox to confirm your subscription."}}]'
)
ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title,
    type = excluded.type,
    status = excluded.status,
    path = excluded.path,
    sort_order = excluded.sort_order,
    search_text = excluded.search_text,
    body_html = excluded.body_html,
    body_json = excluded.body_json,
    updated_at = CURRENT_TIMESTAMP;
