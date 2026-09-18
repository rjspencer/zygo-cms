use crate::models::{BreadcrumbItem, Entry};
use askama::Template;

#[derive(Template)]
#[template(path = "index.html")]
pub struct IndexTemplate<'a> {
    pub origin: &'a str,
    pub posts: &'a [Entry],
    pub heading: Option<&'a str>,
    pub canonical_path: Option<&'a str>,
}

impl<'a> IndexTemplate<'a> {
    pub fn page_title(&self) -> String {
        if let Some(h) = self.heading {
            format!("{h} \u{2014} Zygo")
        } else {
            "Home \u{2014} Zygo".to_string()
        }
    }

    pub fn canonical_url(&self) -> String {
        let base = self.origin.trim_end_matches('/');
        if let Some(path) = self.canonical_path {
            format!("{}{}", base, path)
        } else {
            format!("{}/", base)
        }
    }
}

fn render_tmpl<T: Template>(tmpl: &T) -> worker::Result<String> {
    tmpl.render()
        .map_err(|e| worker::Error::RustError(e.to_string()))
}

pub fn render_index(posts: &[Entry], origin: &str) -> worker::Result<String> {
    render_tmpl(&IndexTemplate {
        origin,
        posts,
        heading: None,
        canonical_path: None,
    })
}

pub fn render_tag_index(posts: &[Entry], origin: &str, tag: &str) -> worker::Result<String> {
    let heading = format!("Tag: #{tag}");
    let canonical = format!("/tag/{tag}");
    render_tmpl(&IndexTemplate {
        origin,
        posts,
        heading: Some(&heading),
        canonical_path: Some(&canonical),
    })
}

pub fn render_category_index(
    posts: &[Entry],
    origin: &str,
    category: &str,
) -> worker::Result<String> {
    let heading = format!("Category: {category}");
    let canonical = format!("/category/{category}");
    render_tmpl(&IndexTemplate {
        origin,
        posts,
        heading: Some(&heading),
        canonical_path: Some(&canonical),
    })
}

#[derive(Template)]
#[template(path = "post.html")]
pub struct PostTemplate<'a> {
    pub origin: &'a str,
    pub post: &'a Entry,
}

#[derive(Template)]
#[template(path = "page.html")]
pub struct PageTemplate<'a> {
    pub origin: &'a str,
    pub page: &'a Entry,
    pub breadcrumbs: &'a [BreadcrumbItem],
    pub children: &'a [Entry],
}

pub fn render_post(post: &Entry, origin: &str) -> worker::Result<String> {
    render_tmpl(&PostTemplate { origin, post })
}

pub fn render_page(
    page: &Entry,
    origin: &str,
    breadcrumbs: &[BreadcrumbItem],
    children: &[Entry],
) -> worker::Result<String> {
    render_tmpl(&PageTemplate {
        origin,
        page,
        breadcrumbs,
        children,
    })
}

#[derive(Template)]
#[template(path = "sitemap.xml")]
pub struct SitemapTemplate<'a> {
    pub origin: &'a str,
    pub entries: &'a [Entry],
}

#[derive(Template)]
#[template(path = "rss.xml")]
pub struct RssTemplate<'a> {
    pub origin: &'a str,
    pub posts: &'a [Entry],
}

pub fn render_sitemap(
    origin: &str,
    entries: &[Entry],
    env: &worker::Env,
) -> worker::Result<worker::Response> {
    let body = render_tmpl(&SitemapTemplate { origin, entries })?;

    let mut headers = worker::Headers::new();
    headers.set("Content-Type", "application/xml; charset=utf-8")?;
    crate::cache::add_cache_headers(&mut headers, env)?;

    worker::Response::ok(body).map(|res| res.with_headers(headers))
}

pub fn render_rss(
    origin: &str,
    posts: &[Entry],
    env: &worker::Env,
) -> worker::Result<worker::Response> {
    let body = render_tmpl(&RssTemplate { origin, posts })?;

    let mut headers = worker::Headers::new();
    headers.set("Content-Type", "application/rss+xml; charset=utf-8")?;
    crate::cache::add_cache_headers(&mut headers, env)?;

    worker::Response::ok(body).map(|res| res.with_headers(headers))
}
