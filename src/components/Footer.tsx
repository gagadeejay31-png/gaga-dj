import { Lock } from 'lucide-react';
import { ARTIST_IDENTITY } from '../constants/assets';

interface FooterProps {
  onOpenAdmin: () => void;
}

const FOOTER_LINKS = [
  { label: 'HOME', href: '#hero' },
  { label: 'ABOUT ME', href: '#about' },
  { label: 'NEWS', href: '#news' },
  { label: 'MUSIC', href: '#music' },
  { label: 'VIDEOS', href: '#videos' },
  { label: 'EVENTS', href: '#events' },
  { label: 'GALLERY', href: '#gallery' },
  { label: 'CONTACT', href: '#contact' },
];

export function Footer({ onOpenAdmin }: FooterProps) {
  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-white/10 bg-black py-12">
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row items-start lg:items-center justify-between gap-8 px-6 lg:px-10">
        <div>
          <div className="font-display text-2xl font-extrabold italic tracking-tight text-white">
            GAGA DJ
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
            {ARTIST_IDENTITY.stageName} · {ARTIST_IDENTITY.tagline}
          </p>
          <p className="mt-1 text-xs text-zinc-600">{ARTIST_IDENTITY.location}</p>
        </div>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap items-center gap-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400"
        >
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                scrollTo(link.href);
              }}
              className="hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-5 text-xs text-zinc-500">
          <span>© 2026 {ARTIST_IDENTITY.realName} (GAGA DJ)</span>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex items-center gap-1.5 border border-white/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 hover:border-cyan-400 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <Lock className="h-3 w-3" />
            Admin
          </button>
        </div>
      </div>
    </footer>
  );
}
