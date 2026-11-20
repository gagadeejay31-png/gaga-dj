import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { label: 'HOME', href: '#hero' },
  { label: 'ABOUT ME', href: '#about' },
  { label: 'NEWS', href: '#news' },
  { label: 'MUSIC', href: '#music' },
  { label: 'VIDEOS', href: '#videos' },
  { label: 'EVENTS', href: '#events' },
  { label: 'GALLERY', href: '#gallery' },
  { label: 'CONTACT', href: '#contact' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${
        scrolled ? 'bg-black/92 backdrop-blur-md border-b border-white/10' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 lg:px-8">
        {/* Brand Wordmark */}
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('#hero');
          }}
          className="font-display text-2xl font-extrabold italic tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
        >
          GAGA DJ
        </a>

        {/* Minimal Horizontal Navigation */}
        <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-4 xl:gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(link.href);
              }}
              className="relative py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-300 hover:text-white transition-colors duration-150 whitespace-nowrap shrink-0 after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-cyan-400 after:transition-all after:duration-200 hover:after:w-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Primary Action: BOOK NOW */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick('#contact');
            }}
            className="hidden sm:inline-flex items-center justify-center border border-white/25 bg-white text-black px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] hover:bg-cyan-400 hover:border-cyan-400 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            BOOK NOW
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex lg:hidden items-center justify-center w-11 h-11 text-white border border-white/15 bg-black/60 hover:border-white/35 transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/10 bg-black/98 px-6 py-6 max-h-[85vh] overflow-y-auto">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                className="py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-200 hover:text-cyan-400 border-b border-white/8"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('#contact');
              }}
              className="mt-2 inline-flex items-center justify-center bg-white text-black px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em]"
            >
              BOOK NOW
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
