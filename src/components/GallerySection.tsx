import { X } from 'lucide-react';
import { useState } from 'react';
import { ContentItem } from '../types/content';
import { EmptySectionState } from './EmptySectionState';

interface GallerySectionProps {
  photos: ContentItem[];
}

export function GallerySection({ photos }: GallerySectionProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<ContentItem | null>(null);

  return (
    <section id="gallery" className="relative bg-[#070709] py-24 lg:py-32 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-white/10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
              06. Photography Archive
            </p>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white [text-wrap:balance]">
              Gallery
            </h2>
          </div>
          <p className="max-w-sm text-sm text-zinc-400">
            Live stage moments, crowd photography, and visual captures published from the booth.
          </p>
        </div>

        {photos.length === 0 ? (
          <EmptySectionState
            sectionLabel="Gallery · Official Photography"
            headline="NEW CONTENT COMING SOON"
            subline="STAY TUNED FOR UPDATES"
          />
        ) : (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo) => {
              const imgSrc = photo.mediaUrl || photo.coverImageUrl;
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setSelectedPhoto(photo)}
                  className="group relative overflow-hidden border border-white/12 bg-black aspect-[4/3] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                >
                  {imgSrc && (
                    <img
                      src={imgSrc}
                      alt={photo.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  )}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"
                  />
                  <div className="absolute bottom-4 left-5 right-5">
                    <div className="font-display text-xl font-bold uppercase text-white">
                      {photo.title}
                    </div>
                    {photo.subtitle && (
                      <div className="text-xs uppercase tracking-[0.14em] text-zinc-400 mt-0.5">
                        {photo.subtitle}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gallery-lightbox-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md p-6"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="w-full max-w-4xl border border-white/15 bg-[#08080b]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h3 id="gallery-lightbox-title" className="font-display text-2xl font-bold uppercase text-white">
                {selectedPhoto.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                aria-label="Close photograph"
                className="flex h-10 w-10 items-center justify-center border border-white/20 text-white hover:bg-white hover:text-black cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {(selectedPhoto.mediaUrl || selectedPhoto.coverImageUrl) && (
              <div className="bg-black p-4">
                <img
                  src={selectedPhoto.mediaUrl || selectedPhoto.coverImageUrl}
                  alt={selectedPhoto.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[75vh] mx-auto object-contain"
                />
              </div>
            )}
            {selectedPhoto.body && (
              <div className="px-6 py-4 text-sm text-zinc-300 border-t border-white/10">
                {selectedPhoto.body}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
