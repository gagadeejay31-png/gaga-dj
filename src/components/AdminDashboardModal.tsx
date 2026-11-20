import { AlertCircle, Check, Copy, Edit3, Inbox, Lock, LogOut, Plus, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { BookingInquiry, CONTENT_CATEGORIES, ContentCategory, ContentItem } from '../types/content';

interface AdminDashboardModalProps {
  open: boolean;
  onClose: () => void;
  onContentChanged: () => void;
}

const TOKEN_STORAGE_KEY = 'gaga_admin_token';

const FIX_PERMISSIONS_SQL = `-- Grant API role permissions & confirm gagadeejay31@gmail.com
grant usage on schema public to anon, authenticated;
grant select on public.content_items to anon, authenticated;
grant insert, update, delete on public.content_items to authenticated;
grant insert on public.inquiries to anon, authenticated;
grant select, delete on public.inquiries to authenticated;

-- Confirm admin email in Supabase Auth if pending verification
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where lower(email) = 'gagadeejay31@gmail.com';

notify pgrst, 'reload schema';`;

export function AdminDashboardModal({ open, onClose, onContentChanged }: AdminDashboardModalProps) {
  const [statusLoading, setStatusLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [tablesExist, setTablesExist] = useState(true);
  const [permissionsReady, setPermissionsReady] = useState(true);
  const [copiedSql, setCopiedSql] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_STORAGE_KEY));

  // Login / Register state for Supabase Auth
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Dashboard tabs & data
  const [activeTab, setActiveTab] = useState<'CONTENT' | 'INBOX'>('CONTENT');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [inquiries, setInquiries] = useState<BookingInquiry[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ContentCategory>('ALL');

  // Content Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState<ContentCategory>('NEWS');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [body, setBody] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [ticketStatus, setTicketStatus] = useState('Tickets Available');
  const [bpm, setBpm] = useState('');
  const [genre, setGenre] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [published, setPublished] = useState(true);
  const [uploadingField, setUploadingField] = useState<'media' | 'cover' | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const authHeaders = useCallback((): Record<string, string> => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  const checkStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/admin/status', { headers: authHeaders() });
      const data = (await res.json()) as {
        authenticated: boolean;
        email: string | null;
        tablesExist: boolean;
        permissionsReady: boolean;
      };
      setAuthenticated(data.authenticated);
      setAdminEmail(data.email);
      setTablesExist(data.tablesExist);
      setPermissionsReady(data.permissionsReady);
      if (!data.authenticated && token) {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
      }
    } catch {
      setAuthError('Unable to reach server.');
    } finally {
      setStatusLoading(false);
    }
  }, [authHeaders, token]);

  const fetchAdminData = useCallback(async () => {
    try {
      const [contentRes, inqRes] = await Promise.all([
        fetch('/api/admin/content', { headers: authHeaders() }),
        fetch('/api/admin/inquiries', { headers: authHeaders() }),
      ]);
      if (contentRes.ok) {
        const cData = (await contentRes.json()) as {
          items: ContentItem[];
          tablesExist?: boolean;
          permissionsReady?: boolean;
        };
        setItems(cData.items ?? []);
        if (typeof cData.tablesExist === 'boolean') setTablesExist(cData.tablesExist);
        if (typeof cData.permissionsReady === 'boolean') setPermissionsReady(cData.permissionsReady);
      }
      if (inqRes.ok) {
        const iData = (await inqRes.json()) as { inquiries: BookingInquiry[] };
        setInquiries(iData.inquiries ?? []);
      }
    } catch {
      // ignore transient failures
    }
  }, [authHeaders]);

  useEffect(() => {
    if (open) {
      void checkStatus();
    }
  }, [open, checkStatus]);

  useEffect(() => {
    if (open && authenticated) {
      void fetchAdminData();
    }
  }, [open, authenticated, fetchAdminData]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    if (authMode === 'SIGNUP' && passwordInput !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    setAuthBusy(true);
    try {
      const endpoint = authMode === 'SIGNUP' ? '/api/admin/signup' : '/api/admin/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim(),
          password: passwordInput,
        }),
      });
      const data = (await res.json()) as {
        authenticated?: boolean;
        confirmationRequired?: boolean;
        message?: string;
        email?: string;
        token?: string;
        error?: string;
      };
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }
      if (data.confirmationRequired) {
        setAuthMessage(
          data.message ||
            'Account created. Verify your email or run the confirmation SQL, then sign in.'
        );
        setAuthMode('LOGIN');
        setPasswordInput('');
        setConfirmPassword('');
        return;
      }
      if (data.token) {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        setToken(data.token);
      }
      setAuthenticated(true);
      setAdminEmail(data.email ?? null);
      setPasswordInput('');
      setConfirmPassword('');
    } catch {
      setAuthError('Network error during authentication.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleResendOrReset = async (kind: 'resend-confirmation' | 'reset-password') => {
    setAuthError(null);
    setAuthMessage(null);
    if (!emailInput.trim()) {
      setAuthError('Enter your administrator email above first.');
      return;
    }
    setAuthBusy(true);
    try {
      const res = await fetch(`/api/admin/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setAuthError(data.error || 'Request failed.');
      } else {
        setAuthMessage(data.message || 'Email sent.');
      }
    } catch {
      setAuthError('Network error.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setAuthenticated(false);
    setAdminEmail(null);
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(FIX_PERMISSIONS_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  const resetEditor = (defaultCat: ContentCategory = 'NEWS') => {
    setEditingId(null);
    setCategory(defaultCat);
    setTitle('');
    setSubtitle('');
    setBody('');
    setMediaUrl('');
    setCoverImageUrl('');
    setEventDate('');
    setVenue('');
    setCity('');
    setTicketStatus('Tickets Available');
    setBpm('');
    setGenre('');
    setExternalUrl('');
    setPublished(true);
    setEditorError(null);
    setEditorOpen(true);
  };

  const openEditItem = (item: ContentItem) => {
    setEditingId(item.id);
    setCategory(item.category);
    setTitle(item.title);
    setSubtitle(item.subtitle ?? '');
    setBody(item.body ?? '');
    setMediaUrl(item.mediaUrl ?? '');
    setCoverImageUrl(item.coverImageUrl ?? '');
    setEventDate(item.eventDate ?? '');
    setVenue(item.venue ?? '');
    setCity(item.city ?? '');
    setTicketStatus(item.ticketStatus ?? 'Tickets Available');
    setBpm(item.bpm ?? '');
    setGenre(item.genre ?? '');
    setExternalUrl(item.externalUrl ?? '');
    setPublished(item.published);
    setEditorError(null);
    setEditorOpen(true);
  };

  const handleFileUpload = async (file: File, target: 'media' | 'cover') => {
    setUploadingField(target);
    setEditorError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setEditorError(data.error || 'File upload failed.');
        return;
      }
      if (target === 'media') {
        setMediaUrl(data.url);
      } else {
        setCoverImageUrl(data.url);
      }
    } catch {
      setEditorError('Upload error. Please try again.');
    } finally {
      setUploadingField(null);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setEditorError('Title is required.');
      return;
    }
    setSaveBusy(true);
    setEditorError(null);
    try {
      const payload = {
        category,
        title: title.trim(),
        subtitle: subtitle.trim(),
        body: body.trim(),
        mediaUrl: mediaUrl.trim(),
        coverImageUrl: coverImageUrl.trim(),
        eventDate: eventDate.trim(),
        venue: venue.trim(),
        city: city.trim(),
        ticketStatus: ticketStatus.trim(),
        bpm: bpm.trim(),
        genre: genre.trim(),
        externalUrl: externalUrl.trim(),
        published,
      };
      const url = editingId ? `/api/admin/content/${editingId}` : '/api/admin/content';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setEditorError(data.error || 'Failed to save item.');
        return;
      }
      setEditorOpen(false);
      await fetchAdminData();
      onContentChanged();
    } catch {
      setEditorError('Network error while saving.');
    } finally {
      setSaveBusy(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    const res = await fetch(`/api/admin/content/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      await fetchAdminData();
      onContentChanged();
    }
  };

  const handleTogglePublished = async (item: ContentItem) => {
    const res = await fetch(`/api/admin/content/${item.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ published: !item.published }),
    });
    if (res.ok) {
      await fetchAdminData();
      onContentChanged();
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    const res = await fetch(`/api/admin/inquiries/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      await fetchAdminData();
    }
  };

  if (!open) return null;

  const filteredItems =
    categoryFilter === 'ALL' ? items : items.filter((i) => i.category === categoryFilter);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="GAGA DJ Administrator Studio"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md p-4 sm:p-6 overflow-y-auto"
    >
      <div className="w-full max-w-5xl border border-white/15 bg-[#08080b] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-black shrink-0">
          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4 text-cyan-400" />
            <span className="font-display text-xl font-bold uppercase tracking-wide text-white">
              GAGA DJ · Private Admin Studio
            </span>
          </div>

          <div className="flex items-center gap-3">
            {authenticated && (
              <>
                <span className="hidden sm:inline text-xs text-zinc-400">{adminEmail}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 border border-white/15 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-zinc-300 hover:border-white hover:text-white cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Admin Studio"
              className="flex h-9 w-9 items-center justify-center border border-white/15 text-zinc-300 hover:border-white hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {(!tablesExist || !permissionsReady) && (
            <div className="mb-6 border border-amber-500/40 bg-amber-950/25 p-4 text-xs text-amber-200 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  {!tablesExist
                    ? 'Supabase is connected, but the database tables (`content_items`, `inquiries`) have not been created yet.'
                    : 'Your Supabase tables (`content_items`, `inquiries`) exist, but API role permissions (`GRANT`) have not been granted yet (error 42501). Run this quick SQL fix in your Supabase SQL Editor:'}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => void handleCopySql()}
                  className="inline-flex items-center gap-1.5 border border-amber-400/50 bg-black/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200 hover:bg-amber-400 hover:text-black transition-colors cursor-pointer"
                >
                  {copiedSql ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedSql ? 'Copied Fix SQL' : 'Copy GRANT & Auth Fix SQL'}
                </button>
                <button
                  type="button"
                  onClick={() => void checkStatus()}
                  className="border border-white/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white hover:border-cyan-400 cursor-pointer"
                >
                  Re-check Connection
                </button>
              </div>
            </div>
          )}

          {statusLoading ? (
            <div className="py-16 text-center text-xs uppercase tracking-[0.2em] text-zinc-400">
              Connecting to Supabase Backend...
            </div>
          ) : !authenticated ? (
            <div className="mx-auto max-w-md py-6">
              <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('LOGIN');
                    setAuthError(null);
                  }}
                  className={`px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] cursor-pointer ${
                    authMode === 'LOGIN'
                      ? 'bg-white text-black'
                      : 'border border-white/15 text-zinc-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('SIGNUP');
                    setAuthError(null);
                  }}
                  className={`px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] cursor-pointer ${
                    authMode === 'SIGNUP'
                      ? 'bg-white text-black'
                      : 'border border-white/15 text-zinc-400 hover:text-white'
                  }`}
                >
                  Create Admin Account
                </button>
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                Supabase Backend Authorization
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold uppercase text-white">
                {authMode === 'SIGNUP' ? 'Register Administrator' : 'Administrator Sign In'}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                {authMode === 'SIGNUP'
                  ? 'Register your Supabase Auth password using the authorized administrator email.'
                  : 'Authorized administrator access only. Sign in via Supabase Auth to publish content.'}
              </p>

              <form onSubmit={handleAuthSubmit} className="mt-6 space-y-4">
                {authError && (
                  <div className="border border-red-500/40 bg-red-950/30 px-4 py-3 text-xs text-red-300">
                    {authError}
                  </div>
                )}
                {authMessage && (
                  <div className="border border-cyan-500/40 bg-cyan-950/30 px-4 py-3 text-xs text-cyan-200">
                    {authMessage}
                  </div>
                )}

                <div>
                  <label htmlFor="admin-email" className="block text-xs uppercase tracking-[0.14em] text-zinc-400">
                    Administrator Email
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter authorized email"
                    className="mt-1.5 w-full border border-white/15 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="admin-password" className="block text-xs uppercase tracking-[0.14em] text-zinc-400">
                    Password
                  </label>
                  <input
                    id="admin-password"
                    type="password"
                    required
                    minLength={authMode === 'SIGNUP' ? 8 : 1}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1.5 w-full border border-white/15 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {authMode === 'SIGNUP' && (
                  <div>
                    <label htmlFor="admin-password-confirm" className="block text-xs uppercase tracking-[0.14em] text-zinc-400">
                      Confirm Password
                    </label>
                    <input
                      id="admin-password-confirm"
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1.5 w-full border border-white/15 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full bg-white py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-black hover:bg-cyan-400 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {authBusy
                    ? 'Authenticating...'
                    : authMode === 'SIGNUP'
                      ? 'Register Admin Account'
                      : 'Sign In to Dashboard'}
                </button>

                {authMode === 'LOGIN' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-zinc-400">
                    <button
                      type="button"
                      onClick={() => void handleResendOrReset('resend-confirmation')}
                      className="hover:text-cyan-400 underline underline-offset-4 cursor-pointer"
                    >
                      Resend verification email
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleResendOrReset('reset-password')}
                      className="hover:text-cyan-400 underline underline-offset-4 cursor-pointer"
                    >
                      Reset password
                    </button>
                  </div>
                )}
              </form>
            </div>
          ) : editorOpen ? (
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="font-display text-2xl font-bold uppercase text-white">
                  {editingId ? 'Edit Published Content' : 'Publish New Content'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="border border-white/15 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-zinc-300 hover:text-white cursor-pointer"
                >
                  Back to List
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="mt-6 space-y-5">
                {editorError && (
                  <div className="border border-red-500/40 bg-red-950/30 px-4 py-3 text-xs text-red-300">
                    {editorError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="cms-cat" className="block text-xs uppercase tracking-[0.14em] text-zinc-400">
                      Content Category
                    </label>
                    <select
                      id="cms-cat"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ContentCategory)}
                      className="mt-1.5 w-full border border-white/15 bg-black px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    >
                      {CONTENT_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label} ({c.value})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="cms-title" className="block text-xs uppercase tracking-[0.14em] text-zinc-400">
                      Title / Headline
                    </label>
                    <input
                      id="cms-title"
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter title"
                      className="mt-1.5 w-full border border-white/15 bg-black px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="cms-sub" className="block text-xs uppercase tracking-[0.14em] text-zinc-400">
                      Subtitle / Kicker (Optional)
                    </label>
                    <input
                      id="cms-sub"
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="Short subtitle or sponsor name"
                      className="mt-1.5 w-full border border-white/15 bg-black px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="cms-ext" className="block text-xs uppercase tracking-[0.14em] text-zinc-400">
                      External Link (Optional)
                    </label>
                    <input
                      id="cms-ext"
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="https://..."
                      className="mt-1.5 w-full border border-white/15 bg-black px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                {category === 'EVENTS' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border border-white/10 p-4 bg-black/50">
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                        Event Date
                      </label>
                      <input
                        type="text"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        placeholder="e.g. 12 Dec 2026"
                        className="mt-1 w-full border border-white/15 bg-black px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                        Venue
                      </label>
                      <input
                        type="text"
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        placeholder="Venue name"
                        className="mt-1 w-full border border-white/15 bg-black px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                        City
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Soroti City, Uganda"
                        className="mt-1 w-full border border-white/15 bg-black px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                        Ticket Status
                      </label>
                      <input
                        type="text"
                        value={ticketStatus}
                        onChange={(e) => setTicketStatus(e.target.value)}
                        placeholder="Tickets Available"
                        className="mt-1 w-full border border-white/15 bg-black px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                )}

                {category === 'MUSIC' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-white/10 p-4 bg-black/50">
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                        Genre
                      </label>
                      <input
                        type="text"
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        placeholder="Afrobeats / Amapiano / Dancehall"
                        className="mt-1 w-full border border-white/15 bg-black px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                        BPM
                      </label>
                      <input
                        type="text"
                        value={bpm}
                        onChange={(e) => setBpm(e.target.value)}
                        placeholder="e.g. 116"
                        className="mt-1 w-full border border-white/15 bg-black px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="border border-white/12 p-4 bg-black/60">
                    <div className="text-xs uppercase tracking-[0.14em] text-zinc-300 font-semibold">
                      {category === 'MUSIC'
                        ? 'Upload Audio Mix (.mp3, .wav, .m4a)'
                        : category === 'VIDEOS'
                          ? 'Upload Video File (.mp4, .webm, .mov)'
                          : 'Upload Photograph / Flyer'}
                    </div>
                    <label className="mt-3 inline-flex items-center gap-2 border border-white/25 px-4 py-2 text-xs uppercase tracking-[0.14em] text-white hover:bg-white hover:text-black transition-colors cursor-pointer">
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingField === 'media' ? 'Uploading...' : 'Choose File'}
                      <input
                        type="file"
                        accept={
                          category === 'MUSIC'
                            ? 'audio/*'
                            : category === 'VIDEOS'
                              ? 'video/*'
                              : 'image/*'
                        }
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleFileUpload(f, 'media');
                        }}
                      />
                    </label>
                    {mediaUrl && (
                      <div className="mt-2 text-xs text-cyan-400 truncate">Uploaded: {mediaUrl}</div>
                    )}
                  </div>

                  <div className="border border-white/12 p-4 bg-black/60">
                    <div className="text-xs uppercase tracking-[0.14em] text-zinc-300 font-semibold">
                      {category === 'EVENTS'
                        ? 'Upload Event Poster Image'
                        : 'Upload Cover / Thumbnail Image (Optional)'}
                    </div>
                    <label className="mt-3 inline-flex items-center gap-2 border border-white/25 px-4 py-2 text-xs uppercase tracking-[0.14em] text-white hover:bg-white hover:text-black transition-colors cursor-pointer">
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingField === 'cover' ? 'Uploading...' : 'Choose Image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleFileUpload(f, 'cover');
                        }}
                      />
                    </label>
                    {coverImageUrl && (
                      <div className="mt-2 text-xs text-cyan-400 truncate">Uploaded: {coverImageUrl}</div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="cms-body" className="block text-xs uppercase tracking-[0.14em] text-zinc-400">
                    Description / Article Body
                  </label>
                  <textarea
                    id="cms-body"
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write details, tracklist, announcement text, or event info..."
                    className="mt-1.5 w-full border border-white/15 bg-black px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <label className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                    className="h-4 w-4 accent-cyan-400"
                  />
                  Publish immediately on public website
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    className="border border-white/15 px-5 py-3 text-xs uppercase tracking-[0.14em] text-zinc-300 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveBusy}
                    className="bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-black hover:bg-cyan-400 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {saveBusy ? 'Saving...' : editingId ? 'Save Changes' : 'Publish Content'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('CONTENT')}
                    className={`px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] cursor-pointer ${
                      activeTab === 'CONTENT'
                        ? 'bg-white text-black'
                        : 'border border-white/15 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Published Content ({items.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('INBOX')}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] cursor-pointer ${
                      activeTab === 'INBOX'
                        ? 'bg-white text-black'
                        : 'border border-white/15 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Inbox className="h-3.5 w-3.5" />
                    Bookings &amp; RSVPs ({inquiries.length})
                  </button>
                </div>

                {activeTab === 'CONTENT' && (
                  <button
                    type="button"
                    onClick={() => resetEditor(categoryFilter === 'ALL' ? 'NEWS' : categoryFilter)}
                    className="inline-flex items-center gap-2 bg-cyan-400 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-black hover:bg-white transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Add New Content
                  </button>
                )}
              </div>

              {activeTab === 'CONTENT' ? (
                <div className="mt-6">
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('ALL')}
                      className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] cursor-pointer ${
                        categoryFilter === 'ALL'
                          ? 'bg-white text-black'
                          : 'border border-white/15 text-zinc-400 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    {CONTENT_CATEGORIES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCategoryFilter(c.value)}
                        className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] cursor-pointer ${
                          categoryFilter === c.value
                            ? 'bg-white text-black'
                            : 'border border-white/15 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {c.value}
                      </button>
                    ))}
                  </div>

                  {filteredItems.length === 0 ? (
                    <div className="border border-white/10 bg-black/50 p-10 text-center">
                      <p className="font-display text-2xl font-bold uppercase text-white">
                        No Content Published Yet
                      </p>
                      <p className="mt-2 text-sm text-zinc-400">
                        Click “Add New Content” to upload photographs, DJ mixes, videos, event posters, news, advertisements, or announcements.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/10 border-t border-b border-white/10">
                      {filteredItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-400">
                              {item.category} · {item.published ? 'Published' : 'Draft'} ·{' '}
                              {new Date(item.createdAt).toLocaleDateString()}
                            </div>
                            <div className="mt-1 font-display text-xl font-bold uppercase text-white truncate">
                              {item.title}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => void handleTogglePublished(item)}
                              className="border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-zinc-300 hover:border-white hover:text-white cursor-pointer"
                            >
                              {item.published ? 'Unpublish' : 'Publish'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditItem(item)}
                              aria-label={`Edit ${item.title}`}
                              className="inline-flex items-center gap-1 border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white hover:border-cyan-400 cursor-pointer"
                            >
                              <Edit3 className="h-3 w-3" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteItem(item.id)}
                              aria-label={`Delete ${item.title}`}
                              className="inline-flex items-center gap-1 border border-red-500/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-red-400 hover:bg-red-950/40 cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6">
                  {inquiries.length === 0 ? (
                    <div className="border border-white/10 bg-black/50 p-10 text-center text-sm text-zinc-400">
                      No booking inquiries or event RSVPs have been submitted yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/10 border-t border-b border-white/10">
                      {inquiries.map((inq) => (
                        <div key={inq.id} className="py-5 flex flex-col sm:flex-row justify-between gap-4">
                          <div>
                            <div className="text-xs uppercase tracking-[0.16em] text-cyan-400">
                              {inq.type} · {new Date(inq.createdAt).toLocaleString()}
                            </div>
                            <div className="mt-1 font-display text-xl font-bold uppercase text-white">
                              {inq.name} — {inq.email}
                            </div>
                            <div className="mt-1 text-xs text-zinc-400">
                              {inq.eventType && <span>{inq.eventType} · </span>}
                              {inq.venueCity && <span>{inq.venueCity} · </span>}
                              {inq.eventDate && <span>{inq.eventDate}</span>}
                              {inq.eventTitle && <span>Event: {inq.eventTitle} ({inq.guestCount})</span>}
                            </div>
                            {inq.notes && <p className="mt-2 text-sm text-zinc-300">{inq.notes}</p>}
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleDeleteInquiry(inq.id)}
                            className="self-start border border-red-500/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-red-400 hover:bg-red-950/40 cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
