import { ArrowUpRight, Megaphone, X } from 'lucide-react';
import { useState } from 'react';
import { PRESS_PHOTO_RED_PROMO } from '../constants/assets';
import { ContentItem } from '../types/content';
import { EmptySectionState } from './EmptySectionState';

interface NewsSectionProps {
  newsItems: ContentItem[];
  announcements: ContentItem[];
  advertisements: ContentItem[];
}

export function NewsSection({ newsItems, announcements, advertisements }: NewsSectionProps) {
  const [activeItem, setActiveItem] = useState<ContentItem | null>(null);
  const hasAny = newsItems.length > 0 || announcements.length > 0 || advertisements.length > 0;

  return (
    <section id="news" className="relative bg-[#070709] py-24 lg:py-32 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-white/10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
              02. News, Announcements &amp; Promotions
            </p>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white [text-wrap:balance]">
              Press Desk &amp; Updates
            </h2>
          </div>
          <p className="max-w-sm text-sm text-zinc-400">
            Official press dispatches, announcements, and brand advertisements published by GAGA DJ.
          </p>
        </div>

        {/* Pinned Announcements */}
        {announcements.length > 0 && (
          <div className="mt-8 space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-cyan-400/30 bg-cyan-950/15 px-6 py-4"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <Megaphone className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400 mr-2">
                      Announcement
                    </span>
                    <span className="text-sm font-medium text-white">{ann.title}</span>
                    {ann.body && <p className="text-xs text-zinc-300 mt-0.5">{ann.body}</p>}
                  </div>
                </div>
                {ann.mediaUrl && (
                  <button
                    type="button"
                    onClick={() => setActiveItem(ann)}
                    className="text-xs font-semibold uppercase tracking-[0.16em] text-white hover:text-cyan-400 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    View Notice
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State if zero published News / Announcements / Ads */}
        {!hasAny && (
          <EmptySectionState
            sectionLabel="News · Announcements · Advertisements"
            headline="NEW CONTENT COMING SOON"
            subline="STAY TUNED FOR UPDATES"
            previewImageUrl={PRESS_PHOTO_RED_PROMO}
            previewImageAlt="GAGA DJ — MR VIBES official promotional portrait"
          />
        )}

        {/* Published News Articles */}
        {newsItems.length > 0 && (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            {newsItems.map((item) => (
              <article
                key={item.id}
                className="group flex flex-col justify-between border border-white/12 bg-zinc-950/80 hover:border-white/30 transition-colors overflow-hidden"
              >
                <div>
                  {(item.coverImageUrl || item.mediaUrl) && (
                    <div className="aspect-[16/10] w-full overflow-hidden bg-black border-b border-white/10">
                      <img
                        src={item.coverImageUrl || item.mediaUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-7">
                    <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                      <span className="text-cyan-400">News</span>
                      <span aria-hidden="true" className="mx-2">·</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="mt-3 font-display text-2xl sm:text-3xl font-bold uppercase leading-[1.05] tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                      {item.title}
                    </h3>
                    {item.subtitle && (
                      <p className="mt-2 text-xs uppercase tracking-[0.12em] text-zinc-400">
                        {item.subtitle}
                      </p>
                    )}
                    <p className="mt-4 text-sm leading-relaxed text-zinc-400 line-clamp-3">
                      {item.body}
                    </p>
                  </div>
                </div>

                <div className="px-7 pb-7 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">Official Dispatch</span>
                  <button
                    type="button"
                    onClick={() => setActiveItem(item)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:text-cyan-400 transition-colors cursor-pointer"
                  >
                    Read More
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Published Advertisements */}
        {advertisements.length > 0 && (
          <div className="mt-14 pt-10 border-t border-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400 mb-6">
              Featured Advertisements &amp; Promotions
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {advertisements.map((ad) => (
                <div
                  key={ad.id}
                  className="border border-white/15 bg-black overflow-hidden flex flex-col sm:flex-row"
                >
                  {(ad.coverImageUrl || ad.mediaUrl) && (
                    <div className="sm:w-2/5 aspect-[4/3] sm:aspect-auto bg-zinc-950 overflow-hidden shrink-0">
                      <img
                        src={ad.coverImageUrl || ad.mediaUrl}
                        alt={ad.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-amber-400">
                        {ad.subtitle || 'Sponsored Promotion'}
                      </div>
                      <h3 className="mt-2 font-display text-2xl font-bold uppercase text-white">
                        {ad.title}
                      </h3>
                      <p className="mt-2 text-sm text-zinc-400 line-clamp-3">{ad.body}</p>
                    </div>
                    <div className="mt-5 flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setActiveItem(ad)}
                        className="text-xs font-semibold uppercase tracking-[0.16em] text-white hover:text-cyan-400 cursor-pointer"
                      >
                        View Flyer
                      </button>
                      {ad.externalUrl && (
                        <a
                          href={ad.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400 hover:text-white"
                        >
                          Learn More <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Article / Flyer Reader Modal */}
      {activeItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="news-reader-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 backdrop-blur-sm p-6"
          onClick={() => setActiveItem(null)}
        >
          <div
            className="w-full max-w-2xl border border-white/15 bg-[#0a0a0d] p-8 sm:p-10 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-cyan-400">
                  {activeItem.category} · {new Date(activeItem.createdAt).toLocaleDateString()}
                </div>
                <h3
                  id="news-reader-title"
                  className="mt-2 font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white"
                >
                  {activeItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                aria-label="Close reader"
                className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/15 text-zinc-300 hover:border-white hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {(activeItem.coverImageUrl || activeItem.mediaUrl) && (
              <div className="mt-6 overflow-hidden border border-white/10 bg-black">
                <img
                  src={activeItem.coverImageUrl || activeItem.mediaUrl}
                  alt={activeItem.title}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-[420px] object-contain mx-auto"
                />
              </div>
            )}

            <div className="mt-6 whitespace-pre-line text-sm sm:text-base leading-relaxed text-zinc-300">
              {activeItem.body}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
