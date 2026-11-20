import { Check, FileText, Mail, MapPin, X } from 'lucide-react';
import { useState } from 'react';
import { ARTIST_IDENTITY } from '../constants/assets';

export function ContactSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [eventType, setEventType] = useState('Club Residency / Guest Set');
  const [eventDate, setEventDate] = useState('');
  const [cityVenue, setCityVenue] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riderOpen, setRiderOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !cityVenue.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'BOOKING',
          name: name.trim(),
          email: email.trim(),
          eventType,
          eventDate,
          venueCity: cityVenue.trim(),
          notes: details.trim(),
        }),
      });
      if (!res.ok) throw new Error('Failed to send booking inquiry.');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="relative bg-[#050505] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left: Direct Management & Location */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
                07. Contact &amp; Bookings
              </p>
              <h2 className="mt-3 font-display text-4xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white [text-wrap:balance]">
                Book GAGA DJ
              </h2>
              <p className="mt-5 text-sm sm:text-base leading-relaxed text-zinc-400">
                For club nights, festivals, private celebrations, and Gaga Events Soroti production bookings, submit your event brief directly below.
              </p>

              <div className="mt-10 space-y-6 border-t border-white/10 pt-8">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Direct Management Email
                  </div>
                  <a
                    href={`mailto:${ARTIST_IDENTITY.email}`}
                    className="mt-1.5 inline-flex items-center gap-2 text-lg font-medium text-white hover:text-cyan-400 transition-colors"
                  >
                    <Mail className="h-4 w-4 text-cyan-400" />
                    {ARTIST_IDENTITY.email}
                  </a>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Location
                  </div>
                  <div className="mt-1.5 inline-flex items-center gap-2 text-sm text-zinc-200">
                    <MapPin className="h-4 w-4 text-cyan-400 shrink-0" />
                    {ARTIST_IDENTITY.location}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Organization
                  </div>
                  <div className="mt-1 text-sm text-zinc-200">
                    {ARTIST_IDENTITY.stageName} · {ARTIST_IDENTITY.role}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={() => setRiderOpen(true)}
                className="inline-flex items-center gap-2.5 border border-white/25 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-white hover:text-black transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileText className="h-4 w-4" />
                View Technical Rider
              </button>
            </div>
          </div>

          {/* Right: Real Booking Form */}
          <div className="lg:col-span-7 border border-white/12 bg-[#0b0b0e] p-8 sm:p-10">
            {submitted ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center border border-cyan-400/50 text-cyan-400">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-3xl font-bold uppercase text-white">
                  Booking Request Sent
                </h3>
                <p className="mt-3 mx-auto max-w-md text-sm leading-relaxed text-zinc-400">
                  Thank you, <span className="text-white">{name}</span>. Your booking inquiry for{' '}
                  <span className="text-white">{cityVenue}</span> has been delivered to GAGA DJ’s management inbox.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setName('');
                    setEmail('');
                    setCityVenue('');
                    setEventDate('');
                    setDetails('');
                  }}
                  className="mt-8 border border-white/25 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-white">
                    Book Now — Event Inquiry
                  </h3>
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="bk-name" className="block text-xs uppercase tracking-[0.14em] text-zinc-400">
                      Your Name / Promoter
                    </label>
                    <input
                      id="bk-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full name"
                      className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="bk-email" className="block text-xs uppercase tracking-[0.14em] text-zinc-400">
                      Email Address
                    </label>
                    <input
                      id="bk-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="bk-type" className="block text-xs uppercase tracking-[0.14em] text-zinc-400">
                      Event Type
                    </label>
                    <select
                      id="bk-type"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="Club Residency / Guest Set">Club Residency / Guest Set</option>
                      <option value="Festival Mainstage">Festival Mainstage</option>
                      <option value="Gaga Events Soroti Production">Gaga Events Soroti Production</option>
                      <option value="Brand Activation / Commercial">Brand Activation / Commercial</option>
                      <option value="Private VIP Celebration">Private VIP Celebration</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="bk-date" className="block text-xs uppercase tracking-[0.14em] text-zinc-400">
                      Event Date
                    </label>
                    <input
                      id="bk-date"
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="bk-venue" className="block text-xs uppercase tracking-[0.14em] text-zinc-400">
                    Venue &amp; City
                  </label>
                  <input
                    id="bk-venue"
                    type="text"
                    required
                    value={cityVenue}
                    onChange={(e) => setCityVenue(e.target.value)}
                    placeholder="e.g. Soroti City, Uganda"
                    className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="bk-notes" className="block text-xs uppercase tracking-[0.14em] text-zinc-400">
                    Event Details &amp; Requirements
                  </label>
                  <textarea
                    id="bk-notes"
                    rows={4}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Share set duration, venue capacity, or production requests..."
                    className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-400 focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-white py-4 text-xs font-semibold uppercase tracking-[0.18em] text-black hover:bg-cyan-400 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Sending Request...' : 'Submit Booking Inquiry'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Technical Rider Modal */}
      {riderOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rider-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-6"
          onClick={() => setRiderOpen(false)}
        >
          <div
            className="w-full max-w-lg border border-white/15 bg-[#0a0a0d] p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-400">
                  Stage &amp; Booth Specifications
                </p>
                <h3
                  id="rider-modal-title"
                  className="mt-1.5 font-display text-3xl font-bold uppercase tracking-tight text-white"
                >
                  GAGA DJ Technical Rider
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRiderOpen(false)}
                aria-label="Close technical rider"
                className="flex h-10 w-10 items-center justify-center border border-white/15 text-zinc-300 hover:border-white hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4 text-sm text-zinc-300">
              <div className="border-b border-white/8 pb-3">
                <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">CDJ Players</div>
                <div className="mt-1 text-white">Minimum 2× Pioneer CDJ-2000NXS2 or CDJ-3000 linked via Pro DJ Link.</div>
              </div>
              <div className="border-b border-white/8 pb-3">
                <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">Mixer</div>
                <div className="mt-1 text-white">1× Pioneer DJM-900NXS2 or DJM-A9 club mixer with clean power isolation.</div>
              </div>
              <div className="border-b border-white/8 pb-3">
                <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">Booth Monitoring</div>
                <div className="mt-1 text-white">Dedicated stereo booth monitor wedges controllable directly from the mixer booth out.</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">Microphone</div>
                <div className="mt-1 text-white">1× Wireless vocal microphone in the booth for live crowd activation.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
