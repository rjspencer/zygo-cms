# Common Examples & Recipes

Learn how to implement common use cases using Zygo CMS.

## Recipe 1: Building a Personal Blog

Zygo CMS is optimized for blogging out of the box.

1. **Setup Categories:** In the Admin UI, create categories like "Engineering" or "Design".
2. **Write a Post:** Create a new Entry of type `post`. Use the rich-text editor to draft your content.
3. **Apply Metadata:** In the sidebar, select your category, add relevant tags, and upload a cover image.
4. **Publish:** Once published, the post automatically appears on the homepage feed and under its respective `/category/:name` route.

## Recipe 2: Building a Landing Page

Landing pages often require structured, multi-column layouts rather than standard rich text. You can achieve this using Zygo's modular block schema.

1. **Create Section Templates:** Go to Settings -> Section Templates, or define your schema directly:
   ```json
   {
     "id": "hero_section",
     "name": "Hero",
     "fields": [
       { "name": "headline", "type": "string", "label": "Headline" },
       { "name": "subtext", "type": "string", "label": "Subtext" },
       { "name": "cta_link", "type": "url", "label": "CTA Link" }
     ]
   }
   ```
2. **Build the Page:** Create a new Entry of type `page`.
3. **Stack Blocks:** Instead of a text editor, use the Block Builder. Add a `Hero` block, fill in the fields, then add a `Feature Grid` block below it.
4. **Render:** The Public Worker will iterate through these blocks and render the corresponding Minijinja templates based on the schema data.

## Recipe 3: Customizing the Theme

Zygo uses Minijinja (a Jinja2/Tera-like templating engine) in Rust.

1. Open `src/views.rs`.
2. Locate the HTML string constants or template files.
3. Modify the HTML structure, apply your own CSS classes, and use Minijinja tags. Here is a practical snippet of what `views.rs` looks like:

```rust
use minijinja::{Environment, context};

pub const POST_TEMPLATE: &str = r#"
<!DOCTYPE html>
<html lang="en">
<head>
    <title>{{ post.title }} - Zygo CMS</title>
</head>
<body>
    <article class="prose lg:prose-xl mx-auto">
        <h1>{{ post.title }}</h1>
        <div class="metadata">
            <span>Published on: {{ post.created_at | date }}</span>
            <div class="tags">
                {% for tag in post.tags %}
                    <span class="badge">{{ tag }}</span>
                {% endfor %}
            </div>
        </div>
        <div class="content">
            {{ post.body_html | safe }}
        </div>
    </article>
</body>
</html>
"#;

pub fn render_post(env: &Environment, post_data: &serde_json::Value) -> String {
    let tmpl = env.get_template("post").unwrap();
    tmpl.render(context!(post => post_data)).unwrap()
}
```

4. Rebuild the worker using `pnpm run build` to see the changes.

## Recipe 4: Going Headless (API Usage)

If you prefer to build your frontend with Next.js, Astro, or Nuxt, you can use Zygo purely as a headless backend.

1. Entries store structured JSON in the `body_json` column.
2. Hit the API endpoints (e.g., `/api/entries?type=post`) directly from your frontend framework.

Here is an example payload you might receive from `/api/entries?type=post&limit=1`:

```json
{
  "status": "success",
  "data": [
    {
      "id": "entry_01HVK...",
      "slug": "hello-world",
      "type": "post",
      "title": "Hello, Zygo!",
      "status": "published",
      "body_html": "<p>Welcome to my new blog powered by Zygo CMS.</p>",
      "body_json": {
        "blocks": [
          { "type": "paragraph", "data": { "text": "Welcome to my new blog powered by Zygo CMS." } }
        ]
      },
      "tags": ["announcement", "tech"],
      "category": "engineering",
      "created_at": "2026-10-07T14:30:00Z",
      "updated_at": "2026-10-07T14:30:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "per_page": 10
  }
}
```

3. Use the JSON payload to render components natively in React/Vue/Svelte, using `body_json` blocks for modular rendering or `body_html` for direct injection.
