// ---------------------------------------------------------------------------
// Alongside Website Manager: shared server logic.
//
// Content (portfolio list + founder photo) is one JSON document in the Netlify
// Blobs store "site-content". Uploaded images live in the store "site-media"
// and are served at /media/<key>.
//
// Every function receives its dependencies (stores, current user), so the same
// code is unit-tested locally with in-memory stores.
// ---------------------------------------------------------------------------

export const CATEGORIES = ['campaigns', 'branding', 'communications', 'digital'];
export const CONTENT_KEY = 'content.json';
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // the browser resizes first, so real uploads are ~0.3–1.5 MB
export const MAX_ITEMS = 100;
export const ORPHAN_GRACE_MS = 6 * 60 * 60 * 1000; // never delete an upload younger than 6h (it may be mid-edit)

const MEDIA_KEY_RE = /^(\d{13})-([a-f0-9-]{36})\.(jpg|png|webp)$/;
const MEDIA_PATH_RE = /^\/media\/(\d{13}-[a-f0-9-]{36}\.(?:jpg|png|webp))$/;
const ASSET_PATH_RE = /^\/assets\/[A-Za-z0-9_\-/.]+\.(?:jpg|jpeg|png|webp|svg)$/;
const WIX_RE = /^https:\/\/static\.wixstatic\.com\/[^\s"'<>]+$/;

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/* ---------------- validation ---------------- */

function str(v, field, { min = 0, max = 200 } = {}) {
  const s = typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F]/g, ' ').trim() : '';
  if (s.length < min) throw new HttpError(400, `${field} is required.`);
  if (s.length > max) throw new HttpError(400, `${field} must be ${max} characters or fewer.`);
  return s;
}

export function isAllowedImage(src) {
  return typeof src === 'string' && (MEDIA_PATH_RE.test(src) || ASSET_PATH_RE.test(src) || WIX_RE.test(src));
}

function httpsLink(v) {
  const s = str(v, 'Link', { max: 500 });
  if (!s) return '';
  let u;
  try { u = new URL(s); } catch { throw new HttpError(400, 'Link must be a full web address starting with https://'); }
  if (u.protocol !== 'https:') throw new HttpError(400, 'Link must start with https://');
  return u.href;
}

export function cleanItem(raw, i) {
  if (!raw || typeof raw !== 'object') throw new HttpError(400, `Project ${i + 1} is invalid.`);
  const title = str(raw.title, `Project ${i + 1}: title`, { min: 1, max: 140 });
  if (!CATEGORIES.includes(raw.category)) throw new HttpError(400, `Project “${title}”: choose a category.`);
  if (!isAllowedImage(raw.image)) throw new HttpError(400, `Project “${title}”: please upload an image.`);
  return {
    title,
    category: raw.category,
    image: raw.image,
    alt: str(raw.alt, `Project “${title}”: image description`, { max: 250 }) || title,
    link: httpsLink(raw.link),
    show_on_home: raw.show_on_home === true,
    hidden: raw.hidden === true,
  };
}

export function cleanPortfolio(list) {
  if (!Array.isArray(list)) throw new HttpError(400, 'Portfolio must be a list.');
  if (list.length > MAX_ITEMS) throw new HttpError(400, `A maximum of ${MAX_ITEMS} projects is allowed.`);
  return list.map(cleanItem);
}

export function cleanFounder(raw) {
  raw = raw || {};
  const photo = raw.photo ? String(raw.photo) : '';
  if (photo && !isAllowedImage(photo)) throw new HttpError(400, 'Please upload the photo again.');
  const name = str(raw.name, 'Name', { min: 1, max: 120 });
  return { name, photo, alt: str(raw.alt, 'Photo description', { max: 250 }) || name };
}

/* ---------------- content ---------------- */

export async function readContent(contentStore, defaults) {
  const saved = await contentStore.get(CONTENT_KEY, { type: 'json' });
  if (saved && Array.isArray(saved.portfolio) && saved.founder) return saved;
  return { portfolio: defaults.portfolio, founder: defaults.founder, updatedAt: null };
}

export function publicView(content) {
  return {
    portfolio: content.portfolio.filter((i) => !i.hidden).map(({ hidden, ...rest }) => rest),
    founder: content.founder,
    updatedAt: content.updatedAt,
  };
}

function referencedMedia(content) {
  const keys = new Set();
  const add = (src) => { const m = MEDIA_PATH_RE.exec(src || ''); if (m) keys.add(m[1]); };
  content.portfolio.forEach((i) => add(i.image));
  add(content.founder.photo);
  return keys;
}

async function removeOrphans(mediaStore, content, now = Date.now()) {
  const keep = referencedMedia(content);
  const { blobs } = await mediaStore.list();
  let removed = 0;
  for (const { key } of blobs) {
    const m = MEDIA_KEY_RE.exec(key);
    if (!m || keep.has(key)) continue;
    if (now - Number(m[1]) < ORPHAN_GRACE_MS) continue;
    await mediaStore.delete(key);
    removed++;
  }
  return removed;
}

/* ---------------- image upload ---------------- */

function sniff(bytes) {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { ext: 'png', type: 'image/png' };
  if (bytes.length > 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return { ext: 'webp', type: 'image/webp' };
  return null;
}

export async function storeUpload(mediaStore, file, user) {
  if (!file || typeof file.arrayBuffer !== 'function') throw new HttpError(400, 'No image received.');
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, 'That image is too large (maximum 5 MB).');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) throw new HttpError(415, 'Please upload a JPG, PNG or WebP image.');
  const key = `${Date.now()}-${crypto.randomUUID()}.${kind.ext}`;
  await mediaStore.set(key, bytes.buffer, {
    metadata: { contentType: kind.type, uploadedBy: user?.email || '', uploadedAt: new Date().toISOString() },
  });
  return { key, url: `/media/${key}` };
}

/* ---------------- HTTP helpers ---------------- */

export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...extra },
  });

export const errorResponse = (e) =>
  e instanceof HttpError ? json({ error: e.message }, e.status, { 'Cache-Control': 'no-store' })
    : (console.error(e), json({ error: 'Something went wrong. Please try again.' }, 500, { 'Cache-Control': 'no-store' }));

/* ---------------- handlers ---------------- */

export async function handlePublicContent(deps) {
  try {
    const content = await readContent(deps.contentStore, deps.defaults);
    return json(publicView(content), 200, { 'Cache-Control': 'public, max-age=0, must-revalidate' });
  } catch (e) { return errorResponse(e); }
}

export async function handleMedia(req, deps) {
  const key = decodeURIComponent(new URL(req.url).pathname.replace(/^\/media\//, ''));
  if (!MEDIA_KEY_RE.test(key)) return new Response('Not found', { status: 404 });
  const entry = await deps.mediaStore.getWithMetadata(key, { type: 'arrayBuffer' });
  if (!entry) return new Response('Not found', { status: 404 });
  return new Response(entry.data, {
    headers: {
      'Content-Type': entry.metadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}

/** CSRF protection: writes must come from this site's own pages. */
export function verifySameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin || origin !== new URL(req.url).origin) throw new HttpError(403, 'Request blocked (wrong origin).');
}

/**
 * deps: { contentStore, mediaStore, defaults, auth (see auth.mjs), ip }
 */
export async function handleAdmin(req, deps) {
  try {
    const route = new URL(req.url).pathname.replace(/^\/api\/admin\/?/, '');
    const method = req.method.toUpperCase();
    const noStore = { 'Cache-Control': 'no-store' };
    if (method !== 'GET') verifySameOrigin(req);

    if (route === 'login' && method === 'POST') {
      let body = {};
      try { body = await req.json(); } catch { /* empty */ }
      const r = await deps.auth.login(body, deps.ip);
      if (!r.ok) return json({ error: r.error }, r.status, noStore);
      return json({ ok: true, user: deps.auth.username }, 200, { ...noStore, 'Set-Cookie': r.cookie });
    }
    if (route === 'logout' && method === 'POST') {
      return json({ ok: true }, 200, { ...noStore, 'Set-Cookie': deps.auth.logoutCookie() });
    }

    const user = await deps.auth.getUser(req);
    if (!user) throw new HttpError(401, 'Please sign in.');

    if (route === 'content' && method === 'GET') {
      return json({ ...(await readContent(deps.contentStore, deps.defaults)), user: { name: user.email } }, 200, noStore);
    }

    if (route === 'upload' && method === 'POST') {
      const form = await req.formData();
      return json(await storeUpload(deps.mediaStore, form.get('file'), user), 201, noStore);
    }

    if ((route === 'portfolio' || route === 'founder') && method === 'PUT') {
      let body;
      try { body = await req.json(); } catch { throw new HttpError(400, 'Invalid request.'); }
      const current = await readContent(deps.contentStore, deps.defaults);
      const next = { ...current, updatedAt: new Date().toISOString(), updatedBy: user.email };
      if (route === 'portfolio') next.portfolio = cleanPortfolio(body.portfolio);
      else next.founder = cleanFounder(body.founder);
      await deps.contentStore.setJSON(CONTENT_KEY, next);
      const removed = await removeOrphans(deps.mediaStore, next);
      return json({ ok: true, content: next, removedImages: removed }, 200, noStore);
    }

    throw new HttpError(404, 'Unknown action.');
  } catch (e) {
    return errorResponse(e);
  }
}
