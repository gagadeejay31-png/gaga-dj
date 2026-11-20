import type { BookingInquiry, ContentCategory, ContentItem } from '../types/content';

export const ADMIN_EMAIL = 'gagadeejay31@gmail.com';
export const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL || 'https://uukdadjewhngljcxhhth.supabase.co'
).replace(/\/+$/, '');
export const SUPABASE_REST_URL = `${SUPABASE_URL}/rest/v1`;
export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_f3r1_vfpM9KIK5MUtG6N9w_VTByN0F4';
export const SUPABASE_STORAGE_BUCKET = 'gaga-media';

const SESSION_STORAGE_KEY = 'gaga_supabase_session';

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  email: string;
  expiresAt: number;
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

export function getStoredSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.accessToken || parsed.email?.toLowerCase() !== ADMIN_EMAIL) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(session: StoredSession) {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function getValidAccessToken(): Promise<string | null> {
  const session = getStoredSession();
  if (!session) return null;

  // Refresh if expiring within 60s
  if (Date.now() > session.expiresAt - 60_000 && session.refreshToken) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      });
      if (!res.ok) {
        clearSession();
        return null;
      }
      const data = (await res.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        user?: { email?: string };
      };
      if (!data.access_token || data.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
        clearSession();
        return null;
      }
      const updated: StoredSession = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || session.refreshToken,
        email: ADMIN_EMAIL,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      };
      saveSession(updated);
      return updated.accessToken;
    } catch {
      return session.accessToken;
    }
  }

  return session.accessToken;
}

async function sbFetch(
  url: string,
  options: RequestInit = {},
  bearerToken?: string | null
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('apikey', SUPABASE_KEY);
  if (bearerToken) {
    headers.set('Authorization', `Bearer ${bearerToken}`);
  }
  return fetch(url, { ...options, headers });
}

export async function checkSupabaseStatus(): Promise<{
  authenticated: boolean;
  email: string | null;
  tablesExist: boolean;
  permissionsReady: boolean;
}> {
  const token = await getValidAccessToken();
  let tablesExist = false;
  let permissionsReady = false;

  try {
    const res = await sbFetch(`${SUPABASE_REST_URL}/content_items?select=id&limit=1`, {}, token);
    if (res.ok) {
      tablesExist = true;
      permissionsReady = true;
    } else {
      const err = (await res.json().catch(() => null)) as { code?: string } | null;
      tablesExist = err?.code !== 'PGRST205' && err?.code !== '42P01';
      permissionsReady = false;
    }
  } catch {
    tablesExist = false;
    permissionsReady = false;
  }

  return {
    authenticated: Boolean(token),
    email: token ? ADMIN_EMAIL : null,
    tablesExist,
    permissionsReady,
  };
}

export async function fetchPublishedContent(): Promise<ContentItem[]> {
  const res = await sbFetch(
    `${SUPABASE_REST_URL}/content_items?select=*&published=eq.true&order=created_at.desc`
  );
  if (!res.ok) return [];
  const rows = (await res.json()) as SupabaseRow[];
  return Array.isArray(rows) ? rows.map(mapRowToContentItem) : [];
}

export async function submitPublicInquiry(payload: {
  type: 'BOOKING' | 'RSVP';
  name: string;
  email: string;
  eventType?: string;
  eventDate?: string;
  venueCity?: string;
  eventId?: string;
  eventTitle?: string;
  guestCount?: string;
  notes?: string;
}): Promise<void> {
  const res = await sbFetch(`${SUPABASE_REST_URL}/inquiries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      type: payload.type,
      name: payload.name.trim().slice(0, 120),
      email: payload.email.trim().slice(0, 160),
      event_type: payload.eventType?.trim().slice(0, 120) || null,
      event_date: payload.eventDate?.trim().slice(0, 40) || null,
      venue_city: payload.venueCity?.trim().slice(0, 160) || null,
      event_id: payload.eventId?.trim().slice(0, 80) || null,
      event_title: payload.eventTitle?.trim().slice(0, 180) || null,
      guest_count: payload.guestCount?.trim().slice(0, 60) || null,
      notes: payload.notes?.trim().slice(0, 2000) || null,
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message || 'Unable to submit request.');
  }
}

export async function adminSignIn(email: string, password: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  if (normalized !== ADMIN_EMAIL) {
    throw new Error('Access denied. Only gagadeejay31@gmail.com may log in.');
  }

  const res = await sbFetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: { email?: string };
    error_description?: string;
    msg?: string;
    message?: string;
  };

  if (!res.ok || !data.access_token) {
    const raw = data.error_description || data.msg || data.message || 'Invalid login credentials.';
    if (raw.toLowerCase().includes('invalid')) {
      throw new Error(
        'Invalid login credentials. If you have not registered yet, click "Create Admin Account" first, or use Reset password below.'
      );
    }
    throw new Error(raw);
  }

  if (data.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
    throw new Error('Unauthorized administrator account.');
  }

  saveSession({
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
    email: ADMIN_EMAIL,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  });
  return ADMIN_EMAIL;
}

export async function adminSignUp(
  email: string,
  password: string
): Promise<{ authenticated: boolean; message?: string }> {
  const normalized = email.trim().toLowerCase();
  if (normalized !== ADMIN_EMAIL) {
    throw new Error('Access denied. Only gagadeejay31@gmail.com may register.');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  const res = await sbFetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: { email?: string };
    msg?: string;
    error_description?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data.msg || data.error_description || data.message || 'Signup failed.');
  }

  if (data.access_token && data.user?.email?.toLowerCase() === ADMIN_EMAIL) {
    saveSession({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
      email: ADMIN_EMAIL,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    });
    return { authenticated: true };
  }

  return {
    authenticated: false,
    message:
      'Account created. Check gagadeejay31@gmail.com for your verification link (or run the confirmation SQL in Supabase SQL Editor), then sign in.',
  };
}

export async function adminResendConfirmation(email: string): Promise<string> {
  if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
    throw new Error('Only gagadeejay31@gmail.com is authorized.');
  }
  const res = await sbFetch(`${SUPABASE_URL}/auth/v1/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'signup', email: ADMIN_EMAIL }),
  });
  if (!res.ok) {
    const d = (await res.json().catch(() => null)) as { msg?: string; message?: string } | null;
    throw new Error(d?.msg || d?.message || 'Unable to resend confirmation email.');
  }
  return 'Verification email resent to gagadeejay31@gmail.com.';
}

export async function adminResetPassword(email: string): Promise<string> {
  if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
    throw new Error('Only gagadeejay31@gmail.com is authorized.');
  }
  const res = await sbFetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL }),
  });
  if (!res.ok) {
    const d = (await res.json().catch(() => null)) as { msg?: string; message?: string } | null;
    throw new Error(d?.msg || d?.message || 'Unable to send password reset email.');
  }
  return 'Password reset link sent to gagadeejay31@gmail.com.';
}

export async function adminSignOut(): Promise<void> {
  const token = await getValidAccessToken();
  clearSession();
  if (token) {
    await sbFetch(`${SUPABASE_URL}/auth/v1/logout`, { method: 'POST' }, token).catch(() => {});
  }
}

export async function fetchAllAdminContent(): Promise<ContentItem[]> {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Administrator authentication required.');
  const res = await sbFetch(
    `${SUPABASE_REST_URL}/content_items?select=*&order=created_at.desc`,
    {},
    token
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message || 'Unable to load admin content.');
  }
  const rows = (await res.json()) as SupabaseRow[];
  return Array.isArray(rows) ? rows.map(mapRowToContentItem) : [];
}

export async function uploadMediaFile(file: File): Promise<string> {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Administrator authentication required.');

  const dotIdx = file.name.lastIndexOf('.');
  const ext = dotIdx >= 0 ? file.name.slice(dotIdx).toLowerCase().replace(/[^a-z0-9.]/g, '') : '';
  const base = (dotIdx >= 0 ? file.name.slice(0, dotIdx) : file.name)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .slice(0, 40);
  const objectName = `${Date.now()}-${base || 'media'}${ext}`;

  const res = await sbFetch(
    `${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${objectName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: file,
    },
    token
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
    throw new Error(err?.message || err?.error || 'Upload to Supabase Storage failed.');
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${objectName}`;
}

export interface ContentInput {
  category: ContentCategory;
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
}

export async function createContentItem(input: ContentInput): Promise<ContentItem> {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Administrator authentication required.');

  const res = await sbFetch(
    `${SUPABASE_REST_URL}/content_items`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        category: input.category,
        title: input.title.trim().slice(0, 200),
        subtitle: input.subtitle?.trim().slice(0, 240) || null,
        body: input.body.trim().slice(0, 8000),
        media_url: input.mediaUrl?.trim().slice(0, 500) || null,
        cover_image_url: input.coverImageUrl?.trim().slice(0, 500) || null,
        event_date: input.eventDate?.trim().slice(0, 60) || null,
        venue: input.venue?.trim().slice(0, 180) || null,
        city: input.city?.trim().slice(0, 140) || null,
        ticket_status: input.ticketStatus?.trim().slice(0, 60) || null,
        bpm: input.bpm?.trim().slice(0, 20) || null,
        genre: input.genre?.trim().slice(0, 60) || null,
        external_url: input.externalUrl?.trim().slice(0, 500) || null,
        published: input.published,
      }),
    },
    token
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message || 'Failed to publish content.');
  }
  const rows = (await res.json()) as SupabaseRow[];
  return mapRowToContentItem(rows[0]);
}

export async function updateContentItem(id: string, input: Partial<ContentInput>): Promise<ContentItem> {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Administrator authentication required.');

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.category !== undefined) patch.category = input.category;
  if (input.title !== undefined) patch.title = input.title.trim().slice(0, 200);
  if (input.subtitle !== undefined) patch.subtitle = input.subtitle.trim().slice(0, 240) || null;
  if (input.body !== undefined) patch.body = input.body.trim().slice(0, 8000);
  if (input.mediaUrl !== undefined) patch.media_url = input.mediaUrl.trim().slice(0, 500) || null;
  if (input.coverImageUrl !== undefined) {
    patch.cover_image_url = input.coverImageUrl.trim().slice(0, 500) || null;
  }
  if (input.eventDate !== undefined) patch.event_date = input.eventDate.trim().slice(0, 60) || null;
  if (input.venue !== undefined) patch.venue = input.venue.trim().slice(0, 180) || null;
  if (input.city !== undefined) patch.city = input.city.trim().slice(0, 140) || null;
  if (input.ticketStatus !== undefined) {
    patch.ticket_status = input.ticketStatus.trim().slice(0, 60) || null;
  }
  if (input.bpm !== undefined) patch.bpm = input.bpm.trim().slice(0, 20) || null;
  if (input.genre !== undefined) patch.genre = input.genre.trim().slice(0, 60) || null;
  if (input.externalUrl !== undefined) {
    patch.external_url = input.externalUrl.trim().slice(0, 500) || null;
  }
  if (input.published !== undefined) patch.published = input.published;

  const res = await sbFetch(
    `${SUPABASE_REST_URL}/content_items?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(patch),
    },
    token
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message || 'Failed to update content.');
  }
  const rows = (await res.json()) as SupabaseRow[];
  return mapRowToContentItem(rows[0]);
}

export async function deleteContentItem(id: string): Promise<void> {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Administrator authentication required.');

  const res = await sbFetch(
    `${SUPABASE_REST_URL}/content_items?id=eq.${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    token
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message || 'Failed to delete content.');
  }
}

export async function fetchAdminInquiries(): Promise<BookingInquiry[]> {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Administrator authentication required.');

  const res = await sbFetch(
    `${SUPABASE_REST_URL}/inquiries?select=*&order=created_at.desc`,
    {},
    token
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message || 'Failed to load inquiries.');
  }
  const rows = (await res.json()) as SupabaseInquiryRow[];
  return Array.isArray(rows) ? rows.map(mapRowToInquiry) : [];
}

export async function deleteAdminInquiry(id: string): Promise<void> {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Administrator authentication required.');

  const res = await sbFetch(
    `${SUPABASE_REST_URL}/inquiries?id=eq.${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    token
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message || 'Failed to delete inquiry.');
  }
}
