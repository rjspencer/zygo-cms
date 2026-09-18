use ammonia::{Builder, UrlRelative};

/// Sanitizes untrusted HTML using Ammonia, allowing standard rich text tags and attributes
/// while stripping scripts, iframes, inline event handlers, and malicious URL schemes.
pub fn sanitize_html(html: &str) -> String {
    let mut builder = Builder::default();
    builder
        .add_tag_attributes("code", &["class"])
        .add_tag_attributes("pre", &["class"])
        .add_tag_attributes(
            "img",
            &["src", "alt", "title", "loading", "width", "height"],
        )
        .add_tag_attributes("a", &["href", "title", "target"])
        .add_tag_attributes("th", &["colspan", "rowspan", "align"])
        .add_tag_attributes("td", &["colspan", "rowspan", "align"])
        .url_relative(UrlRelative::PassThrough);

    builder.clean(html).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strips_script_tags_and_content() {
        let input = "<p>Hello</p><script>alert('xss');</script><p>World</p>";
        let output = sanitize_html(input);
        assert_eq!(output, "<p>Hello</p><p>World</p>");
    }

    #[test]
    fn test_strips_iframe_and_style() {
        let input = "<div><iframe src=\"https://evil.com\"></iframe><style>body { color: red; }</style>Safe</div>";
        let output = sanitize_html(input);
        assert_eq!(output, "<div>Safe</div>");
    }

    #[test]
    fn test_strips_inline_event_handlers() {
        let input = r#"<img src="valid.webp" onerror="alert(1)" onclick="steal()"><p onmouseover="bad()">Text</p>"#;
        let output = sanitize_html(input);
        assert!(!output.contains("onerror"));
        assert!(!output.contains("onclick"));
        assert!(!output.contains("onmouseover"));
        assert!(output.contains(r#"src="valid.webp""#));
        assert!(output.contains("<p>Text</p>"));
    }

    #[test]
    fn test_strips_javascript_pseudo_protocols() {
        let input = r#"<a href="javascript:alert(1)">Click me</a>"#;
        let output = sanitize_html(input);
        assert!(!output.contains("javascript:"));
        assert!(output.contains("Click me"));
        assert!(!output.contains("href="));
    }

    #[test]
    fn test_preserves_code_block_with_language_class() {
        let input =
            r#"<pre><code class="language-rust">fn main() { println!("Hello"); }</code></pre>"#;
        let output = sanitize_html(input);
        assert!(output.contains(r#"<code class="language-rust">"#));
        assert!(output.contains("<pre>"));
        assert!(output.contains("</code>"));
        assert!(output.contains("</pre>"));
        assert!(output.contains("fn main()"));
    }

    #[test]
    fn test_preserves_relative_links_and_media() {
        let input = r#"<p><a href="/post/my-post">Post</a> and <img src="/media/123-pic.webp" alt="Photo"></p>"#;
        let output = sanitize_html(input);
        assert!(output.contains(r#"href="/post/my-post""#));
        assert!(output.contains(r#"src="/media/123-pic.webp""#));
        assert!(output.contains(r#"alt="Photo""#));
    }

    #[test]
    fn test_enforces_tabnabbing_protection_on_target_blank() {
        let input = r#"<a href="https://external.com" target="_blank">External</a>"#;
        let output = sanitize_html(input);
        assert!(output.contains("noopener"));
        assert!(output.contains("noreferrer"));
    }
}
