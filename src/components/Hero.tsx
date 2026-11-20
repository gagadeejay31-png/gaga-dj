import { ArrowUpRight } from 'lucide-react';
import { ARTIST_IDENTITY, HERO_DJ_PHOTO } from '../constants/assets';

export function Hero() {
  const scrollToSection = (id: string) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen w-full overflow-hidden bg-black pt-16 flex flex-col justify-between"
    >
      {/* Atmospheric Stage Backdrop matching the FWRD / The Lab composition */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Subtle cool cyan volumetric stage wash on left */}
        <div
          className="absolute -left-24 -top-12 h-[78%] w-[55%] opacity-35 blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse at 35% 35%, rgba(56, 189, 248, 0.22) 0%, rgba(14, 116, 144, 0.08) 45%, transparent 72%)',
          }}
        />

        {/* Warm bronze/amber vertical stage bars behind oversized headline */}
        <div
          className="absolute right-[6%] top-[14%] h-[58%] w-[36%] opacity-30"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(217, 119, 6, 0.22) 0px, rgba(217, 119, 6, 0.22) 2px, transparent 2px, transparent 26px)',
            maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 35%, transparent 75%)',
          }}
        />

        {/* Subtle horizontal stage light line */}
        <div
          className="absolute left-0 right-0 top-[66%] h-px opacity-35"
          style={{
            background:
              'linear-gradient(90deg, transparent 5%, rgba(34, 211, 238, 0.45) 36%, rgba(255, 255, 255, 0.5) 52%, rgba(34, 211, 238, 0.3) 75%, transparent 96%)',
          }}
        />
      </div>

      {/* Main Hero Composition */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 lg:px-10 py-8 lg:py-0">
        <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Center-Left Visual Anchor: Original Unmodified Photograph on Black */}
          <div className="relative order-2 lg:order-1 lg:col-span-7 flex items-end justify-center lg:justify-start">
            <div className="relative w-full max-w-[520px] lg:max-w-[580px] lg:ml-4 bg-black">
              <img
                src={HERO_DJ_PHOTO}
                alt="GAGA DJ — MR VIBES holding a Pioneer CDJ"
                referrerPolicy="no-referrer"
                className="relative z-10 mx-auto w-full h-auto max-h-[600px] lg:max-h-[680px] object-contain object-bottom block"
              />
              {/* Seamless radial/edge blend into #000000 black background */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-20"
                style={{
                  background:
                    'linear-gradient(to top, #000000 0%, rgba(0,0,0,0.65) 12%, transparent 32%), linear-gradient(to right, #000000 0%, transparent 10%, transparent 88%, #000000 100%)',
                }}
              />
            </div>
          </div>

          {/* Right Editorial Title Lockup */}
          <div className="relative z-30 order-1 lg:order-2 lg:col-span-5 lg:-ml-10 flex flex-col items-start text-left">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.26em] text-cyan-400">
              Official Sound &amp; Stage
            </p>

            <h1 className="font-display uppercase text-white select-none">
              <span className="block text-[4.5rem] sm:text-[6rem] lg:text-[7.25rem] font-extrabold leading-[0.84] tracking-[-0.02em]">
                GAGA DJ/
              </span>
              <span className="block text-[3.85rem] sm:text-[5.25rem] lg:text-[6.1rem] font-extralight leading-[0.9] tracking-[0.04em] text-zinc-100">
                MR VIBES
              </span>
            </h1>

            <p className="mt-4 font-display text-xl sm:text-2xl font-semibold uppercase tracking-[0.22em] text-zinc-200">
              {ARTIST_IDENTITY.tagline}
            </p>

            <p className="mt-5 max-w-md text-sm sm:text-base leading-relaxed text-zinc-400">
              {ARTIST_IDENTITY.realName} — {ARTIST_IDENTITY.role}. Based in {ARTIST_IDENTITY.location}.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => scrollToSection('#music')}
                className="inline-flex items-center gap-2.5 bg-white px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-black hover:bg-cyan-400 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
              >
                Explore Music
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('#about')}
                className="inline-flex items-center gap-2 border border-white/25 px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-200 hover:border-white hover:text-white transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
              >
                About Me
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Identity Strip (Zero Fake Metrics) */}
      <div className="relative z-20 border-t border-white/10 bg-black/95">
        <div className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-white/10 px-6 lg:px-10">
          <div className="py-5 lg:pr-6">
            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Stage Name</div>
            <div className="mt-1 font-display text-lg font-bold uppercase tracking-wide text-white">
              {ARTIST_IDENTITY.stageName}
            </div>
          </div>
          <div className="py-5 lg:px-6">
            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Real Name</div>
            <div className="mt-1 font-display text-lg font-bold uppercase tracking-wide text-white">
              {ARTIST_IDENTITY.realName}
            </div>
          </div>
          <div className="py-5 lg:px-6">
            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Leadership</div>
            <div className="mt-1 font-display text-lg font-bold uppercase tracking-wide text-white">
              CEO · Gaga Events Soroti
            </div>
          </div>
          <div className="py-5 lg:pl-6">
            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Base</div>
            <div className="mt-1 font-display text-lg font-bold uppercase tracking-wide text-white">
              Soroti City, Uganda
            </div>
          </div>
        </div>
      </div>

      {/* Editorial Marquee Divider */}
      <div className="relative z-20 overflow-hidden border-y border-white/10 bg-zinc-950 py-3">
        <div className="animate-marquee">
          {[0, 1].map((dup) => (
            <div
              key={dup}
              className="flex items-center gap-8 pr-8 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400 whitespace-nowrap"
            >
              <span>GAGA DJ</span>
              <span className="text-cyan-400" aria-hidden="true">/</span>
              <span>MR VIBES</span>
              <span className="text-cyan-400" aria-hidden="true">/</span>
              <span>THE PARTY ACTIVATORS.</span>
              <span className="text-cyan-400" aria-hidden="true">/</span>
              <span>GAGA EVENTS SOROTI</span>
              <span className="text-cyan-400" aria-hidden="true">/</span>
              <span>SOROTI CITY WEST, UGANDA</span>
              <span className="text-cyan-400" aria-hidden="true">/</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
