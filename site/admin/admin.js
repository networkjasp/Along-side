(function () {
'use strict';
// Alongside Website Manager (browser). Plain script, no build step needed.
// All text is inserted with textContent (never innerHTML) so content can't inject code.


const $ = (id) => document.getElementById(id);
const CAT = { campaigns: 'Campaigns', branding: 'Branding', communications: 'Communications', digital: 'Digital' };
const MAX_SIDE = 2000;           // longest side after resizing
const KEEP_IF_UNDER = 1.5e6;     // upload untouched if already small enough

let state = { portfolio: [], founder: { name: '', photo: '', alt: '' } };
let editIndex = -1;              // -1 = adding
let pendingProjectFile = null;   // processed Blob waiting to upload
let pendingFounderFile = null;

/* ---------------- UI helpers ---------------- */
let toastTimer;
function toast(msg, isErr = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, isErr ? 6000 : 3500);
}
function show(id) {
  ['loading', 'auth', 'app'].forEach((x) => { $(x).hidden = x !== id; });
}
function busy(btn, on, label) {
  if (!btn) return;
  if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'Saving…'; btn.disabled = true; }
  else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
}
function el(tag, attrs = {}, text) {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') n.className = v; else if (k in n && k !== 'list') n[k] = v; else n.setAttribute(k, v);
  });
  if (text != null) n.textContent = text;
  return n;
}
// Media paths are stored site-relative (/media/…, /assets/…); the admin lives in /admin/.
const viewSrc = (src) => (src && src.startsWith('/') ? src : src || '');

/* ---------------- API ---------------- */
async function api(path, opts = {}) {
  const res = await fetch('/api/admin/' + path, { credentials: 'same-origin', ...opts });
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  if (res.status === 401) { showLogin(); throw new Error('Please sign in.'); }
  if (!res.ok) throw new Error(data.error || `Something went wrong (${res.status}).`);
  return data;
}
const putJSON = (path, body) => api(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

async function uploadImage(blob, name) {
  const fd = new FormData();
  fd.append('file', blob, name);
  const { url } = await api('upload', { method: 'POST', body: fd });
  return url;
}

/* ---------------- image processing (resize + strip location data) ---------------- */
async function prepareImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Please choose a JPG, PNG or WebP image.');
  if (file.size > 25e6) throw new Error('That image is very large. Please choose one under 25 MB.');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  // Small PNG/WebP (e.g. logos with transparency) are kept as they are.
  if (scale === 1 && file.size <= KEEP_IF_UNDER && file.type !== 'image/jpeg') return { blob: file, name: file.name };
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const keepAlpha = file.type !== 'image/jpeg';
  if (!keepAlpha) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
  ctx.drawImage(bmp, 0, 0, w, h);
  let type = keepAlpha ? 'image/webp' : 'image/jpeg';
  let blob = await new Promise((r) => canvas.toBlob(r, type, 0.86));
  if (!blob || blob.type !== type) { type = keepAlpha ? 'image/png' : 'image/jpeg'; blob = await new Promise((r) => canvas.toBlob(r, type, 0.86)); }
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[type];
  return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.' + ext };
}

/* ---------------- portfolio list ---------------- */
function renderProjects() {
  const list = $('projects');
  list.replaceChildren();
  $('projects-empty').hidden = state.portfolio.length > 0;
  state.portfolio.forEach((p, i) => {
    const li = el('li', { class: 'project' + (p.hidden ? ' is-hidden' : '') });
    const th = el('div', { class: 'thumb' });
    th.append(el('img', { src: viewSrc(p.image), alt: '', loading: 'lazy' }));
    const info = el('div');
    info.append(el('p', { class: 'p-title' }, p.title));
    const meta = el('div', { class: 'p-meta' });
    meta.append(el('span', { class: 'tag' }, CAT[p.category] || p.category));
    if (p.show_on_home) meta.append(el('span', { class: 'tag home' }, 'Home page'));
    if (p.hidden) meta.append(el('span', { class: 'tag draft' }, 'Hidden (draft)'));
    if (p.link) meta.append(el('span', { class: 'tag' }, 'Has link'));
    info.append(meta);
    const act = el('div', { class: 'p-actions' });
    const mk = (label, action, aria, extra = '') => {
      const b = el('button', { type: 'button', class: 'icon-btn ' + extra }, label);
      b.dataset.action = action; b.dataset.index = String(i);
      b.setAttribute('aria-label', `${aria}: ${p.title}`);
      return b;
    };
    const up = mk('↑', 'up', 'Move up'); up.disabled = i === 0;
    const dn = mk('↓', 'down', 'Move down'); dn.disabled = i === state.portfolio.length - 1;
    act.append(up, dn, mk('Edit', 'edit', 'Edit'), mk('Remove', 'remove', 'Remove', 'danger'));
    li.append(th, info, act);
    list.append(li);
  });
}

async function savePortfolio(next, message) {
  const data = await putJSON('portfolio', { portfolio: next });
  state = data.content;
  renderProjects();
  toast(message + ' It is live on the website now.');
}

$('projects').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-action]');
  if (!b) return;
  const i = Number(b.dataset.index);
  const items = state.portfolio.slice();
  try {
    if (b.dataset.action === 'edit') return openProject(i);
    if (b.dataset.action === 'remove') {
      $('confirm-text').textContent = `“${items[i].title}” will be removed from the website.`;
      const dlg = $('confirm-dialog');
      dlg.returnValue = '';
      dlg.showModal();
      dlg.addEventListener('close', async () => {
        if (dlg.returnValue !== 'yes') return;
        items.splice(i, 1);
        try { await savePortfolio(items, 'Project removed.'); } catch (err) { toast(err.message, true); }
      }, { once: true });
      return;
    }
    const j = b.dataset.action === 'up' ? i - 1 : i + 1;
    [items[i], items[j]] = [items[j], items[i]];
    b.disabled = true;
    await savePortfolio(items, 'Order saved.');
    const again = $('projects').querySelector(`button[data-action="${b.dataset.action}"][data-index="${j}"]`);
    if (again && !again.disabled) again.focus();
  } catch (err) { toast(err.message, true); }
});

/* ---------------- add / edit dialog ---------------- */
function openProject(i) {
  editIndex = i;
  pendingProjectFile = null;
  const p = i >= 0 ? state.portfolio[i] : { title: '', category: 'campaigns', image: '', alt: '', link: '', show_on_home: false, hidden: false };
  $('dlg-h').textContent = i >= 0 ? 'Edit project' : 'Add project';
  $('p-title').value = p.title;
  $('p-category').value = p.category;
  $('p-alt').value = p.alt || '';
  $('p-link').value = p.link || '';
  $('p-home').checked = !!p.show_on_home;
  $('p-hidden').checked = !!p.hidden;
  $('p-file').value = '';
  $('p-error').textContent = '';
  const pv = $('p-preview');
  pv.hidden = !p.image;
  if (p.image) pv.src = viewSrc(p.image);
  $('project-dialog').showModal();
  $('p-title').focus();
}
$('add-project').addEventListener('click', () => openProject(-1));
$('p-cancel').addEventListener('click', () => $('project-dialog').close());

$('p-file').addEventListener('change', async () => {
  const f = $('p-file').files[0];
  $('p-error').textContent = '';
  if (!f) return;
  try {
    pendingProjectFile = await prepareImage(f);
    const pv = $('p-preview');
    pv.src = URL.createObjectURL(pendingProjectFile.blob);
    pv.hidden = false;
    if (!$('p-alt').value) $('p-alt').value = $('p-title').value;
  } catch (err) { pendingProjectFile = null; $('p-file').value = ''; $('p-error').textContent = err.message; }
});

$('project-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('p-error');
  err.textContent = '';
  const title = $('p-title').value.trim();
  const link = $('p-link').value.trim();
  const existing = editIndex >= 0 ? state.portfolio[editIndex] : null;
  if (!title) { err.textContent = 'Please enter a project title.'; $('p-title').focus(); return; }
  if (!pendingProjectFile && !existing?.image) { err.textContent = 'Please choose an image.'; $('p-file').focus(); return; }
  if (link && !/^https:\/\//i.test(link)) { err.textContent = 'The link must start with https://'; $('p-link').focus(); return; }
  const homeCount = state.portfolio.filter((p, i) => p.show_on_home && i !== editIndex).length;
  const btn = $('p-save');
  busy(btn, true);
  try {
    let image = existing?.image || '';
    if (pendingProjectFile) { btn.textContent = 'Uploading image…'; image = await uploadImage(pendingProjectFile.blob, pendingProjectFile.name); }
    const item = {
      title, category: $('p-category').value, image,
      alt: $('p-alt').value.trim() || title, link,
      show_on_home: $('p-home').checked, hidden: $('p-hidden').checked,
    };
    const items = state.portfolio.slice();
    if (editIndex >= 0) items[editIndex] = item; else items.unshift(item);
    await savePortfolio(items, editIndex >= 0 ? 'Project updated.' : 'Project added.');
    $('project-dialog').close();
    if (item.show_on_home && homeCount >= 4) toast('Saved. Note: only the first four “Home page” projects are shown on the Home page.');
  } catch (ex) { err.textContent = ex.message; }
  finally { busy(btn, false); }
});

/* ---------------- founder ---------------- */
function renderFounder() {
  const f = state.founder;
  $('founder-name').value = f.name || '';
  $('founder-alt').value = f.alt || '';
  const has = !!f.photo;
  $('founder-img').hidden = !has;
  $('founder-placeholder').hidden = has;
  if (has) { $('founder-img').src = viewSrc(f.photo); $('founder-img').alt = f.alt || f.name; }
  $('founder-caption').textContent = has ? 'Current photo' : 'No photo yet. The logo mark is shown instead.';
  $('founder-remove').hidden = !has;
  $('founder-file').value = '';
  pendingFounderFile = null;
}
$('founder-file').addEventListener('change', async () => {
  const f = $('founder-file').files[0];
  if (!f) return;
  try {
    pendingFounderFile = await prepareImage(f);
    $('founder-img').src = URL.createObjectURL(pendingFounderFile.blob);
    $('founder-img').hidden = false;
    $('founder-placeholder').hidden = true;
    $('founder-caption').textContent = 'New photo, not saved yet. Click Save.';
  } catch (err) { pendingFounderFile = null; $('founder-file').value = ''; toast(err.message, true); }
});
async function saveFounder(photoOverride) {
  const name = $('founder-name').value.trim();
  if (!name) { toast('Please enter a name.', true); $('founder-name').focus(); return; }
  let photo = photoOverride !== undefined ? photoOverride : state.founder.photo;
  if (photoOverride === undefined && pendingFounderFile) photo = await uploadImage(pendingFounderFile.blob, pendingFounderFile.name);
  const data = await putJSON('founder', { founder: { name, photo, alt: $('founder-alt').value.trim() || name } });
  state = data.content;
  renderFounder();
}
$('founder-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.submitter || $('founder-form').querySelector('button[type=submit]');
  busy(btn, true);
  try { await saveFounder(); toast('Founder photo saved. It is live on the About page now.'); }
  catch (err) { toast(err.message, true); }
  finally { busy(btn, false); }
});
$('founder-remove').addEventListener('click', async () => {
  const btn = $('founder-remove');
  busy(btn, true, 'Removing…');
  try { await saveFounder(''); toast('Photo removed. The logo mark is shown instead.'); }
  catch (err) { toast(err.message, true); }
  finally { busy(btn, false); }
});

/* ---------------- tabs ---------------- */
const tabs = [['tab-portfolio', 'panel-portfolio'], ['tab-founder', 'panel-founder']];
function selectTab(id) {
  tabs.forEach(([t, p]) => {
    const on = t === id;
    $(t).setAttribute('aria-selected', String(on));
    $(t).tabIndex = on ? 0 : -1;
    $(p).hidden = !on;
  });
}
tabs.forEach(([t], idx) => {
  $(t).addEventListener('click', () => selectTab(t));
  $(t).addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length][0];
    selectTab(next); $(next).focus();
  });
});

/* ---------------- sign in ---------------- */
async function enterApp() {
  $('toast').className = 'toast';
  const data = await api('content');
  state = { portfolio: data.portfolio, founder: data.founder };
  $('user-email').textContent = data.user?.name || '';
  $('bar-user').hidden = false;
  renderProjects();
  renderFounder();
  show('app');
}
function showLogin() {
  $('bar-user').hidden = true;
  show('auth');
  $('login-user').focus();
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.submitter || $('login-form').querySelector('button[type=submit]');
  const err = $('login-error');
  err.textContent = '';
  const username = $('login-user').value.trim(), password = $('login-password').value;
  if (!username || !password) { err.textContent = 'Please enter your username and password.'; return; }
  busy(btn, true, 'Signing in…');
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Sign-in failed.');
    $('login-password').value = '';
    await enterApp();
  } catch (ex) { err.textContent = ex.message; $('login-password').select(); }
  finally { busy(btn, false); }
});

$('logout').addEventListener('click', async () => {
  try { await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }); } catch { /* ignore */ }
  state = { portfolio: [], founder: {} };
  showLogin();
});

(async function start() {
  try { await enterApp(); } catch { showLogin(); }
})();
})();
