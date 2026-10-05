# Admin panel small bugs and tweaks

## All Pages

- Data should refresh (stale while revalidating) every time I go to a page. It appears that data is being cached and not automatically refreshed.
- Links to live site (in header, in entry lists) are relative links, but the live site is on a different subdomain. Make sure the subdomain gets put in an env var and use it.

## Dashboard

- "Recent content" list should have links to view the live pages
- "Media files" shows "N/A" even though I know there are uploaded images. I don't see a request for this data.
- "Edge Status" appears to be hard-coded. I don't see a request for this data. Fix.

## Entries - both Posts & Pages
- When creating a new Entry, the 'title' field should start in the edit mode
- When the 'title' field loses focus AND the slug field is empty THEN auto generate a kebab-case slug from the title
- Metadata tab should show previews of how a link might appear in search and if pasted in something like Slack or a text message.
- Preview tab does not work. `Refused to display '<URL>' in a frame because it set 'X-Frame-Options' to 'deny'.`


## Posts

- The editor lives at `/editor?type=post` so the navigation sidebar does not highlight an active section. Instead, make this `/posts/editor/new` or `/posts/editor/:id`.

## Pages

- The editor lives at `/editor?type=page` so the navigation sidebar does not highlight an active section. Instead, make this `/pages/editor/new` or `/pages/editor/:id`.

## Templates

- List should only display an icon button for the actions (edit, delete) like the Entries lists do
- Edit Template page header: Move the "Back" button above the header as it is on other pages. This should be a reusable component used everywhere so it's consistent

## Media Library

- Thumbnails aren't loading

## Users

- After adding a user, present a dialog with a short email template that the admin can copy/paste.
- Add to 'future_improvements.md` icebox: Connect an email sender

## Navigation Menus

- I don't see added nav items on the public site. This might not be connected properly
- URL should be the first field
- URL should be a type-ahead dropdown with URLs of existing pages in the site
- If empty, label value should auto-fill with the selected page title
- URL dropdown should include a "custom" option
    - When "custom", a text field appears that accepts a custom value
    - The custom text field value is for external links so it should provide a warning if the value is not an absolute URL

## Content Types

These values are editable from the Templates editor, right? If so, this page is not needed

## Analytics

This page is not loading data for me. I see 403 errors to `https://api.zygodactylstudios.com/api/analytics` in the console. Should this page be hitting CF directly for this data or is the API worker acting as a passthrough?

- If CF Analytics is not properly setup, this page should provide messaging and links for admins to set it up. 

## Settings

- Cloudflare Web Analytics card: use flex to put the toggle in a right column, be sure to use a gap
- Edge Environment card: these values appear to be hard coded, I don't see a request. Fix.