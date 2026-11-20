import 'dotenv/config';
import crypto from 'crypto';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import type { BookingInquiry, ContentCategory, ContentItem } from './src/types/content.ts';

const ADMIN_EMAIL = 'gagadeejay31@gmail.com';
const VALID_CATEGORIES: ContentCategory[] = [
  'NEWS',
  'MUSIC',
  'VIDEOS',
  'EVENTS',
  'ADVERTISEMENTS',
  'GALLERY',
  'ANNOUNCEMENTS',
];

const SUPABASE_REST_URL = (
  process.env.SUPABASE_REST_URL || 'https://uukdadjewhngljcxhhth.supabase.co/rest/v1/'
).replace(/\/+$/, '');
const SUPABASE_BASE_URL = SUPABASE_REST_URL.replace(/\/rest\/v1$/, '');
const SUPABASE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_f3r1_vfpM9KIK5MUtG6N9w_VTByN0F4';
const SUPABASE_STORAGE_BUCKET = 'gaga-media';

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const SECRET_FILE = path.join(DATA_DIR, '.session-secret');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function getSessionSecret(): string {
  if (process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.length >= 16) {
    return process.env.ADMIN_SESSION_SECRET;
  }
  if (fs.existsSync(SECRET_FILE)) {
    return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  }
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
  return secret;
}

const SESSION_SECRET = getSessionSecret();

function safeCompareHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

interface SessionPayload {
  email: string;
  sbToken: string;
  iat: number;
  exp: number;
}

function signSessionToken(email: string, sbToken: string, expiresInSec = 3600): string {
  const payload: SessionPayload = {
    email,
    sbToken,
    iat: Date.now(),
    exp: Date.now() + expiresInSec * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  if (!safeCompareHex(sig, expectedSig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.exp || Date.now() > payload.exp) return null;
    if (payload.email?.toLowerCase() !== ADMIN_EMAIL) return null;
    if (!payload.sbToken) return null;
    return payload;
  } catch {
    return null;
  }
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const pairs = cookieHeader.split(';').map((c) => c.trim());
    for (const pair of pairs) {
      if (pair.startsWith('gaga_admin_session=')) {
        return decodeURIComponent(pair.slice('gaga_admin_session='.length));
      }
    }
  }
  return null;
}

function setSessionCookie(res: Response, token: string, req: Request, maxAgeMs: number) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie('gaga_admin_session', token, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    maxAge: maxAgeMs,
    path: '/',
  });
}

interface AdminRequest extends Request {
  adminSession?: SessionPayload;
}

function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  const verified = verifySessionToken(token);
  if (!verified) {
    res.status(401).json({ error: 'Administrator authentication required.' });
    return;
  }
  if (verified.email.toLowerCase() !== ADMIN_EMAIL) {
    res.status(403).json({ error: 'Forbidden: unauthorized administrator account.' });
    return;
  }
  req.adminSession = verified;
  next();
}

interface SupabaseRow {
  id: string;
  category: ContentCategory;
  title: string;
  subtitle?: string | null;
  body: string;
  media_url?: string | null;
  cover_image_url?: string | null;
  event_date?: string | null;
  venue?: string | null;
  city?: string | null;
  ticket_status?: string | null;
  bpm?: string | null;
  genre?: string | null;
  external_url?: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

interface SupabaseInquiryRow {
  id: string;
  type: 'BOOKING' | 'RSVP';
  name: string;
  email: string;
  event_type?: string | null;
  event_date?: string | null;
  venue_city?: string | null;
  event_id?: string | null;
  event_title?: string | null;
  guest_count?: string | null;
  notes?: string | null;
  created_at: string;
}

function mapRowToContentItem(row: SupabaseRow): ContentItem {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    body: row.body ?? '',
    mediaUrl: row.media_url ?? undefined,
    coverImageUrl: row.cover_image_url ?? undefined,
    eventDate: row.event_date ?? undefined,
    venue: row.venue ?? undefined,
    city: row.city ?? undefined,
    ticketStatus: row.ticket_status ?? undefined,
    bpm: row.bpm ?? undefined,
    genre: row.genre ?? undefined,
    externalUrl: row.external_url ?? undefined,
    published: Boolean(row.published),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToInquiry(row: SupabaseInquiryRow): BookingInquiry {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    email: row.email,
    eventType: row.event_type ?? undefined,
    eventDate: row.event_date ?? undefined,
    venueCity: row.venue_city ?? undefined,
    eventId: row.event_id ?? undefined,
    eventTitle: row.event_title ?? undefined,
    guestCount: row.guest_count ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

async function supabaseRest(
  tablePath: string,
  options: {
    method?: string;
    bearerToken?: string;
    body?: unknown;
    prefer?: string;
  } = {}
) {
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
  };
  if (options.bearerToken) {
    headers.Authorization = `Bearer ${options.bearerToken}`;
  }
  if (options.prefer) {
    headers.Prefer = options.prefer;
  }

  const response = await fetch(`${SUPABASE_REST_URL}/${tablePath}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { message: text };
  }
  return { ok: response.ok, status: response.status, data: json };
}

function getSupabaseErrorCode(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  return (data as { code?: string }).code ?? null;
}

function isMissingTableError(data: unknown): boolean {
  const code = getSupabaseErrorCode(data);
  return code === 'PGRST205' || code === '42P01';
}

function isPermissionDeniedError(data: unknown): boolean {
  return getSupabaseErrorCode(data) === '42501';
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedPrefixes = ['image/', 'audio/', 'video/'];
    if (allowedPrefixes.some((p) => file.mimetype.startsWith(p))) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Upload images, audio mixes, or videos only.'));
    }
  },
});

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));

  app.use('/uploads', express.static(UPLOADS_DIR));

  // --- HEALTH & SUPABASE DIAGNOSTICS ---
  app.get('/api/health', async (_req, res) => {
    try {
      const [authCheck, contentCheck, inquiriesCheck] = await Promise.all([
        fetch(`${SUPABASE_BASE_URL}/auth/v1/settings`, {
          headers: { apikey: SUPABASE_KEY },
        }),
        supabaseRest('content_items?select=id&limit=1'),
        supabaseRest('inquiries?select=id&limit=1'),
      ]);

      const contentMissing = isMissingTableError(contentCheck.data);
      const contentDenied = isPermissionDeniedError(contentCheck.data);
      const inquiriesMissing = isMissingTableError(inquiriesCheck.data);
      const inquiriesDenied = isPermissionDeniedError(inquiriesCheck.data);

      res.json({
        ok: true,
        supabaseUrl: SUPABASE_REST_URL,
        authReachable: authCheck.ok,
        tablesExist: !contentMissing && !inquiriesMissing,
        permissionsReady: contentCheck.ok && !contentDenied && !inquiriesDenied,
        contentStatus: contentCheck.status,
        inquiriesStatus: inquiriesCheck.status,
        contentErrorCode: getSupabaseErrorCode(contentCheck.data),
        inquiriesErrorCode: getSupabaseErrorCode(inquiriesCheck.data),
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Health check failed.',
      });
    }
  });

  // --- PUBLIC CONTENT ROUTES ---
  app.get('/api/content', async (_req, res) => {
    try {
      const result = await supabaseRest(
        'content_items?select=*&published=eq.true&order=created_at.desc'
      );
      if (!result.ok) {
        if (isMissingTableError(result.data)) {
          res.json({ items: [], tablesExist: false, permissionsReady: false });
          return;
        }
        if (isPermissionDeniedError(result.data)) {
          res.json({ items: [], tablesExist: true, permissionsReady: false });
          return;
        }
        res.status(result.status).json({
          items: [],
          error: (result.data as { message?: string })?.message || 'Unable to load content.',
        });
        return;
      }
      const rows = Array.isArray(result.data) ? (result.data as SupabaseRow[]) : [];
      res.json({
        items: rows.map(mapRowToContentItem),
        tablesExist: true,
        permissionsReady: true,
      });
    } catch {
      res.status(502).json({ items: [], error: 'Unable to reach Supabase backend.' });
    }
  });

  app.post('/api/inquiries', async (req, res) => {
    const { type, name, email, eventType, eventDate, venueCity, eventId, eventTitle, guestCount, notes } =
      req.body ?? {};
    if (!name || typeof name !== 'string' || !email || typeof email !== 'string') {
      res.status(400).json({ error: 'Name and email address are required.' });
      return;
    }

    const row = {
      type: type === 'RSVP' ? 'RSVP' : 'BOOKING',
      name: name.trim().slice(0, 120),
      email: email.trim().slice(0, 160),
      event_type: typeof eventType === 'string' ? eventType.trim().slice(0, 120) : null,
      event_date: typeof eventDate === 'string' ? eventDate.trim().slice(0, 40) : null,
      venue_city: typeof venueCity === 'string' ? venueCity.trim().slice(0, 160) : null,
      event_id: typeof eventId === 'string' ? eventId.trim().slice(0, 80) : null,
      event_title: typeof eventTitle === 'string' ? eventTitle.trim().slice(0, 180) : null,
      guest_count: typeof guestCount === 'string' ? guestCount.trim().slice(0, 60) : null,
      notes: typeof notes === 'string' ? notes.trim().slice(0, 2000) : null,
    };

    try {
      const result = await supabaseRest('inquiries', {
        method: 'POST',
        body: row,
        prefer: 'return=minimal',
      });
      if (!result.ok) {
        const msg =
          (result.data as { message?: string })?.message ||
          'Database permissions not yet granted in Supabase.';
        res.status(result.status).json({ error: msg });
        return;
      }
      res.status(201).json({ ok: true });
    } catch {
      res.status(502).json({ error: 'Unable to submit inquiry to Supabase.' });
    }
  });

  // --- SUPABASE ADMIN AUTH ROUTES (BACKEND ENFORCED) ---
  app.get('/api/admin/status', async (req, res) => {
    const token = extractToken(req);
    const verified = verifySessionToken(token);
    let tablesExist = false;
    let permissionsReady = false;
    try {
      const check = await supabaseRest('content_items?select=id&limit=1', {
        bearerToken: verified?.sbToken,
      });
      tablesExist = !isMissingTableError(check.data);
      permissionsReady = check.ok;
    } catch {
      tablesExist = false;
      permissionsReady = false;
    }

    res.json({
      authenticated: Boolean(verified),
      email: verified ? verified.email : null,
      tablesExist,
      permissionsReady,
    });
  });

  app.post('/api/admin/signup', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || email.trim().toLowerCase() !== ADMIN_EMAIL) {
      res.status(403).json({ error: 'Access denied. Only gagadeejay31@gmail.com may register.' });
      return;
    }
    if (typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }

    try {
      const sbRes = await fetch(`${SUPABASE_BASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password,
        }),
      });
      const data = (await sbRes.json()) as {
        access_token?: string;
        expires_in?: number;
        user?: { email?: string };
        msg?: string;
        error_description?: string;
        message?: string;
      };
      if (!sbRes.ok) {
        res.status(sbRes.status).json({
          error: data.msg || data.error_description || data.message || 'Signup failed.',
        });
        return;
      }

      if (data.access_token && data.user?.email?.toLowerCase() === ADMIN_EMAIL) {
        const expSec = data.expires_in || 3600;
        const token = signSessionToken(ADMIN_EMAIL, data.access_token, expSec);
        setSessionCookie(res, token, req, expSec * 1000);
        res.status(201).json({ authenticated: true, email: ADMIN_EMAIL, token });
        return;
      }

      res.status(201).json({
        authenticated: false,
        confirmationRequired: true,
        message:
          'Account created. Check gagadeejay31@gmail.com for your verification link (or run the SQL confirmation step in Supabase SQL Editor), then sign in.',
      });
    } catch {
      res.status(502).json({ error: 'Unable to reach Supabase Auth.' });
    }
  });

  app.post('/api/admin/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || email.trim().toLowerCase() !== ADMIN_EMAIL) {
      res.status(403).json({ error: 'Access denied. Only gagadeejay31@gmail.com may log in.' });
      return;
    }
    if (typeof password !== 'string' || !password) {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }

    try {
      const sbRes = await fetch(`${SUPABASE_BASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password,
        }),
      });
      const data = (await sbRes.json()) as {
        access_token?: string;
        expires_in?: number;
        user?: { email?: string };
        error_description?: string;
        msg?: string;
        message?: string;
      };

      if (!sbRes.ok || !data.access_token) {
        const rawErr = data.error_description || data.msg || data.message || 'Invalid login credentials.';
        const friendlyErr = rawErr.toLowerCase().includes('invalid')
          ? 'Invalid login credentials. If you have not registered yet, click "Create Admin Account" first, or confirm your email / reset your password below.'
          : rawErr;
        res.status(401).json({ error: friendlyErr });
        return;
      }

      if (data.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
        res.status(403).json({ error: 'Unauthorized administrator account.' });
        return;
      }

      const expSec = data.expires_in || 3600;
      const token = signSessionToken(ADMIN_EMAIL, data.access_token, expSec);
      setSessionCookie(res, token, req, expSec * 1000);
      res.json({ authenticated: true, email: ADMIN_EMAIL, token });
    } catch {
      res.status(502).json({ error: 'Unable to reach Supabase Auth.' });
    }
  });

  app.post('/api/admin/resend-confirmation', async (req, res) => {
    const { email } = req.body ?? {};
    if (typeof email !== 'string' || email.trim().toLowerCase() !== ADMIN_EMAIL) {
      res.status(403).json({ error: 'Only gagadeejay31@gmail.com is authorized.' });
      return;
    }
    try {
      const sbRes = await fetch(`${SUPABASE_BASE_URL}/auth/v1/resend`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'signup', email: ADMIN_EMAIL }),
      });
      if (!sbRes.ok) {
        const d = (await sbRes.json()) as { msg?: string; message?: string };
        res.status(sbRes.status).json({ error: d.msg || d.message || 'Unable to resend confirmation email.' });
        return;
      }
      res.json({ ok: true, message: 'Verification email resent to gagadeejay31@gmail.com.' });
    } catch {
      res.status(502).json({ error: 'Unable to reach Supabase Auth.' });
    }
  });

  app.post('/api/admin/reset-password', async (req, res) => {
    const { email } = req.body ?? {};
    if (typeof email !== 'string' || email.trim().toLowerCase() !== ADMIN_EMAIL) {
      res.status(403).json({ error: 'Only gagadeejay31@gmail.com is authorized.' });
      return;
    }
    try {
      const sbRes = await fetch(`${SUPABASE_BASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL }),
      });
      if (!sbRes.ok) {
        const d = (await sbRes.json()) as { msg?: string; message?: string };
        res.status(sbRes.status).json({ error: d.msg || d.message || 'Unable to send password reset.' });
        return;
      }
      res.json({ ok: true, message: 'Password reset link sent to gagadeejay31@gmail.com.' });
    } catch {
      res.status(502).json({ error: 'Unable to reach Supabase Auth.' });
    }
  });

  app.post('/api/admin/logout', (_req, res) => {
    res.clearCookie('gaga_admin_session', { path: '/' });
    res.json({ ok: true });
  });

  // --- PROTECTED ADMIN CMS ROUTES (BACKED BY SUPABASE REST & STORAGE) ---
  app.get('/api/admin/content', requireAdmin, async (req: AdminRequest, res) => {
    try {
      const result = await supabaseRest('content_items?select=*&order=created_at.desc', {
        bearerToken: req.adminSession!.sbToken,
      });
      if (!result.ok) {
        if (isMissingTableError(result.data)) {
          res.json({ items: [], tablesExist: false, permissionsReady: false });
          return;
        }
        if (isPermissionDeniedError(result.data)) {
          res.json({ items: [], tablesExist: true, permissionsReady: false });
          return;
        }
        res.status(result.status).json({
          error: (result.data as { message?: string })?.message || 'Failed to load content.',
        });
        return;
      }
      const rows = Array.isArray(result.data) ? (result.data as SupabaseRow[]) : [];
      res.json({ items: rows.map(mapRowToContentItem), tablesExist: true, permissionsReady: true });
    } catch {
      res.status(502).json({ error: 'Unable to reach Supabase.' });
    }
  });

  app.post('/api/admin/upload', requireAdmin, (req: AdminRequest, res) => {
    upload.single('file')(req, res, async (err) => {
      if (err) {
        res.status(400).json({ error: err.message || 'File upload failed.' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'No file selected.' });
        return;
      }

      const ext = path.extname(req.file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
      const base = path
        .basename(req.file.originalname, path.extname(req.file.originalname))
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .slice(0, 40);
      const objectName = `${Date.now()}-${base || 'media'}${ext}`;

      try {
        const sbUpload = await fetch(
          `${SUPABASE_BASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${objectName}`,
          {
            method: 'POST',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${req.adminSession!.sbToken}`,
              'Content-Type': req.file.mimetype,
              'x-upsert': 'true',
            },
            body: new Uint8Array(req.file.buffer),
          }
        );

        if (sbUpload.ok) {
          res.status(201).json({
            url: `${SUPABASE_BASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${objectName}`,
            storage: 'supabase',
            mimeType: req.file.mimetype,
            size: req.file.size,
          });
          return;
        }
      } catch {
        // Fall through to local disk storage if Supabase Storage bucket isn't provisioned yet
      }

      const localPath = path.join(UPLOADS_DIR, objectName);
      fs.writeFileSync(localPath, req.file.buffer);
      res.status(201).json({
        url: `/uploads/${objectName}`,
        storage: 'local',
        mimeType: req.file.mimetype,
        size: req.file.size,
      });
    });
  });

  app.post('/api/admin/content', requireAdmin, async (req: AdminRequest, res) => {
    const body = req.body ?? {};
    if (!VALID_CATEGORIES.includes(body.category)) {
      res.status(400).json({ error: 'Invalid content category.' });
      return;
    }
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      res.status(400).json({ error: 'Title is required.' });
      return;
    }

    const row = {
      category: body.category,
      title: body.title.trim().slice(0, 200),
      subtitle: typeof body.subtitle === 'string' && body.subtitle.trim() ? body.subtitle.trim().slice(0, 240) : null,
      body: typeof body.body === 'string' ? body.body.trim().slice(0, 8000) : '',
      media_url: typeof body.mediaUrl === 'string' && body.mediaUrl.trim() ? body.mediaUrl.trim().slice(0, 500) : null,
      cover_image_url:
        typeof body.coverImageUrl === 'string' && body.coverImageUrl.trim()
          ? body.coverImageUrl.trim().slice(0, 500)
          : null,
      event_date: typeof body.eventDate === 'string' && body.eventDate.trim() ? body.eventDate.trim().slice(0, 60) : null,
      venue: typeof body.venue === 'string' && body.venue.trim() ? body.venue.trim().slice(0, 180) : null,
      city: typeof body.city === 'string' && body.city.trim() ? body.city.trim().slice(0, 140) : null,
      ticket_status:
        typeof body.ticketStatus === 'string' && body.ticketStatus.trim()
          ? body.ticketStatus.trim().slice(0, 60)
          : null,
      bpm: typeof body.bpm === 'string' && body.bpm.trim() ? body.bpm.trim().slice(0, 20) : null,
      genre: typeof body.genre === 'string' && body.genre.trim() ? body.genre.trim().slice(0, 60) : null,
      external_url:
        typeof body.externalUrl === 'string' && body.externalUrl.trim()
          ? body.externalUrl.trim().slice(0, 500)
          : null,
      published: body.published !== false,
    };

    try {
      const result = await supabaseRest('content_items', {
        method: 'POST',
        bearerToken: req.adminSession!.sbToken,
        body: row,
        prefer: 'return=representation',
      });
      if (!result.ok) {
        res.status(result.status).json({
          error: (result.data as { message?: string })?.message || 'Failed to publish content.',
        });
        return;
      }
      const created = Array.isArray(result.data) ? (result.data[0] as SupabaseRow) : (result.data as SupabaseRow);
      res.status(201).json({ item: mapRowToContentItem(created) });
    } catch {
      res.status(502).json({ error: 'Unable to save content to Supabase.' });
    }
  });

  app.put('/api/admin/content/:id', requireAdmin, async (req: AdminRequest, res) => {
    const { id } = req.params;
    const body = req.body ?? {};
    if (body.category && !VALID_CATEGORIES.includes(body.category)) {
      res.status(400).json({ error: 'Invalid content category.' });
      return;
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.category !== undefined) patch.category = body.category;
    if (typeof body.title === 'string') patch.title = body.title.trim().slice(0, 200);
    if (typeof body.subtitle === 'string') patch.subtitle = body.subtitle.trim().slice(0, 240) || null;
    if (typeof body.body === 'string') patch.body = body.body.trim().slice(0, 8000);
    if (typeof body.mediaUrl === 'string') patch.media_url = body.mediaUrl.trim().slice(0, 500) || null;
    if (typeof body.coverImageUrl === 'string') {
      patch.cover_image_url = body.coverImageUrl.trim().slice(0, 500) || null;
    }
    if (typeof body.eventDate === 'string') patch.event_date = body.eventDate.trim().slice(0, 60) || null;
    if (typeof body.venue === 'string') patch.venue = body.venue.trim().slice(0, 180) || null;
    if (typeof body.city === 'string') patch.city = body.city.trim().slice(0, 140) || null;
    if (typeof body.ticketStatus === 'string') {
      patch.ticket_status = body.ticketStatus.trim().slice(0, 60) || null;
    }
    if (typeof body.bpm === 'string') patch.bpm = body.bpm.trim().slice(0, 20) || null;
    if (typeof body.genre === 'string') patch.genre = body.genre.trim().slice(0, 60) || null;
    if (typeof body.externalUrl === 'string') {
      patch.external_url = body.externalUrl.trim().slice(0, 500) || null;
    }
    if (typeof body.published === 'boolean') patch.published = body.published;

    try {
      const result = await supabaseRest(`content_items?id=eq.${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        bearerToken: req.adminSession!.sbToken,
        body: patch,
        prefer: 'return=representation',
      });
      if (!result.ok) {
        res.status(result.status).json({
          error: (result.data as { message?: string })?.message || 'Failed to update content.',
        });
        return;
      }
      const rows = Array.isArray(result.data) ? (result.data as SupabaseRow[]) : [];
      if (rows.length === 0) {
        res.status(404).json({ error: 'Content item not found.' });
        return;
      }
      res.json({ item: mapRowToContentItem(rows[0]) });
    } catch {
      res.status(502).json({ error: 'Unable to update content in Supabase.' });
    }
  });

  app.delete('/api/admin/content/:id', requireAdmin, async (req: AdminRequest, res) => {
    const { id } = req.params;
    try {
      const result = await supabaseRest(`content_items?id=eq.${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
        bearerToken: req.adminSession!.sbToken,
      });
      if (!result.ok) {
        res.status(result.status).json({
          error: (result.data as { message?: string })?.message || 'Failed to delete content.',
        });
        return;
      }
      res.json({ ok: true });
    } catch {
      res.status(502).json({ error: 'Unable to delete content from Supabase.' });
    }
  });

  app.get('/api/admin/inquiries', requireAdmin, async (req: AdminRequest, res) => {
    try {
      const result = await supabaseRest('inquiries?select=*&order=created_at.desc', {
        bearerToken: req.adminSession!.sbToken,
      });
      if (!result.ok) {
        if (isMissingTableError(result.data) || isPermissionDeniedError(result.data)) {
          res.json({ inquiries: [] });
          return;
        }
        res.status(result.status).json({
          error: (result.data as { message?: string })?.message || 'Failed to load inquiries.',
        });
        return;
      }
      const rows = Array.isArray(result.data) ? (result.data as SupabaseInquiryRow[]) : [];
      res.json({ inquiries: rows.map(mapRowToInquiry) });
    } catch {
      res.status(502).json({ error: 'Unable to reach Supabase.' });
    }
  });

  app.delete('/api/admin/inquiries/:id', requireAdmin, async (req: AdminRequest, res) => {
    const { id } = req.params;
    try {
      const result = await supabaseRest(`inquiries?id=eq.${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
        bearerToken: req.adminSession!.sbToken,
      });
      if (!result.ok) {
        res.status(result.status).json({
          error: (result.data as { message?: string })?.message || 'Failed to delete inquiry.',
        });
        return;
      }
      res.json({ ok: true });
    } catch {
      res.status(502).json({ error: 'Unable to delete inquiry from Supabase.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`GAGA DJ server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
