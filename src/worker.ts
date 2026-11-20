/**
 * GAGA DJ Cloudflare Worker API.
 *
 * Production storage:
 * - D1: content_items, inquiries, admin_auth, admin_sessions, login_attempts
 * - R2: uploaded images, audio mixes and videos
 * - Static frontend: Vite dist/ assets binding
 */

interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success?: boolean;
  meta?: { changes?: number };
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

interface D1Database {
  prepare(query: string): D1Statement;
}

interface R2ObjectBody {
  body: ReadableStream;
  httpEtag: string;
  size: number;
  httpMetadata?: { contentType?: string; cacheControl?: string };
}

interface R2Bucket {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
}

interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: AssetFetcher;
  ADMIN_EMAIL?: string;
  ADMIN_PASSCODE?: string;
}

interface ContentItem {
  id: string;
  category: string;
  title: string;
  subtitle?: string;
  body: string;
  mediaUrl?: string;
  coverImageUrl?: string;
  eventDate?: string;
  venue?: string;
  city?: string;
  ticketStatus?: string;
  bpm?: string;
  genre?: string;
  externalUrl?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_ADMIN_EMAIL = 'gagadeejay31@gmail.com';
const CATEGORIES = new Set([
  'NEWS',
  'MUSIC',
  'VIDEOS',
  'EVENTS',
  'ADVERTISEMENTS',
  'GALLERY',
  'ANNOUNCEMENTS',
]);
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 120_000;
const encoder = new TextEncoder();

function json(data: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), { status, headers });
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(value: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) return new Uint8Array();
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function randomHex(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}

async function sha256(value: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

async function hashPasscode(passcode: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(passcode), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  return hex(new Uint8Array(bits));
}

function adminEmail(env: Env): string {
  return (env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
}

function extractToken(request: Request): string | null {
  const authorization = request.headers.get('Authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim() || null;
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('gaga_admin_session='));
  return match ? decodeURIComponent(match.slice('gaga_admin_session='.length)) : null;
}

function cookieHeader(token: string, maxAgeSeconds: number): string {
  return `gaga_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

async function createSession(env: Env, email: string): Promise<string> {
  const token = randomHex(32);
  const expiresAt = Date.now() + SESSION_LIFETIME_MS;
  await env.DB.prepare(
    'INSERT INTO admin_sessions (token_hash, email, expires_at) VALUES (?, ?, ?)'
  ).bind(await sha256(token), email, expiresAt).run();
  return token;
}

async function authenticatedEmail(request: Request, env: Env): Promise<string | null> {
  const token = extractToken(request);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const session = await env.DB.prepare(
    'SELECT email, expires_at FROM admin_sessions WHERE token_hash = ? LIMIT 1'
  ).bind(tokenHash).first<{ email: string; expires_at: number }>();
  if (!session) return null;
  if (Number(session.expires_at) <= Date.now()) {
    await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(tokenHash).run();
    return null;
  }
  return session.email.toLowerCase() === adminEmail(env) ? session.email : null;
}

async function requireAdmin(request: Request, env: Env): Promise<string | Response> {
  const email = await authenticatedEmail(request, env);
  return email || json({ error: 'Administrator authentication required.' }, 401);
}

async function isSetupRequired(env: Env): Promise<boolean> {
  if (env.ADMIN_PASSCODE && env.ADMIN_PASSCODE.length > 0) return false;
  const record = await env.DB.prepare(
    'SELECT email FROM admin_auth WHERE email = ? LIMIT 1'
  ).bind(adminEmail(env)).first();
  return !record;
}

async function verifyPasscode(env: Env, passcode: string): Promise<boolean> {
  if (env.ADMIN_PASSCODE && env.ADMIN_PASSCODE.length > 0) {
    return constantTimeEqual(await sha256(passcode), await sha256(env.ADMIN_PASSCODE));
  }
  const record = await env.DB.prepare(
    'SELECT salt, hash FROM admin_auth WHERE email = ? LIMIT 1'
  ).bind(adminEmail(env)).first<{ salt: string; hash: string }>();
  if (!record) return false;
  return constantTimeEqual(await hashPasscode(passcode, record.salt), record.hash);
}

function optionalString(value: unknown, max: number): string | undefined {
  return typeof value === 'string' ? value.trim().slice(0, max) : undefined;
}

function contentFromRow(row: { data: string }): ContentItem | null {
  try {
    return JSON.parse(row.data) as ContentItem;
  } catch {
    return null;
  }
}

async function getAllContent(env: Env, publishedOnly: boolean): Promise<ContentItem[]> {
  const sql = publishedOnly
    ? 'SELECT data FROM content_items WHERE published = 1 ORDER BY created_at DESC'
    : 'SELECT data FROM content_items ORDER BY created_at DESC';
  const result = await env.DB.prepare(sql).all<{ data: string }>();
  return (result.results || []).map(contentFromRow).filter((item): item is ContentItem => Boolean(item));
}

async function handleApi(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (path === '/api/content' && method === 'GET') {
    return json({ items: await getAllContent(env, true) });
  }

  if (path === '/api/inquiries' && method === 'POST') {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body.name !== 'string' || !body.name.trim() ||
        typeof body.email !== 'string' || !body.email.trim()) {
      return json({ error: 'Name and email address are required.' }, 400);
    }
    const inquiry = {
      id: crypto.randomUUID(),
      type: body.type === 'RSVP' ? 'RSVP' : 'BOOKING',
      name: body.name.trim().slice(0, 120),
      email: body.email.trim().slice(0, 160),
      eventType: optionalString(body.eventType, 120),
      eventDate: optionalString(body.eventDate, 40),
      venueCity: optionalString(body.venueCity, 160),
      eventId: optionalString(body.eventId, 80),
      eventTitle: optionalString(body.eventTitle, 180),
      guestCount: optionalString(body.guestCount, 60),
      notes: optionalString(body.notes, 2000),
      createdAt: new Date().toISOString(),
    };
    await env.DB.prepare(
      'INSERT INTO inquiries (id, created_at, data) VALUES (?, ?, ?)'
    ).bind(inquiry.id, Date.now(), JSON.stringify(inquiry)).run();
    return json({ ok: true, id: inquiry.id }, 201);
  }

  if (path === '/api/admin/status' && method === 'GET') {
    const email = await authenticatedEmail(request, env);
    return json({
      setupRequired: await isSetupRequired(env),
      authenticated: Boolean(email),
      email,
    });
  }

  if (path === '/api/admin/setup' && method === 'POST') {
    if (!(await isSetupRequired(env))) {
      return json({ error: 'Administrator passcode is already configured.' }, 409);
    }
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body.email !== 'string' || body.email.trim().toLowerCase() !== adminEmail(env)) {
      return json({ error: 'Only the authorized administrator email can initialize access.' }, 403);
    }
    if (typeof body.passcode !== 'string' || body.passcode.length < 8) {
      return json({ error: 'Passcode must be at least 8 characters long.' }, 400);
    }
    const salt = randomHex(16);
    const hash = await hashPasscode(body.passcode, salt);
    await env.DB.prepare(
      'INSERT INTO admin_auth (email, salt, hash, created_at) VALUES (?, ?, ?, ?)'
    ).bind(adminEmail(env), salt, hash, new Date().toISOString()).run();
    const token = await createSession(env, adminEmail(env));
    return json({ authenticated: true, email: adminEmail(env), token }, 201, {
      'Set-Cookie': cookieHeader(token, SESSION_LIFETIME_MS / 1000),
    });
  }

  if (path === '/api/admin/login' && method === 'POST') {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const attempt = await env.DB.prepare(
      'SELECT count, locked_until FROM login_attempts WHERE ip = ? LIMIT 1'
    ).bind(ip).first<{ count: number; locked_until: number }>();
    if (attempt && Number(attempt.locked_until) > Date.now()) {
      return json({ error: 'Too many failed login attempts. Try again in a few minutes.' }, 429);
    }
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body.email !== 'string' || body.email.trim().toLowerCase() !== adminEmail(env)) {
      return json({ error: 'Access denied. Only the authorized administrator may log in.' }, 403);
    }
    if (await isSetupRequired(env)) {
      return json({ error: 'First-time administrator passcode setup is required.' }, 400);
    }
    if (typeof body.passcode !== 'string' || !(await verifyPasscode(env, body.passcode))) {
      const nextCount = (Number(attempt?.count) || 0) + 1;
      const lockedUntil = nextCount >= 5 ? Date.now() + 10 * 60 * 1000 : 0;
      await env.DB.prepare(
        'INSERT INTO login_attempts (ip, count, locked_until) VALUES (?, ?, ?) ON CONFLICT(ip) DO UPDATE SET count = excluded.count, locked_until = excluded.locked_until'
      ).bind(ip, nextCount, lockedUntil).run();
      return json({ error: 'Invalid administrator credentials.' }, 401);
    }
    await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();
    const token = await createSession(env, adminEmail(env));
    return json({ authenticated: true, email: adminEmail(env), token }, 200, {
      'Set-Cookie': cookieHeader(token, SESSION_LIFETIME_MS / 1000),
    });
  }

  if (path === '/api/admin/logout' && method === 'POST') {
    const token = extractToken(request);
    if (token) {
      await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?')
        .bind(await sha256(token)).run();
    }
    return json({ ok: true }, 200, {
      'Set-Cookie': cookieHeader('', 0),
    });
  }

  if (path.startsWith('/api/admin/')) {
    const auth = await requireAdmin(request, env);
    if (auth instanceof Response) return auth;

    if (path === '/api/admin/content' && method === 'GET') {
      return json({ items: await getAllContent(env, false) });
    }

    if (path === '/api/admin/upload' && method === 'POST') {
      const form = await request.formData().catch(() => null);
      const file = form?.get('file');
      if (!(file instanceof File) || file.size <= 0) {
        return json({ error: 'No file selected.' }, 400);
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return json({ error: 'File is too large. Maximum upload size is 100 MB.' }, 413);
      }
      const allowed = file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/');
      if (!allowed) {
        return json({ error: 'Unsupported file type. Upload images, audio mixes, or videos only.' }, 400);
      }
      const extension = (file.name.match(/\.([a-zA-Z0-9]{1,10})$/)?.[1] || '').toLowerCase();
      const key = `media/${crypto.randomUUID()}${extension ? `.${extension}` : ''}`;
      await env.MEDIA.put(key, file.stream(), {
        httpMetadata: {
          contentType: file.type || 'application/octet-stream',
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });
      return json({
        url: `/uploads/${key}`,
        key,
        mimeType: file.type,
        size: file.size,
        originalName: file.name.slice(0, 240),
      }, 201);
    }

    if (path === '/api/admin/content' && method === 'POST') {
      const body = await request.json().catch(() => null) as Record<string, unknown> | null;
      if (!body || typeof body.category !== 'string' || !CATEGORIES.has(body.category)) {
        return json({ error: 'Invalid content category.' }, 400);
      }
      if (typeof body.title !== 'string' || !body.title.trim()) {
        return json({ error: 'Title is required.' }, 400);
      }
      const now = new Date().toISOString();
      const item: ContentItem = {
        id: crypto.randomUUID(),
        category: body.category,
        title: body.title.trim().slice(0, 200),
        subtitle: optionalString(body.subtitle, 240),
        body: optionalString(body.body, 8000) || '',
        mediaUrl: optionalString(body.mediaUrl, 500),
        coverImageUrl: optionalString(body.coverImageUrl, 500),
        eventDate: optionalString(body.eventDate, 60),
        venue: optionalString(body.venue, 180),
        city: optionalString(body.city, 140),
        ticketStatus: optionalString(body.ticketStatus, 60),
        bpm: optionalString(body.bpm, 20),
        genre: optionalString(body.genre, 60),
        externalUrl: optionalString(body.externalUrl, 500),
        published: body.published !== false,
        createdAt: now,
        updatedAt: now,
      };
      await env.DB.prepare(
        'INSERT INTO content_items (id, category, published, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(item.id, item.category, item.published ? 1 : 0, Date.now(), Date.now(), JSON.stringify(item)).run();
      return json({ item }, 201);
    }

    const contentMatch = path.match(/^\/api\/admin\/content\/([^/]+)$/);
    if (contentMatch) {
      const id = decodeURIComponent(contentMatch[1]);
      const row = await env.DB.prepare(
        'SELECT data FROM content_items WHERE id = ? LIMIT 1'
      ).bind(id).first<{ data: string }>();
      const existing = row ? contentFromRow(row) : null;
      if (!existing) return json({ error: 'Content item not found.' }, 404);

      if (method === 'PUT') {
        const body = await request.json().catch(() => null) as Record<string, unknown> | null;
        if (!body) return json({ error: 'Invalid content data.' }, 400);
        if (body.category !== undefined && (typeof body.category !== 'string' || !CATEGORIES.has(body.category))) {
          return json({ error: 'Invalid content category.' }, 400);
        }
        const updated: ContentItem = {
          ...existing,
          category: typeof body.category === 'string' ? body.category : existing.category,
          title: typeof body.title === 'string' ? body.title.trim().slice(0, 200) : existing.title,
          subtitle: typeof body.subtitle === 'string' ? body.subtitle.trim().slice(0, 240) : existing.subtitle,
          body: typeof body.body === 'string' ? body.body.trim().slice(0, 8000) : existing.body,
          mediaUrl: typeof body.mediaUrl === 'string' ? body.mediaUrl.trim().slice(0, 500) : existing.mediaUrl,
          coverImageUrl: typeof body.coverImageUrl === 'string' ? body.coverImageUrl.trim().slice(0, 500) : existing.coverImageUrl,
          eventDate: typeof body.eventDate === 'string' ? body.eventDate.trim().slice(0, 60) : existing.eventDate,
          venue: typeof body.venue === 'string' ? body.venue.trim().slice(0, 180) : existing.venue,
          city: typeof body.city === 'string' ? body.city.trim().slice(0, 140) : existing.city,
          ticketStatus: typeof body.ticketStatus === 'string' ? body.ticketStatus.trim().slice(0, 60) : existing.ticketStatus,
          bpm: typeof body.bpm === 'string' ? body.bpm.trim().slice(0, 20) : existing.bpm,
          genre: typeof body.genre === 'string' ? body.genre.trim().slice(0, 60) : existing.genre,
          externalUrl: typeof body.externalUrl === 'string' ? body.externalUrl.trim().slice(0, 500) : existing.externalUrl,
          published: typeof body.published === 'boolean' ? body.published : existing.published,
          updatedAt: new Date().toISOString(),
        };
        await env.DB.prepare(
          'UPDATE content_items SET category = ?, published = ?, updated_at = ?, data = ? WHERE id = ?'
        ).bind(updated.category, updated.published ? 1 : 0, Date.now(), JSON.stringify(updated), id).run();
        return json({ item: updated });
      }

      if (method === 'DELETE') {
        await env.DB.prepare('DELETE FROM content_items WHERE id = ?').bind(id).run();
        return json({ ok: true });
      }
    }

    if (path === '/api/admin/inquiries' && method === 'GET') {
      const result = await env.DB.prepare(
        'SELECT data FROM inquiries ORDER BY created_at DESC'
      ).all<{ data: string }>();
      const inquiries = (result.results || []).flatMap((row) => {
        try { return [JSON.parse(row.data)]; } catch { return []; }
      });
      return json({ inquiries });
    }

    const inquiryMatch = path.match(/^\/api\/admin\/inquiries\/([^/]+)$/);
    if (inquiryMatch && method === 'DELETE') {
      await env.DB.prepare('DELETE FROM inquiries WHERE id = ?')
        .bind(decodeURIComponent(inquiryMatch[1])).run();
      return json({ ok: true });
    }

    return json({ error: 'API route not found.' }, 404);
  }

  if (path.startsWith('/uploads/')) {
    const key = path.slice('/uploads/'.length);
    if (!key || key.includes('..')) return json({ error: 'Media not found.' }, 404);
    const object = await env.MEDIA.get(key);
    if (!object) return json({ error: 'Media not found.' }, 404);
    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Cache-Control', object.httpMetadata?.cacheControl || 'public, max-age=3600');
    headers.set('ETag', object.httpEtag);
    headers.set('Content-Length', String(object.size));
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(object.body, { headers });
  }

  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const apiResponse = await handleApi(request, env);
      if (apiResponse) return apiResponse;
      return await env.ASSETS.fetch(request);
    } catch (error) {
      console.error('GAGA DJ Worker request failed:', error);
      return json({ error: 'The server could not complete this request.' }, 500);
    }
  },
};
