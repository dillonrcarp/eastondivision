const fs = require("fs");
const path = require("path");

const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION || "v25.0";
const GENERATE_FROM_CACHE = process.argv.includes("--from-cache");

if (!GENERATE_FROM_CACHE && (!FB_PAGE_TOKEN || !FB_PAGE_ID)) {
  throw new Error("Missing required env vars: FB_PAGE_TOKEN and FB_PAGE_ID");
}

const BASE_URL = `https://graph.facebook.com/${FB_GRAPH_VERSION}`;
const DATA_DIR = path.join("public", "data");
const EVENTS_DIR = path.join("public", "events");
const EVENTS_PATH = path.join(DATA_DIR, "events.json");
const PHOTOS_PATH = path.join(DATA_DIR, "photos.json");
const SITEMAP_PATH = path.join("public", "sitemap.xml");
const SITE_URL = "https://eastondivision.com";

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Facebook API ${response.status}: ${errorBody}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(`Facebook API error: ${JSON.stringify(payload.error)}`);
  }

  return payload;
}

async function fetchAllPages(initialUrl) {
  const rows = [];
  let nextUrl = initialUrl;

  while (nextUrl) {
    const payload = await fetchJson(nextUrl);
    if (Array.isArray(payload.data)) {
      rows.push(...payload.data);
    }
    nextUrl = payload.paging && payload.paging.next ? payload.paging.next : null;
  }

  return rows;
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(EVENTS_DIR, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(value) {
  return escapeHtml(value);
}

function toIsoDateTime(value) {
  if (!value) return "";
  const normalized = String(value).trim().replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  if (!Number.isNaN(new Date(normalized).getTime())) return normalized;

  const date = parseDate(value);
  return date ? date.toISOString() : "";
}

function formatDisplayDate(value) {
  const date = parseDate(value);
  if (!date) return "Date TBA";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Indiana/Indianapolis",
    timeZoneName: "short"
  }).format(date);
}

function getEventPath(event) {
  return `events/${event.id}.html`;
}

function getEventUrl(event) {
  return `${SITE_URL}/${getEventPath(event)}`;
}

function getFacebookEventUrl(event) {
  return event.id ? `https://www.facebook.com/events/${encodeURIComponent(event.id)}/` : "";
}

function getAddress(location = {}) {
  const address = {
    "@type": "PostalAddress"
  };

  if (location.street) address.streetAddress = location.street;
  if (location.city) address.addressLocality = location.city;
  if (location.state) address.addressRegion = location.state;
  if (location.zip) address.postalCode = location.zip;
  if (location.country) address.addressCountry = location.country === "United States" ? "US" : location.country;

  return address;
}

function getLocationText(event) {
  const place = event.place || {};
  const location = place.location || {};
  const parts = [place.name, location.city, location.state].filter(Boolean);
  return parts.join(" | ") || "Location TBA";
}

function getEventStructuredData(event) {
  const place = event.place || {};
  const location = place.location || {};
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name || "East On Division Live",
    startDate: toIsoDateTime(event.start_time),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: getEventUrl(event),
    performer: {
      "@type": "PerformingGroup",
      name: "East On Division",
      url: SITE_URL
    },
    organizer: {
      "@type": "Organization",
      name: "East On Division",
      url: SITE_URL
    },
    location: {
      "@type": "Place",
      name: place.name || "Venue TBA",
      address: getAddress(location)
    }
  };

  const endDate = toIsoDateTime(event.end_time);
  if (endDate) structuredData.endDate = endDate;
  if (event.description) structuredData.description = event.description;
  if (event.ticket_uri) structuredData.offers = {
    "@type": "Offer",
    url: event.ticket_uri,
    availability: "https://schema.org/InStock"
  };
  if (event.cover && event.cover.source) structuredData.image = [event.cover.source];

  return structuredData;
}

function getMetaDescription(event) {
  return (event.description || "East On Division live show details.")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 155);
}

function renderEventPage(event) {
  const eventUrl = getEventUrl(event);
  const facebookUrl = getFacebookEventUrl(event);
  const ctaUrl = event.ticket_uri || facebookUrl;
  const ctaLabel = event.ticket_uri ? "Tickets" : "RSVP";
  const description = event.description ? escapeHtml(event.description).replace(/\n/g, "<br />") : "";
  const structuredData = JSON.stringify(getEventStructuredData(event), null, 2).replace(/<\//g, "<\\/");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(event.name || "East On Division Live")}</title>
  <meta name="description" content="${escapeHtml(getMetaDescription(event))}" />
  <link rel="canonical" href="${escapeHtml(eventUrl)}" />
  <link rel="icon" type="image/png" sizes="32x32" href="../favicon-32.png" />
  <link rel="stylesheet" href="../styles.css?v=5" />
  <script type="application/ld+json">
${structuredData}
  </script>
</head>
<body>
<main>
  <div class="section-wrap">
    <section class="event-page">
      <p class="section-eye">Live</p>
      <div class="section-rule"></div>
      <h1 class="section-title">${escapeHtml(event.name || "East On Division Live")}</h1>
      <p class="event-page-date">${escapeHtml(formatDisplayDate(event.start_time))}</p>
      <p class="event-page-location">${escapeHtml(getLocationText(event))}</p>
      ${description ? `<p class="event-page-description">${description}</p>` : ""}
      <div class="event-page-actions">
        ${ctaUrl ? `<a href="${escapeHtml(ctaUrl)}" class="btn btn-fill" target="_blank" rel="noopener">${ctaLabel}</a>` : ""}
        <a href="../#shows" class="btn">All Shows</a>
      </div>
    </section>
  </div>
</main>
</body>
</html>
`;
}

function clearGeneratedEventPages() {
  fs.mkdirSync(EVENTS_DIR, { recursive: true });
  for (const entry of fs.readdirSync(EVENTS_DIR, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".html")) {
      fs.unlinkSync(path.join(EVENTS_DIR, entry.name));
    }
  }
}

function writeEventPages(events) {
  clearGeneratedEventPages();

  for (const event of events) {
    if (!event.id) continue;
    fs.writeFileSync(path.join("public", getEventPath(event)), renderEventPage(event));
  }
}

function writeSitemap(events) {
  const today = new Date().toISOString().slice(0, 10);
  const eventUrls = events
    .filter((event) => event.id)
    .map((event) => `  <url>
    <loc>${escapeXml(getEventUrl(event))}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`)
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
${eventUrls}
</urlset>
`;

  fs.writeFileSync(SITEMAP_PATH, sitemap);
}

function normalizeEvents(events) {
  const now = new Date();

  return events
    .map((event) => ({
      id: event.id || null,
      name: event.name || "",
      description: event.description || "",
      start_time: event.start_time || null,
      end_time: event.end_time || null,
      ticket_uri: event.ticket_uri || null,
      cover: event.cover || null,
      place: event.place || null
    }))
    .filter((event) => {
      const start = parseDate(event.start_time);
      return start && start >= now;
    })
    .sort((a, b) => parseDate(a.start_time) - parseDate(b.start_time));
}

function normalizePhotos(photos) {
  return photos
    .map((photo) => ({
      id: photo.id || null,
      name: photo.name || "",
      created_time: photo.created_time || null,
      images: Array.isArray(photo.images) ? photo.images : [],
      link: photo.link || null
    }))
    .slice(0, 12);
}

async function fetchEvents() {
  const fields = "id,name,start_time,end_time,place{name,location},cover,ticket_uri,description";
  const url = `${BASE_URL}/${FB_PAGE_ID}/events?fields=${encodeURIComponent(fields)}&limit=50&access_token=${encodeURIComponent(FB_PAGE_TOKEN)}`;
  const events = await fetchAllPages(url);
  return normalizeEvents(events);
}

async function fetchPhotos() {
  const fields = "id,name,created_time,images,link";
  const url = `${BASE_URL}/${FB_PAGE_ID}/photos?fields=${encodeURIComponent(fields)}&type=uploaded&limit=12&access_token=${encodeURIComponent(FB_PAGE_TOKEN)}`;
  const photos = await fetchAllPages(url);
  return normalizePhotos(photos);
}

async function main() {
  ensureDataDir();

  if (GENERATE_FROM_CACHE) {
    const events = fs.existsSync(EVENTS_PATH) ? JSON.parse(fs.readFileSync(EVENTS_PATH, "utf8")) : [];
    writeEventPages(events);
    writeSitemap(events);
    console.log(`Wrote ${events.length} cached event pages to ${EVENTS_DIR}`);
    return;
  }

  const events = await fetchEvents();
  writeJson(EVENTS_PATH, events);
  writeEventPages(events);
  writeSitemap(events);
  console.log(`Wrote ${events.length} events to ${EVENTS_PATH}`);
  console.log(`Wrote ${events.length} event pages to ${EVENTS_DIR}`);

  try {
    const photos = await fetchPhotos();
    writeJson(PHOTOS_PATH, photos);
    console.log(`Wrote ${photos.length} photos to ${PHOTOS_PATH}`);
  } catch (error) {
    console.warn(`Facebook photos sync failed; leaving ${PHOTOS_PATH} unchanged.`);
    console.warn(error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
