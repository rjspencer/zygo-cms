use crate::models::Entry;
use askama::Template;

#[derive(Template)]
#[template(path = "index.html")]
pub struct IndexTemplate<'a> {
    pub origin: &'a str,
    pub posts: &'a [Entry],
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
}

fn render_tmpl<T: Template>(tmpl: &T) -> worker::Result<String> {
    tmpl.render()
        .map_err(|e| worker::Error::RustError(e.to_string()))
}

pub fn render_index(posts: &[Entry], origin: &str) -> worker::Result<String> {
    render_tmpl(&IndexTemplate { origin, posts })
}

pub fn render_post(post: &Entry, origin: &str) -> worker::Result<String> {
    render_tmpl(&PostTemplate { origin, post })
}

pub fn render_page(page: &Entry, origin: &str) -> worker::Result<String> {
    render_tmpl(&PageTemplate { origin, page })
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
