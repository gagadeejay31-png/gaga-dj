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

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');
const AUTH_FILE = path.join(DATA_DIR, 'admin-auth.json');
const SECRET_FILE = path.join(DATA_DIR, '.session-secret');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

if (!fs.existsSync(CONTENT_FILE)) {
  fs.writeFileSync(CONTENT_FILE, JSON.stringify([], null, 2), 'utf8');
}
if (!fs.existsSync(INQUIRIES_FILE)) {
  fs.writeFileSync(INQUIRIES_FILE, JSON.stringify([], null, 2), 'utf8');
}

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

interface StoredAdminAuth {
  email: string;
  salt: string;
  hash: string;
  createdAt: string;
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function hashPasscode(passcode: string, salt: string): string {
  return crypto.scryptSync(passcode, salt, 64).toString('hex');
}

function safeCompareHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function isPasscodeConfigured(): boolean {
  if (process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0) {
    return true;
  }
  return fs.existsSync(AUTH_FILE);
}

function verifyPasscode(passcode: string): boolean {
  if (process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0) {
    const expected = crypto.createHash('sha256').update(process.env.ADMIN_PASSCODE).digest('hex');
    const actual = crypto.createHash('sha256').update(passcode).digest('hex');
    return safeCompareHex(expected, actual);
  }
  if (!fs.existsSync(AUTH_FILE)) return false;
  const stored = readJson<StoredAdminAuth | null>(AUTH_FILE, null);
  if (!stored || stored.email.toLowerCase() !== ADMIN_EMAIL) return false;
  const computed = hashPasscode(passcode, stored.salt);
  return safeCompareHex(computed, stored.hash);
}

function signSessionToken(email: string): string {
  const payload = {
    email,
    iat: Date.now(),
    exp: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(token: string | undefined | null): { email: string } | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  if (!safeCompareHex(sig, expectedSig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      email: string;
      exp: number;
    };
    if (!payload.exp || Date.now() > payload.exp) return null;
    if (payload.email?.toLowerCase() !== ADMIN_EMAIL) return null;
    return { email: payload.email };
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

function setSessionCookie(res: Response, token: string, req: Request) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie('gaga_admin_session', token, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  });
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
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
  next();
}

// Simple login rate-limit tracker
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

// Multer setup for real photograph, audio, and video uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const base = path
      .basename(file.originalname, path.extname(file.originalname))
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .slice(0, 40);
    cb(null, `${Date.now()}-${base || 'media'}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
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

  // Serve real uploaded files cleanly
  app.use('/uploads', express.static(UPLOADS_DIR));

  // --- PUBLIC CONTENT ROUTES ---
  app.get('/api/content', (_req, res) => {
    const items = readJson<ContentItem[]>(CONTENT_FILE, []);
    const published = items
      .filter((item) => item.published)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ items: published });
  });

  app.post('/api/inquiries', (req, res) => {
    const { type, name, email, eventType, eventDate, venueCity, eventId, eventTitle, guestCount, notes } =
      req.body ?? {};
    if (!name || typeof name !== 'string' || !email || typeof email !== 'string') {
      res.status(400).json({ error: 'Name and email address are required.' });
      return;
    }
    const inquiry: BookingInquiry = {
      id: crypto.randomUUID(),
      type: type === 'RSVP' ? 'RSVP' : 'BOOKING',
      name: name.trim().slice(0, 120),
      email: email.trim().slice(0, 160),
      eventType: typeof eventType === 'string' ? eventType.trim().slice(0, 120) : undefined,
      eventDate: typeof eventDate === 'string' ? eventDate.trim().slice(0, 40) : undefined,
      venueCity: typeof venueCity === 'string' ? venueCity.trim().slice(0, 160) : undefined,
      eventId: typeof eventId === 'string' ? eventId.trim().slice(0, 80) : undefined,
      eventTitle: typeof eventTitle === 'string' ? eventTitle.trim().slice(0, 180) : undefined,
      guestCount: typeof guestCount === 'string' ? guestCount.trim().slice(0, 60) : undefined,
      notes: typeof notes === 'string' ? notes.trim().slice(0, 2000) : undefined,
      createdAt: new Date().toISOString(),
    };
    const inquiries = readJson<BookingInquiry[]>(INQUIRIES_FILE, []);
    inquiries.unshift(inquiry);
    writeJson(INQUIRIES_FILE, inquiries);
    res.status(201).json({ ok: true, id: inquiry.id });
  });

  // --- ADMIN AUTH ROUTES (BACKEND ENFORCED) ---
  app.get('/api/admin/status', (req, res) => {
    const token = extractToken(req);
    const verified = verifySessionToken(token);
    res.json({
      setupRequired: !isPasscodeConfigured(),
      authenticated: Boolean(verified),
      email: verified ? verified.email : null,
    });
  });

  app.post('/api/admin/setup', (req, res) => {
    if (isPasscodeConfigured()) {
      res.status(409).json({ error: 'Administrator passcode is already configured.' });
      return;
    }
    const { email, passcode } = req.body ?? {};
    if (typeof email !== 'string' || email.trim().toLowerCase() !== ADMIN_EMAIL) {
      res.status(403).json({ error: 'Only the authorized administrator email can initialize access.' });
      return;
    }
    if (typeof passcode !== 'string' || passcode.length < 8) {
      res.status(400).json({ error: 'Passcode must be at least 8 characters long.' });
      return;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPasscode(passcode, salt);
    const record: StoredAdminAuth = {
      email: ADMIN_EMAIL,
      salt,
      hash,
      createdAt: new Date().toISOString(),
    };
    writeJson(AUTH_FILE, record);
    const token = signSessionToken(ADMIN_EMAIL);
    setSessionCookie(res, token, req);
    res.status(201).json({ authenticated: true, email: ADMIN_EMAIL, token });
  });

  app.post('/api/admin/login', (req, res) => {
    const ip = req.ip || 'unknown';
    const tracker = failedAttempts.get(ip);
    if (tracker && Date.now() < tracker.lockedUntil) {
      res.status(429).json({ error: 'Too many failed login attempts. Try again in a few minutes.' });
      return;
    }

    const { email, passcode } = req.body ?? {};
    if (typeof email !== 'string' || email.trim().toLowerCase() !== ADMIN_EMAIL) {
      res.status(403).json({ error: 'Access denied. Only the authorized administrator may log in.' });
      return;
    }
    if (!isPasscodeConfigured()) {
      res.status(400).json({ error: 'First-time administrator passcode setup is required.' });
      return;
    }
    if (typeof passcode !== 'string' || !verifyPasscode(passcode)) {
      const nextCount = (tracker?.count ?? 0) + 1;
      failedAttempts.set(ip, {
        count: nextCount,
        lockedUntil: nextCount >= 5 ? Date.now() + 10 * 60 * 1000 : 0,
      });
      res.status(401).json({ error: 'Invalid administrator credentials.' });
      return;
    }

    failedAttempts.delete(ip);
    const token = signSessionToken(ADMIN_EMAIL);
    setSessionCookie(res, token, req);
    res.json({ authenticated: true, email: ADMIN_EMAIL, token });
  });

  app.post('/api/admin/logout', (_req, res) => {
    res.clearCookie('gaga_admin_session', { path: '/' });
    res.json({ ok: true });
  });

  // --- PROTECTED ADMIN CMS ROUTES ---
  app.get('/api/admin/content', requireAdmin, (_req, res) => {
    const items = readJson<ContentItem[]>(CONTENT_FILE, []);
    const sorted = [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json({ items: sorted });
  });

  app.post('/api/admin/upload', requireAdmin, (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message || 'File upload failed.' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'No file selected.' });
        return;
      }
      res.status(201).json({
        url: `/uploads/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size,
        originalName: req.file.originalname,
      });
    });
  });

  app.post('/api/admin/content', requireAdmin, (req, res) => {
    const body = req.body ?? {};
    if (!VALID_CATEGORIES.includes(body.category)) {
      res.status(400).json({ error: 'Invalid content category.' });
      return;
    }
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      res.status(400).json({ error: 'Title is required.' });
      return;
    }

    const now = new Date().toISOString();
    const newItem: ContentItem = {
      id: crypto.randomUUID(),
      category: body.category,
      title: body.title.trim().slice(0, 200),
      subtitle: typeof body.subtitle === 'string' ? body.subtitle.trim().slice(0, 240) : undefined,
      body: typeof body.body === 'string' ? body.body.trim().slice(0, 8000) : '',
      mediaUrl: typeof body.mediaUrl === 'string' ? body.mediaUrl.trim().slice(0, 500) : undefined,
      coverImageUrl:
        typeof body.coverImageUrl === 'string' ? body.coverImageUrl.trim().slice(0, 500) : undefined,
      eventDate: typeof body.eventDate === 'string' ? body.eventDate.trim().slice(0, 60) : undefined,
      venue: typeof body.venue === 'string' ? body.venue.trim().slice(0, 180) : undefined,
      city: typeof body.city === 'string' ? body.city.trim().slice(0, 140) : undefined,
      ticketStatus:
        typeof body.ticketStatus === 'string' ? body.ticketStatus.trim().slice(0, 60) : undefined,
      bpm: typeof body.bpm === 'string' ? body.bpm.trim().slice(0, 20) : undefined,
      genre: typeof body.genre === 'string' ? body.genre.trim().slice(0, 60) : undefined,
      externalUrl:
        typeof body.externalUrl === 'string' ? body.externalUrl.trim().slice(0, 500) : undefined,
      published: body.published !== false,
      createdAt: now,
      updatedAt: now,
    };

    const items = readJson<ContentItem[]>(CONTENT_FILE, []);
    items.unshift(newItem);
    writeJson(CONTENT_FILE, items);
    res.status(201).json({ item: newItem });
  });

  app.put('/api/admin/content/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const body = req.body ?? {};
    const items = readJson<ContentItem[]>(CONTENT_FILE, []);
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Content item not found.' });
      return;
    }
    if (body.category && !VALID_CATEGORIES.includes(body.category)) {
      res.status(400).json({ error: 'Invalid content category.' });
      return;
    }

    const existing = items[index];
    const updated: ContentItem = {
      ...existing,
      category: body.category ?? existing.category,
      title: typeof body.title === 'string' ? body.title.trim().slice(0, 200) : existing.title,
      subtitle:
        typeof body.subtitle === 'string' ? body.subtitle.trim().slice(0, 240) : existing.subtitle,
      body: typeof body.body === 'string' ? body.body.trim().slice(0, 8000) : existing.body,
      mediaUrl:
        typeof body.mediaUrl === 'string' ? body.mediaUrl.trim().slice(0, 500) : existing.mediaUrl,
      coverImageUrl:
        typeof body.coverImageUrl === 'string'
          ? body.coverImageUrl.trim().slice(0, 500)
          : existing.coverImageUrl,
      eventDate:
        typeof body.eventDate === 'string' ? body.eventDate.trim().slice(0, 60) : existing.eventDate,
      venue: typeof body.venue === 'string' ? body.venue.trim().slice(0, 180) : existing.venue,
      city: typeof body.city === 'string' ? body.city.trim().slice(0, 140) : existing.city,
      ticketStatus:
        typeof body.ticketStatus === 'string'
          ? body.ticketStatus.trim().slice(0, 60)
          : existing.ticketStatus,
      bpm: typeof body.bpm === 'string' ? body.bpm.trim().slice(0, 20) : existing.bpm,
      genre: typeof body.genre === 'string' ? body.genre.trim().slice(0, 60) : existing.genre,
      externalUrl:
        typeof body.externalUrl === 'string'
          ? body.externalUrl.trim().slice(0, 500)
          : existing.externalUrl,
      published: typeof body.published === 'boolean' ? body.published : existing.published,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    writeJson(CONTENT_FILE, items);
    res.json({ item: updated });
  });

  app.delete('/api/admin/content/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const items = readJson<ContentItem[]>(CONTENT_FILE, []);
    const target = items.find((i) => i.id === id);
    if (!target) {
      res.status(404).json({ error: 'Content item not found.' });
      return;
    }
    const filtered = items.filter((i) => i.id !== id);
    writeJson(CONTENT_FILE, filtered);
    res.json({ ok: true });
  });

  app.get('/api/admin/inquiries', requireAdmin, (_req, res) => {
    const inquiries = readJson<BookingInquiry[]>(INQUIRIES_FILE, []);
    res.json({ inquiries });
  });

  app.delete('/api/admin/inquiries/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const inquiries = readJson<BookingInquiry[]>(INQUIRIES_FILE, []);
    writeJson(
      INQUIRIES_FILE,
      inquiries.filter((q) => q.id !== id)
    );
    res.json({ ok: true });
  });

  // --- VITE / STATIC FRONTEND SERVING ---
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
