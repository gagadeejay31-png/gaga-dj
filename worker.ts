import type { BookingInquiry, ContentCategory, ContentItem } from './src/types/content';

interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  ADMIN_SESSION_SECRET: string;
  ADMIN_PASSCODE?: string;
}

const ADMIN_EMAIL = 'gagadeejay31@gmail.com';
const CATEGORIES: ContentCategory[] = ['NEWS','MUSIC','VIDEOS','EVENTS','ADVERTISEMENTS','GALLERY','ANNOUNCEMENTS'];
const COOKIE = 'gaga_admin_session';
const SESSION_MS = 12 * 60 * 60 * 1000;

const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });

function b64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromB64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}
const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
async function digest(value: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}
async function derivePasscode(passcode: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(passcode), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 210000, hash: 'SHA-256' }, key, 256);
  return hex(new Uint8Array(bits));
}
async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign','verify']);
}
async function signSession(email: string, secret: string): Promise<string> {
  const payload = b64url(encoder.encode(JSON.stringify({ email, exp: Date.now() + SESSION_MS, nonce: crypto.randomUUID() })));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload)));
  return payload + '.' + b64url(signature);
}
function getToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim();
  const cookie = request.headers.get('cookie') || '';
  const part = cookie.split(';').map(v => v.trim()).find(v => v.startsWith(COOKIE + '='));
  return part ? decodeURIComponent(part.slice(COOKIE.length + 1)) : null;
}
function cookieHeader(token: string, maxAge = 43200): string {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
async function currentAdmin(request: Request, env: Env): Promise<{ email: string; tokenHash: string } | null> {
  const token = getToken(request);
  if (!token || !token.includes('.') || !env.ADMIN_SESSION_SECRET) return null;
  const [payload, signature] = token.split('.');
  try {
    const valid = await crypto.subtle.verify('HMAC', await hmacKey(env.ADMIN_SESSION_SECRET), fromB64url(signature), encoder.encode(payload));
    if (!valid) return null;
    const decoded = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as { email: string; exp: number };
    if (decoded.email?.toLowerCase() !== ADMIN_EMAIL || !decoded.exp || decoded.exp < Date.now()) return null;
    const tokenHash = await digest(token);
    const row = await env.DB.prepare('SELECT email FROM admin_sessions WHERE token_hash = ? AND expires_at > ?').bind(tokenHash, Date.now()).first<{email:string}>();
    return row?.email === ADMIN_EMAIL ? { email: row.email, tokenHash } : null;
  } catch { return null; }
}
async function issueSession(env: Env): Promise<string> {
  const token = await signSession(ADMIN_EMAIL, env.ADMIN_SESSION_SECRET);
  await env.DB.prepare('INSERT INTO admin_sessions (token_hash,email,expires_at) VALUES (?,?,?)')
    .bind(await digest(token), ADMIN_EMAIL, Date.now() + SESSION_MS).run();
  return token;
}
async function isConfigured(env: Env): Promise<boolean> {
  if (env.ADMIN_PASSCODE?.trim()) return true;
  return Boolean(await env.DB.prepare('SELECT email FROM admin_auth WHERE email = ?').bind(ADMIN_EMAIL).first());
}
async function readJson<T>(request: Request): Promise<T> {
  return await request.json() as T;
}
async function listContent(env: Env, publishedOnly: boolean): Promise<ContentItem[]> {
  const result = await env.DB.prepare(publishedOnly
    ? 'SELECT data FROM content_items WHERE published = 1 ORDER BY created_at DESC'
    : 'SELECT data FROM content_items ORDER BY created_at DESC').all<{data:string}>();
  return (result.results || []).map(row => JSON.parse(row.data) as ContentItem);
}
async function authorized(request: Request, env: Env): Promise<boolean> {
  return Boolean(await currentAdmin(request, env));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path.startsWith('/api/') || path.startsWith('/uploads/')) {
      try {
        if (path === '/api/content' && request.method === 'GET') {
          return json({ items: await listContent(env, true) });
        }
        if (path === '/api/inquiries' && request.method === 'POST') {
          const body = await readJson<Partial<BookingInquiry>>(request);
          if (typeof body.name !== 'string' || !body.name.trim() || typeof body.email !== 'string' || !body.email.trim()) {
            return json({ error: 'Name and email address are required.' }, 400);
          }
          const inquiry: BookingInquiry = {
            id: crypto.randomUUID(), type: body.type === 'RSVP' ? 'RSVP' : 'BOOKING',
            name: body.name.trim().slice(0,120), email: body.email.trim().slice(0,160),
            eventType: typeof body.eventType === 'string' ? body.eventType.trim().slice(0,120) : undefined,
            eventDate: typeof body.eventDate === 'string' ? body.eventDate.trim().slice(0,40) : undefined,
            venueCity: typeof body.venueCity === 'string' ? body.venueCity.trim().slice(0,160) : undefined,
            eventId: typeof body.eventId === 'string' ? body.eventId.trim().slice(0,80) : undefined,
            eventTitle: typeof body.eventTitle === 'string' ? body.eventTitle.trim().slice(0,180) : undefined,
            guestCount: typeof body.guestCount === 'string' ? body.guestCount.trim().slice(0,60) : undefined,
            notes: typeof body.notes === 'string' ? body.notes.trim().slice(0,2000) : undefined,
            createdAt: new Date().toISOString()
          };
          await env.DB.prepare('INSERT INTO inquiries (id,created_at,data) VALUES (?,?,?)')
            .bind(inquiry.id, Date.now(), JSON.stringify(inquiry)).run();
          return json({ ok: true, id: inquiry.id }, 201);
        }
        if (path === '/api/admin/status' && request.method === 'GET') {
          const admin = await currentAdmin(request, env);
          return json({ setupRequired: !(await isConfigured(env)), authenticated: Boolean(admin), email: admin?.email ?? null });
        }
        if (path === '/api/admin/setup' && request.method === 'POST') {
          if (await isConfigured(env)) return json({ error: 'Administrator passcode is already configured.' }, 409);
          const body = await readJson<{email:string;passcode:string}>(request);
          if (body.email?.trim().toLowerCase() !== ADMIN_EMAIL) return json({ error: 'Only the authorized administrator email can initialize access.' }, 403);
          if (typeof body.passcode !== 'string' || body.passcode.length < 8) return json({ error: 'Passcode must be at least 8 characters long.' }, 400);
          const salt = b64url(crypto.getRandomValues(new Uint8Array(16)));
          const hash = await derivePasscode(body.passcode, salt);
          try {
            await env.DB.prepare('INSERT INTO admin_auth (email,salt,hash,created_at) VALUES (?,?,?,?)')
              .bind(ADMIN_EMAIL,salt,hash,new Date().toISOString()).run();
          } catch { return json({ error: 'Administrator setup has already been completed.' }, 409); }
          const token = await issueSession(env);
          return json({ authenticated: true, email: ADMIN_EMAIL, token }, 201, { 'set-cookie': cookieHeader(token) });
        }
        if (path === '/api/admin/login' && request.method === 'POST') {
          const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
          const tracker = await env.DB.prepare('SELECT count,locked_until FROM login_attempts WHERE ip = ?').bind(ip).first<{count:number;locked_until:number}>();
          if (tracker && tracker.locked_until > Date.now()) return json({ error: 'Too many failed login attempts. Try again in a few minutes.' }, 429);
          const body = await readJson<{email:string;passcode:string}>(request);
          if (body.email?.trim().toLowerCase() !== ADMIN_EMAIL) return json({ error: 'Access denied. Only the authorized administrator may log in.' }, 403);
          if (!(await isConfigured(env))) return json({ error: 'First-time administrator passcode setup is required.' }, 400);
          let valid = false;
          if (env.ADMIN_PASSCODE?.trim()) {
            valid = (await digest(body.passcode || '')) === (await digest(env.ADMIN_PASSCODE));
          } else {
            const stored = await env.DB.prepare('SELECT salt,hash FROM admin_auth WHERE email = ?').bind(ADMIN_EMAIL).first<{salt:string;hash:string}>();
            if (stored && typeof body.passcode === 'string') valid = await derivePasscode(body.passcode, stored.salt) === stored.hash;
          }
          if (!valid) {
            const count = (tracker?.count || 0) + 1;
            const lockedUntil = count >= 5 ? Date.now() + 10 * 60 * 1000 : 0;
            await env.DB.prepare('INSERT INTO login_attempts (ip,count,locked_until) VALUES (?,?,?) ON CONFLICT(ip) DO UPDATE SET count=excluded.count, locked_until=excluded.locked_until').bind(ip,count,lockedUntil).run();
            return json({ error: 'Invalid administrator credentials.' }, 401);
          }
          await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();
          const token = await issueSession(env);
          return json({ authenticated: true, email: ADMIN_EMAIL, token }, 200, { 'set-cookie': cookieHeader(token) });
        }
        if (path === '/api/admin/logout' && request.method === 'POST') {
          const token = getToken(request);
          if (token) await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(await digest(token)).run();
          return json({ ok: true }, 200, { 'set-cookie': cookieHeader('',0) });
        }
        if (path.startsWith('/uploads/') && request.method === 'GET') {
          const key = path.slice('/uploads/'.length);
          const object = await env.MEDIA.get(key);
          if (!object) return new Response('Not found', { status: 404 });
          const headers = new Headers();
          object.writeHttpMetadata(headers);
          headers.set('etag', object.httpEtag);
          return new Response(object.body, { headers });
        }
        if (path.startsWith('/api/admin/')) {
          if (!(await authorized(request, env))) return json({ error: 'Administrator authentication required.' }, 401);
          if (path === '/api/admin/content' && request.method === 'GET') return json({ items: await listContent(env, false) });
          if (path === '/api/admin/inquiries' && request.method === 'GET') {
            const rows = await env.DB.prepare('SELECT data FROM inquiries ORDER BY created_at DESC').all<{data:string}>();
            return json({ inquiries: (rows.results || []).map(row => JSON.parse(row.data) as BookingInquiry) });
          }
          if (path === '/api/admin/upload' && request.method === 'POST') {
            const form = await request.formData();
            const file = form.get('file');
            if (!(file instanceof File)) return json({ error: 'No file selected.' }, 400);
            if (file.size > 100 * 1024 * 1024) return json({ error: 'File exceeds the 100 MB upload limit.' }, 413);
            if (!['image/','audio/','video/'].some(prefix => file.type.startsWith(prefix))) return json({ error: 'Unsupported file type. Upload images, audio mixes, or videos only.' }, 400);
            const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,10);
            const key = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
            await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
            return json({ url: `/uploads/${key}`, mimeType: file.type, size: file.size, originalName: file.name }, 201);
          }
          if (path === '/api/admin/content' && request.method === 'POST') {
            const body = await readJson<Partial<ContentItem>>(request);
            if (!CATEGORIES.includes(body.category as ContentCategory)) return json({ error: 'Invalid content category.' }, 400);
            if (typeof body.title !== 'string' || !body.title.trim()) return json({ error: 'Title is required.' }, 400);
            const now = new Date().toISOString();
            const item: ContentItem = {
              id: crypto.randomUUID(), category: body.category as ContentCategory, title: body.title.trim().slice(0,200),
              subtitle: typeof body.subtitle === 'string' ? body.subtitle.trim().slice(0,240) : undefined,
              body: typeof body.body === 'string' ? body.body.trim().slice(0,8000) : '',
              mediaUrl: typeof body.mediaUrl === 'string' ? body.mediaUrl.trim().slice(0,500) : undefined,
              coverImageUrl: typeof body.coverImageUrl === 'string' ? body.coverImageUrl.trim().slice(0,500) : undefined,
              eventDate: typeof body.eventDate === 'string' ? body.eventDate.trim().slice(0,60) : undefined,
              venue: typeof body.venue === 'string' ? body.venue.trim().slice(0,180) : undefined,
              city: typeof body.city === 'string' ? body.city.trim().slice(0,140) : undefined,
              ticketStatus: typeof body.ticketStatus === 'string' ? body.ticketStatus.trim().slice(0,60) : undefined,
              bpm: typeof body.bpm === 'string' ? body.bpm.trim().slice(0,20) : undefined,
              genre: typeof body.genre === 'string' ? body.genre.trim().slice(0,60) : undefined,
              externalUrl: typeof body.externalUrl === 'string' ? body.externalUrl.trim().slice(0,500) : undefined,
              published: body.published !== false, createdAt: now, updatedAt: now
            };
            await env.DB.prepare('INSERT INTO content_items (id,category,published,created_at,updated_at,data) VALUES (?,?,?,?,?,?)')
              .bind(item.id,item.category,item.published ? 1 : 0,Date.parse(now),Date.parse(now),JSON.stringify(item)).run();
            return json({ item }, 201);
          }
          const contentMatch = path.match(/^\/api\/admin\/content\/([^/]+)$/);
          if (contentMatch && request.method === 'PUT') {
            const id = decodeURIComponent(contentMatch[1]);
            const row = await env.DB.prepare('SELECT data FROM content_items WHERE id = ?').bind(id).first<{data:string}>();
            if (!row) return json({ error: 'Content item not found.' }, 404);
            const existing = JSON.parse(row.data) as ContentItem;
            const body = await readJson<Partial<ContentItem>>(request);
            if (body.category && !CATEGORIES.includes(body.category)) return json({ error: 'Invalid content category.' }, 400);
            const updated: ContentItem = { ...existing, ...Object.fromEntries(Object.entries(body).filter(([,v]) => v !== undefined)), id: existing.id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
            await env.DB.prepare('UPDATE content_items SET category=?,published=?,updated_at=?,data=? WHERE id=?')
              .bind(updated.category,updated.published ? 1 : 0,Date.parse(updated.updatedAt),JSON.stringify(updated),id).run();
            return json({ item: updated });
          }
          if (contentMatch && request.method === 'DELETE') {
            const result = await env.DB.prepare('DELETE FROM content_items WHERE id = ?').bind(decodeURIComponent(contentMatch[1])).run();
            if (!result.meta.changes) return json({ error: 'Content item not found.' }, 404);
            return json({ ok: true });
          }
          const inquiryMatch = path.match(/^\/api\/admin\/inquiries\/([^/]+)$/);
          if (inquiryMatch && request.method === 'DELETE') {
            await env.DB.prepare('DELETE FROM inquiries WHERE id = ?').bind(decodeURIComponent(inquiryMatch[1])).run();
            return json({ ok: true });
          }
        }
        return json({ error: 'Not found.' }, 404);
      } catch (error) {
        console.error('Worker request failed', error);
        return json({ error: 'The server could not complete this request.' }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
