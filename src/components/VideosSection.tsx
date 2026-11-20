import { ArrowUpRight, Play, X } from 'lucide-react';
import { useState } from 'react';
import { ContentItem } from '../types/content';
import { EmptySectionState } from './EmptySectionState';

interface VideosSectionProps {
  videos: ContentItem[];
}

export function VideosSection({ videos }: VideosSectionProps) {
  const [activeVideo, setActiveVideo] = useState<ContentItem | null>(null);

  return (
    <section id="videos" className="relative bg-[#070709] py-24 lg:py-32 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-white/10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
              04. Stage Visuals &amp; Video Cuts
            </p>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white [text-wrap:balance]">
              Videos
            </h2>
          </div>
          <p className="max-w-sm text-sm text-zinc-400">
            Live performance reels, stage recordings, and official video uploads.
          </p>
        </div>

        {videos.length === 0 ? (
          <EmptySectionState
            sectionLabel="Videos · Stage Showreels"
            headline="NEW CONTENT COMING SOON"
            subline="STAY TUNED FOR UPDATES"
          />
        ) : (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((vid) => (
              <div
                key={vid.id}
                className="group border border-white/12 bg-black overflow-hidden flex flex-col justify-between"
              >
                <div className="relative aspect-video bg-zinc-950 overflow-hidden">
                  {vid.coverImageUrl ? (
                    <img
                      src={vid.coverImageUrl}
                      alt={vid.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : vid.mediaUrl ? (
                    <video
                      src={vid.mediaUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-black/40 group-hover:bg-black/25 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveVideo(vid)}
                    aria-label={`Play ${vid.title}`}
                    className="absolute inset-0 flex items-center justify-center cursor-pointer"
                  >
                    <span className="flex h-14 w-14 items-center justify-center border border-white/40 bg-black/75 text-white group-hover:bg-white group-hover:text-black transition-colors">
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    </span>
                  </button>
                </div>

                <div className="p-6">
                  <div className="text-xs uppercase tracking-[0.16em] text-cyan-400">
                    {vid.subtitle || 'Official Video'} · {new Date(vid.createdAt).toLocaleDateString()}
                  </div>
                  <h3 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-white">
                    {vid.title}
                  </h3>
                  {vid.body && <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{vid.body}</p>}
                  {vid.externalUrl && !vid.mediaUrl && (
                    <a
                      href={vid.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:text-cyan-400"
                    >
                      Watch External Link <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video Lightbox Modal */}
      {activeVideo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="video-lightbox-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md p-4 sm:p-8"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="w-full max-w-4xl border border-white/15 bg-[#08080b]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h3
                id="video-lightbox-title"
                className="font-display text-2xl font-bold uppercase tracking-tight text-white"
              >
                {activeVideo.title}
              </h3>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                aria-label="Close video player"
                className="flex h-10 w-10 items-center justify-center border border-white/20 text-white hover:bg-white hover:text-black cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-black">
              {activeVideo.mediaUrl ? (
                <video
                  src={activeVideo.mediaUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full max-h-[70vh] mx-auto"
                />
              ) : activeVideo.externalUrl ? (
                <div className="p-12 text-center">
                  <p className="text-sm text-zinc-400 mb-4">This video is hosted externally.</p>
                  <a
                    href={activeVideo.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-black hover:bg-cyan-400"
                  >
                    Open Video Link <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              ) : null}
            </div>

            {activeVideo.body && (
              <div className="p-6 text-sm text-zinc-300 border-t border-white/10">{activeVideo.body}</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
