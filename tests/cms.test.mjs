// Unit tests for the Website Manager API (run: npm test). Uses in-memory stores.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleAdmin, handlePublicContent, handleMedia, CONTENT_KEY } from '../netlify/lib/cms.mjs';

function memStore() {
  const m = new Map();
  return {
    m,
    async get(k, o) { const v = m.get(k); if (!v) return null; return o?.type === 'json' ? JSON.parse(v.data) : v.data; },
    async getWithMetadata(k) { const v = m.get(k); return v ? { data: v.data, metadata: v.metadata } : null; },
    async set(k, data, o) { m.set(k, { data, metadata: o?.metadata || {} }); },
    async setJSON(k, obj) { m.set(k, { data: JSON.stringify(obj), metadata: {} }); },
    async list() { return { blobs: [...m.keys()].map((key) => ({ key })) }; },
    async delete(k) { m.delete(k); },
  };
}
const defaults = {
  portfolio: [{ title: 'Wix item', category: 'campaigns', image: 'https://static.wixstatic.com/media/x.jpg', alt: 'x', link: '', show_on_home: true }],
  founder: { name: 'Stephné du Toit-Smit', photo: '', alt: 'Stephné' },
};
const admin = { email: 'stephne@alongside.co.za', roles: ['admin'] };
const deps = (over = {}) => ({ contentStore: memStore(), mediaStore: memStore(), defaults, getUser: async () => admin, verifyOrigin: () => {}, ...over });
const req = (method, path, body, headers = {}) => new Request('https://alongside.co.za' + path, { method, body, headers });
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]);

test('public content falls back to defaults', async () => {
  const r = await handlePublicContent(deps());
  const j = await r.json();
  assert.equal(j.portfolio.length, 1);
  assert.equal(j.founder.name, 'Stephné du Toit-Smit');
});

test('admin requires a signed-in user', async () => {
  const r = await handleAdmin(req('GET', '/api/admin/content'), deps({ getUser: async () => null }));
  assert.equal(r.status, 401);
});

test('admin requires admin/editor role', async () => {
  const r = await handleAdmin(req('GET', '/api/admin/content'), deps({ getUser: async () => ({ email: 'a@b.c', roles: [] }) }));
  assert.equal(r.status, 403);
});

test('writes are origin-checked', async () => {
  const d = deps({ verifyOrigin: () => { const e = new Error('bad'); e.name = 'AuthError'; e.status = 403; throw e; } });
  const r = await handleAdmin(req('PUT', '/api/admin/founder', JSON.stringify({ founder: { name: 'X' } })), d);
  assert.equal(r.status, 403);
});

test('upload accepts real images only, then add + remove a project', async () => {
  const d = deps();
  let fd = new FormData(); fd.append('file', new Blob([new TextEncoder().encode('<script>alert(1)</script>')]), 'x.jpg');
  assert.equal((await handleAdmin(req('POST', '/api/admin/upload', fd), d)).status, 415);

  fd = new FormData(); fd.append('file', new Blob([jpeg], { type: 'image/jpeg' }), 'work.jpg');
  const up = await handleAdmin(req('POST', '/api/admin/upload', fd), d);
  assert.equal(up.status, 201);
  const { url, key } = await up.json();
  assert.match(url, /^\/media\/\d{13}-[a-f0-9-]{36}\.jpg$/);

  const media = await handleMedia(req('GET', url), d);
  assert.equal(media.headers.get('content-type'), 'image/jpeg');

  const item = { title: 'New <b>project</b>', category: 'branding', image: url, alt: '', link: '', show_on_home: false };
  let r = await handleAdmin(req('PUT', '/api/admin/portfolio', JSON.stringify({ portfolio: [item, ...defaults.portfolio] })), d);
  assert.equal(r.status, 200);
  const pub = await (await handlePublicContent(d)).json();
  assert.equal(pub.portfolio.length, 2);
  assert.equal(pub.portfolio[0].alt, 'New <b>project</b>'); // stored as text; pages render with textContent

  // remove it: image is kept during the grace period, then cleaned up
  r = await handleAdmin(req('PUT', '/api/admin/portfolio', JSON.stringify({ portfolio: defaults.portfolio })), d);
  assert.equal(d.mediaStore.m.has(key), true);
  const old = key.replace(/^\d{13}/, String(Date.now() - 7 * 3600e3));
  d.mediaStore.m.set(old, d.mediaStore.m.get(key)); d.mediaStore.m.delete(key);
  r = await handleAdmin(req('PUT', '/api/admin/portfolio', JSON.stringify({ portfolio: defaults.portfolio })), d);
  assert.equal((await r.json()).removedImages, 1);
});

test('rejects unsafe links and images', async () => {
  const d = deps();
  const bad = [
    { title: 'x', category: 'branding', image: 'javascript:alert(1)' },
    { title: 'x', category: 'branding', image: 'https://evil.example/x.jpg' },
    { title: 'x', category: 'branding', image: defaults.portfolio[0].image, link: 'javascript:alert(1)' },
    { title: 'x', category: 'nope', image: defaults.portfolio[0].image },
  ];
  for (const b of bad) {
    const r = await handleAdmin(req('PUT', '/api/admin/portfolio', JSON.stringify({ portfolio: [b] })), d);
    assert.equal(r.status, 400, JSON.stringify(b));
  }
});

test('hidden projects are excluded from the public view', async () => {
  const d = deps();
  const items = [{ ...defaults.portfolio[0], hidden: true }, { ...defaults.portfolio[0], title: 'Shown' }];
  await handleAdmin(req('PUT', '/api/admin/portfolio', JSON.stringify({ portfolio: items })), d);
  const pub = await (await handlePublicContent(d)).json();
  assert.deepEqual(pub.portfolio.map((i) => i.title), ['Shown']);
  assert.ok(JSON.parse(d.contentStore.m.get(CONTENT_KEY).data).portfolio[0].hidden);
});

test('founder photo can be set and removed', async () => {
  const d = deps();
  const fd = new FormData(); fd.append('file', new Blob([jpeg]), 'me.jpg');
  const { url } = await (await handleAdmin(req('POST', '/api/admin/upload', fd), d)).json();
  let r = await handleAdmin(req('PUT', '/api/admin/founder', JSON.stringify({ founder: { name: 'Stephné', photo: url } })), d);
  assert.equal((await r.json()).content.founder.photo, url);
  r = await handleAdmin(req('PUT', '/api/admin/founder', JSON.stringify({ founder: { name: 'Stephné', photo: '' } })), d);
  assert.equal((await r.json()).content.founder.photo, '');
});

test('media route rejects path tricks', async () => {
  const r = await handleMedia(req('GET', '/media/..%2Fcontent.json'), deps());
  assert.equal(r.status, 404);
});
