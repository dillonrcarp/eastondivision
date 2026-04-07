const fs = require("fs");
const path = require("path");

const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION || "v25.0";

if (!FB_PAGE_TOKEN || !FB_PAGE_ID) {
  throw new Error("Missing required env vars: FB_PAGE_TOKEN and FB_PAGE_ID");
}

const BASE_URL = `https://graph.facebook.com/${FB_GRAPH_VERSION}`;
const DATA_DIR = path.join("public", "data");
const EVENTS_PATH = path.join(DATA_DIR, "events.json");
const PHOTOS_PATH = path.join(DATA_DIR, "photos.json");

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
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
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

  const events = await fetchEvents();
  writeJson(EVENTS_PATH, events);
  console.log(`Wrote ${events.length} events to ${EVENTS_PATH}`);

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
