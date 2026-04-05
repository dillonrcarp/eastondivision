# East On Division — Band Website

## Project Overview

Static band website for East On Division (Muncie, IN). Facebook Page acts as the content layer for events and photos. GitHub Actions syncs that content to static JSON files nightly. Cloudflare Pages serves the site. No CMS, no backend, no server to maintain.

## Architecture

```
Facebook Page (content input)
    → GitHub Action (nightly cron)
        → fetches events + photos from Graph API
            → writes public/data/events.json + photos.json
                → commits to main
                    → Cloudflare Pages auto-deploys
```

Content workflow for the band: post an event on Facebook, it appears on the site the next morning. Upload photos to the Facebook page, they show up in the photo strip overnight. No logins, no CMS, no code.

Design/feature changes: edit locally in VS Code, push to GitHub, deploys in ~60 seconds.

## Tech Stack

| Layer | Tool | Notes |
|---|---|---|
| Static hosting | Cloudflare Pages | Free tier, auto-deploys from GitHub |
| Domain | Already owned | Point nameservers to Cloudflare |
| Content sync | GitHub Actions | Nightly cron, writes static JSON |
| Facebook data | Graph API v19+ | Page events + photos |
| Version control | GitHub | Source of truth, triggers deploys |
| Build tooling | None | Single HTML file, vanilla JS |

## Repository Structure

```
eastondivision/
├── public/
│   ├── index.html              # Main site
│   ├── images/
│   │   ├── logo.jpg
│   │   ├── arrow.png
│   │   ├── hero.jpg
│   │   ├── photo1.jpg
│   │   ├── photo2.jpg
│   │   └── photo3.jpg          # Fallback until FB photos populate
│   └── data/
│       ├── events.json         # Written by GitHub Action
│       └── photos.json         # Written by GitHub Action
├── .github/
│   └── workflows/
│       └── sync-facebook.yml   # Nightly sync action
│   └── scripts/
│       └── fetch-facebook.js   # Fetch script called by action
├── project.md
└── design.md
```

## Image Externalization

The current `eastondivision.html` has all images base64-embedded. Refactor step one:

- Move images to `public/images/`
- Replace all `src="data:image/..."` with `src="/images/filename.ext"`
- Keeps file size manageable and images cacheable by Cloudflare CDN

## GitHub Action

File: `.github/workflows/sync-facebook.yml`

```yaml
name: Sync Facebook Content

on:
  schedule:
    - cron: '0 6 * * *'   # 6am UTC daily
  workflow_dispatch:        # allow manual trigger from GitHub UI

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Fetch Facebook events and photos
        env:
          FB_PAGE_TOKEN: ${{ secrets.FB_PAGE_TOKEN }}
          FB_PAGE_ID: ${{ secrets.FB_PAGE_ID }}
        run: node .github/scripts/fetch-facebook.js

      - name: Commit updated data
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add public/data/
          git diff --staged --quiet || git commit -m "chore: sync Facebook content"
          git push
```

## Fetch Script

File: `.github/scripts/fetch-facebook.js`

```js
const fs = require('fs');

const { FB_PAGE_TOKEN, FB_PAGE_ID } = process.env;
const BASE = 'https://graph.facebook.com/v19.0';

async function fetchEvents() {
  const fields = 'name,start_time,place,cover,ticket_uri,description';
  const url = `${BASE}/${FB_PAGE_ID}/events?fields=${fields}&access_token=${FB_PAGE_TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  const now = new Date();
  const upcoming = (data.data || [])
    .filter(e => new Date(e.start_time) > now)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  fs.writeFileSync('public/data/events.json', JSON.stringify(upcoming, null, 2));
  console.log(`Wrote ${upcoming.length} events`);
}

async function fetchPhotos() {
  const fields = 'images,created_time,name';
  const url = `${BASE}/${FB_PAGE_ID}/photos?fields=${fields}&type=uploaded&limit=12&access_token=${FB_PAGE_TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  fs.writeFileSync('public/data/photos.json', JSON.stringify(data.data || [], null, 2));
  console.log(`Wrote ${(data.data || []).length} photos`);
}

Promise.all([fetchEvents(), fetchPhotos()]).catch(console.error);
```

## Frontend Data Integration

`index.html` fetches both JSON files on load:

```js
async function loadContent() {
  try {
    const [eventsRes, photosRes] = await Promise.all([
      fetch('/data/events.json'),
      fetch('/data/photos.json')
    ]);
    const events = await eventsRes.json();
    const photos = await photosRes.json();
    renderShows(events);
    renderPhotos(photos);
  } catch (e) {
    console.warn('Content load failed, using fallbacks');
  }
}
```

Both renders are non-blocking. Failures fall back gracefully — shows section displays a static message, photo strip keeps hardcoded fallback images.

### renderShows(events)

Parse `start_time` for day/month display. Build `.show-row` elements matching existing markup pattern. If `ticket_uri` exists render Tickets button. If `place` exists use venue name and city/state. If array is empty render a "No upcoming shows — check back soon" message inside `.shows-list`.

### renderPhotos(photos)

Use the largest image in each photo's `images` array (sort by width descending, take index 0). Limit to 5 photos. Replace `.photo-strip` contents. If array is empty, keep hardcoded fallback `<img>` tags already in the HTML.

## Facebook Graph API Setup

### One-time setup
1. Create app at developers.facebook.com — type: Business
2. Add product: Facebook Login for Business
3. Generate a Page Access Token for the East On Division page
4. Exchange for a long-lived token (never expires for page tokens)
5. Add `FB_PAGE_TOKEN` to GitHub repo secrets (Settings > Secrets and variables > Actions)
6. Add `FB_PAGE_ID` to GitHub repo secrets

### Required permissions
- `pages_read_engagement`
- `pages_read_user_content`

No App Review needed — reading your own page only (Standard Access).

### Get your numeric Page ID
```
GET https://graph.facebook.com/{page-name}?access_token={token}
```

### Exchange short-lived token for long-lived page token
```
Step 1 — get long-lived user token:
GET https://graph.facebook.com/v19.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={app_id}
  &client_secret={app_secret}
  &fb_exchange_token={short_lived_user_token}

Step 2 — get page token from long-lived user token:
GET https://graph.facebook.com/v19.0/me/accounts?access_token={long_lived_user_token}
```
Page tokens generated from a long-lived user token never expire.

## GitHub Secrets Required

```
FB_PAGE_TOKEN   long-lived page access token
FB_PAGE_ID      numeric Facebook page ID
```

Set at: GitHub repo > Settings > Secrets and variables > Actions > New repository secret

## Cloudflare Pages Setup

1. Workers & Pages > Create > Connect to Git > select repo
2. Build command: (leave empty)
3. Build output directory: `public`
4. Save and Deploy

Auto-deploys on every push to `main` — including commits made by the nightly Action.

### Domain
1. Add domain to Cloudflare (update nameservers at registrar)
2. Pages > Custom Domains > add domain
3. SSL provisioned automatically

## Contact Form

Currently front-end only. Wire up with Cloudflare Pages Forms:
- Add `method="POST"` and `data-static-form-name="contact"` to the `<form>` element
- Add hidden input: `<input type="hidden" name="form-name" value="contact" />`
- Submissions appear in Cloudflare Pages dashboard
- Free up to 1000 submissions/month, zero extra setup

## Still Needs Real Content

- Release titles, years, and streaming URLs (Music section)
- EPK file download links (Bio PDF, Press Photos ZIP, Rider PDF, Logo Pack ZIP)
- Band stats (shows played, years active)
- Spotify / YouTube links for footer socials
- Seed `public/data/events.json` and `photos.json` as empty arrays `[]` until first Action run

## Alternative Architecture

If nightly sync latency is ever a problem (e.g. you want events live immediately after posting), replace the GitHub Action with a Cloudflare Worker that proxies Graph API calls in real time. Frontend fetches from the Worker URL instead of static JSON files. Not necessary at current scale — nightly is fine for a band site.
