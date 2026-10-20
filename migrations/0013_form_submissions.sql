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
