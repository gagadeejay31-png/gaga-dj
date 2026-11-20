import {
  ARTIST_IDENTITY,
  PRESS_PHOTO_RED_PROMO,
  PRESS_PHOTO_STAGE_BANNER,
  PRESS_PHOTO_STUDIO_TEAL,
} from '../constants/assets';

const BIO_FACTS = [
  { label: 'Stage Name', value: ARTIST_IDENTITY.stageName },
  { label: 'Real Name', value: ARTIST_IDENTITY.realName },
  { label: 'Date of Birth', value: ARTIST_IDENTITY.dateOfBirth },
  { label: 'Professional Identity', value: ARTIST_IDENTITY.role },
  { label: 'Location', value: ARTIST_IDENTITY.location },
  { label: 'Tagline', value: ARTIST_IDENTITY.tagline },
];

export function AboutSection() {
  return (
    <section id="about" className="relative bg-[#050505] py-24 lg:py-32 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-stretch">
          {/* Left: Official Uploaded Portraits Showcase */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* Main Studio Portrait */}
            <div className="relative overflow-hidden border border-white/12 bg-black aspect-[4/3] sm:aspect-[16/11]">
              <img
                src={PRESS_PHOTO_STUDIO_TEAL}
                alt="Wagaga Ezekiel — GAGA DJ studio portrait"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover object-top"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/85 to-transparent"
              />
              <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-zinc-300">
                <span>{ARTIST_IDENTITY.realName}</span>
                <span className="text-cyan-400">{ARTIST_IDENTITY.stageName}</span>
              </div>
            </div>

            {/* Two Supporting Uploaded Artist Photographs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative overflow-hidden border border-white/12 bg-black aspect-[16/10]">
                <img
                  src={PRESS_PHOTO_STAGE_BANNER}
                  alt="GAGA DJAY MR VIBE holding Pioneer CDJ"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover object-center"
                />
              </div>
              <div className="relative overflow-hidden border border-white/12 bg-black aspect-[16/10]">
                <img
                  src={PRESS_PHOTO_RED_PROMO}
                  alt="GAGA DJAY MR VIBE promotional portrait"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover object-top"
                />
              </div>
            </div>
          </div>

          {/* Right: Official Biography & Profile Facts */}
          <div className="lg:col-span-6 flex flex-col justify-between py-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
                01. About Me
              </p>
              <h2 className="mt-3 font-display text-4xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white [text-wrap:balance]">
                {ARTIST_IDENTITY.stageName}
              </h2>
              <p className="mt-2 font-display text-xl uppercase tracking-[0.2em] text-zinc-400">
                {ARTIST_IDENTITY.tagline}
              </p>

              <div className="mt-7 space-y-5 text-sm sm:text-base leading-relaxed text-zinc-300 max-w-2xl">
                <p>
                  Born on <strong className="font-semibold text-white">{ARTIST_IDENTITY.dateOfBirth}</strong>,{' '}
                  <strong className="font-semibold text-white">{ARTIST_IDENTITY.realName}</strong>—widely known behind the decks as{' '}
                  <strong className="font-semibold text-white">GAGA DJ — MR VIBES</strong>—is a Ugandan DJ, dynamic entertainer, and the Chief Executive Officer of{' '}
                  <strong className="font-semibold text-white">Gaga Events Soroti</strong>.
                </p>
                <p>
                  Representing <strong className="font-semibold text-white">{ARTIST_IDENTITY.location}</strong>, he brings high-energy live performance, crisp Pioneer CDJ craftsmanship, and event production leadership together under one banner: <strong className="font-semibold text-white">THE PARTY ACTIVATORS.</strong>
                </p>
              </div>
            </div>

            {/* Clean Hairline Identity Grid */}
            <div className="mt-10 border-t border-white/12 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {BIO_FACTS.map((fact) => (
                <div key={fact.label} className="border-b border-white/8 pb-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                    {fact.label}
                  </div>
                  <div className="mt-1.5 text-sm font-medium text-zinc-100">
                    {fact.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
