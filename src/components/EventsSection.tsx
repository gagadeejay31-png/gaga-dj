import { ArrowUpRight, Check, X } from 'lucide-react';
import { useState } from 'react';
import { PRESS_PHOTO_STAGE_BANNER } from '../constants/assets';
import { submitPublicInquiry } from '../lib/supabaseClient';
import { ContentItem } from '../types/content';
import { EmptySectionState } from './EmptySectionState';

interface EventsSectionProps {
  events: ContentItem[];
}

export function EventsSection({ events }: EventsSectionProps) {
  const [rsvpEvent, setRsvpEvent] = useState<ContentItem | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestCount, setGuestCount] = useState('2 Guests');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenRsvp = (ev: ContentItem) => {
    setRsvpEvent(ev);
    setSubmitted(false);
    setError(null);
    setGuestName('');
    setGuestEmail('');
  };

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpEvent || !guestName.trim() || !guestEmail.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicInquiry({
        type: 'RSVP',
        name: guestName.trim(),
        email: guestEmail.trim(),
        eventId: rsvpEvent.id,
        eventTitle: rsvpEvent.title,
        guestCount,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit RSVP.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="events" className="relative bg-[#050505] py-24 lg:py-32 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-white/10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
              05. Live Shows &amp; Event Posters
            </p>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white [text-wrap:balance]">
              Upcoming Events
            </h2>
          </div>
          <p className="max-w-sm text-sm text-zinc-400">
            Official club appearances, festival activations, and Gaga Events Soroti showcases.
          </p>
        </div>

        {events.length === 0 ? (
          <EmptySectionState
            sectionLabel="Events · Gaga Events Soroti"
            headline="NEW CONTENT COMING SOON"
            subline="STAY TUNED FOR UPDATES"
            previewImageUrl={PRESS_PHOTO_STAGE_BANNER}
            previewImageAlt="GAGA DJ — MR VIBES holding Pioneer CDJ"
          />
        ) : (
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="border border-white/12 bg-zinc-950/70 overflow-hidden flex flex-col sm:flex-row"
              >
                {(ev.coverImageUrl || ev.mediaUrl) && (
                  <div className="sm:w-48 md:w-56 shrink-0 bg-black border-b sm:border-b-0 sm:border-r border-white/10">
                    <img
                      src={ev.coverImageUrl || ev.mediaUrl}
                      alt={ev.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="p-7 flex flex-col justify-between flex-1">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">
                      {ev.eventDate || 'Upcoming Date'}
                      {ev.ticketStatus ? ` · ${ev.ticketStatus}` : ''}
                    </div>
                    <h3 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-white">
                      {ev.title}
                    </h3>
                    {(ev.venue || ev.city) && (
                      <div className="mt-1.5 text-xs uppercase tracking-[0.14em] text-zinc-400">
                        {[ev.venue, ev.city].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    {ev.body && <p className="mt-4 text-sm text-zinc-400">{ev.body}</p>}
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenRsvp(ev)}
                      className="inline-flex items-center gap-2 border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                    >
                      Guestlist / RSVP
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                    {ev.externalUrl && (
                      <a
                        href={ev.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400 hover:text-white"
                      >
                        Tickets <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Real RSVP Modal */}
      {rsvpEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-rsvp-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-6"
          onClick={() => setRsvpEvent(null)}
        >
          <div
            className="w-full max-w-md border border-white/15 bg-[#0a0a0d] p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-400">
                  {rsvpEvent.eventDate || 'Event RSVP'} {rsvpEvent.city ? `· ${rsvpEvent.city}` : ''}
                </p>
                <h3
                  id="event-rsvp-title"
                  className="mt-1.5 font-display text-3xl font-bold uppercase tracking-tight text-white"
                >
                  {rsvpEvent.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRsvpEvent(null)}
                aria-label="Close RSVP modal"
                className="flex h-10 w-10 items-center justify-center border border-white/15 text-zinc-300 hover:border-white hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {submitted ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center border border-cyan-400/50 text-cyan-400">
                  <Check className="h-5 w-5" />
                </div>
                <h4 className="mt-4 font-display text-2xl font-bold uppercase text-white">
                  RSVP Recorded
                </h4>
                <p className="mt-2 text-sm text-zinc-400">
                  Your request for {guestName} ({guestCount}) has been submitted to Gaga Events Soroti.
                </p>
                <button
                  type="button"
                  onClick={() => setRsvpEvent(null)}
                  className="mt-6 w-full bg-white py-3 text-xs font-semibold uppercase tracking-[0.16em] text-black hover:bg-cyan-400 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleRsvpSubmit} className="mt-6 space-y-4">
                {error && <p className="text-xs text-red-400">{error}</p>}
                <div>
                  <label htmlFor="ev-rsvp-name" className="block text-xs uppercase tracking-[0.14em] text-zinc-400">
                    Full Name
                  </label>
                  <input
                    id="ev-rsvp-name"
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Enter your name"
                    className="mt-1.5 w-full border border-white/15 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="ev-rsvp-email" className="block text-xs uppercase tracking-[0.14em] text-zinc-400">
                    Email Address
                  </label>
                  <input
                    id="ev-rsvp-email"
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5 w-full border border-white/15 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="ev-rsvp-count" className="block text-xs uppercase tracking-[0.14em] text-zinc-400">
                    Guest Allocation
                  </label>
                  <select
                    id="ev-rsvp-count"
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                    className="mt-1.5 w-full border border-white/15 bg-black px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="1 Guest">1 Guest</option>
                    <option value="2 Guests">2 Guests</option>
                    <option value="VIP Table">VIP Table</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-white py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-black hover:bg-cyan-400 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Confirm RSVP'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
