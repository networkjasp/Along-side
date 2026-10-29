// ---------------------------------------------------------------------------
// Website Manager sign-in: username + password checked on the server.
//
// The password is never stored in the website: only a salted scrypt hash lives
// here, in server code that Netlify runs but never sends to browsers.
// To change the login without touching code, set these in Netlify →
// Project configuration → Environment variables:
//   ADMIN_USERNAME       (default: Jadian)
//   ADMIN_PASSWORD_HASH  (create with: node tools/hash-password.mjs "new password")
//
// Sessions: an HttpOnly, Secure, SameSite=Strict cookie, HMAC-signed with a
// random secret kept in Netlify Blobs (or SESSION_SECRET), valid for 8 hours.
// Brute force: 5 wrong attempts from one address locks it out for 15 minutes.
// ---------------------------------------------------------------------------
import { scryptSync, timingSafeEqual, randomBytes, createHmac, createHash } from 'node:crypto';

const DEFAULT_USERNAME = 'Jadian';
const DEFAULT_PASSWORD_HASH = 'scrypt$16384$8$1$T552DWqeo9MedAbmdSAtCA$uPv1FCm2p68tDaBibO5wONbbqV9LYWtvg0b8NpzLrMekAfn-EP5NnlT1zyno8IC8a9sRQNxnAFnBk6dJ6WZfgw';

export const COOKIE = 'al_admin';
export const SESSION_HOURS = 8;
export const MAX_FAILS = 5;
export const LOCK_MINUTES = 15;

const b64 = (s) => Buffer.from(s).toString('base64url');
const unb64 = (s) => Buffer.from(s, 'base64url').toString();
const safeEq = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export function hashPassword(password, salt = randomBytes(16).toString('base64url')) {
  const h = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('base64url');
  return `scrypt$16384$8$1$${salt}$${h}`;
}

export function verifyPassword(password, stored) {
  const [alg, N, r, p, salt, hash] = String(stored).split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const got = scryptSync(String(password), salt, 64, { N: +N, r: +r, p: +p }).toString('base64url');
  return safeEq(got, hash);
}

function readCookie(req, name) {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1);
  }
  return null;
}

export function createAuth({ store, env = {}, now = () => Date.now() }) {
  const username = env.ADMIN_USERNAME || DEFAULT_USERNAME;
  const passwordHash = env.ADMIN_PASSWORD_HASH || DEFAULT_PASSWORD_HASH;
  const secure = env.INSECURE_COOKIES === '1' ? '' : '; Secure'; // local tests only

  async function secret() {
    if (env.SESSION_SECRET) return env.SESSION_SECRET;
    let s = await store.get('session-secret');
    if (!s) { s = randomBytes(32).toString('hex'); await store.set('session-secret', s); }
    return s;
  }
  const sign = async (data) => createHmac('sha256', await secret()).update(data).digest('base64url');
  const ipKey = (ip) => 'fail-' + createHash('sha256').update(String(ip || 'unknown')).digest('hex').slice(0, 32);

  return {
    username,

    async getUser(req) {
      const c = readCookie(req, COOKIE);
      if (!c || !c.includes('.')) return null;
      const [data, sig] = c.split('.');
      if (!safeEq(sig, await sign(data))) return null;
      let s; try { s = JSON.parse(unb64(data)); } catch { return null; }
      if (!s || s.u !== username || typeof s.exp !== 'number' || s.exp < now()) return null;
      return { email: s.u, roles: ['admin'] };
    },

    /** Returns { ok, status, error, cookie } */
    async login(body, ip) {
      const key = ipKey(ip);
      const rec = (await store.get(key, { type: 'json' })) || { n: 0, t: now() };
      if (rec.n >= MAX_FAILS && now() - rec.t < LOCK_MINUTES * 60e3) {
        return { ok: false, status: 429, error: `Too many attempts. Please wait ${LOCK_MINUTES} minutes and try again.` };
      }
      const u = typeof body?.username === 'string' ? body.username.trim() : '';
      const p = typeof body?.password === 'string' ? body.password : '';
      const good = u.toLowerCase() === username.toLowerCase() && p.length <= 200 && verifyPassword(p, passwordHash);
      if (!good) {
        const fresh = now() - rec.t >= LOCK_MINUTES * 60e3;
        await store.setJSON(key, { n: (fresh ? 0 : rec.n) + 1, t: fresh ? now() : rec.t });
        return { ok: false, status: 401, error: 'Username or password is incorrect.' };
      }
      await store.delete(key);
      const data = b64(JSON.stringify({ u: username, exp: now() + SESSION_HOURS * 3600e3 }));
      const cookie = `${COOKIE}=${data}.${await sign(data)}; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
      return { ok: true, status: 200, cookie };
    },

    logoutCookie() {
      return `${COOKIE}=; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=0`;
    },
  };
}
