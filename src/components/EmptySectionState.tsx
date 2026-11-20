interface EmptySectionStateProps {
  sectionLabel: string;
  headline?: string;
  subline?: string;
  previewImageUrl?: string;
  previewImageAlt?: string;
}

export function EmptySectionState({
  sectionLabel,
  headline = 'NEW CONTENT COMING SOON',
  subline = 'STAY TUNED FOR UPDATES',
  previewImageUrl,
  previewImageAlt,
}: EmptySectionStateProps) {
  return (
    <div className="mt-10 border border-white/12 bg-zinc-950/70 overflow-hidden">
      <div className={`grid grid-cols-1 ${previewImageUrl ? 'lg:grid-cols-12' : ''} items-center`}>
        {previewImageUrl && (
          <div className="lg:col-span-5 relative aspect-[16/10] lg:aspect-auto lg:h-full min-h-[240px] bg-black overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
            <img
              src={previewImageUrl}
              alt={previewImageAlt ?? 'GAGA DJ official press visual'}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover object-center opacity-85"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20"
            />
          </div>
        )}

        <div className={`${previewImageUrl ? 'lg:col-span-7' : ''} p-10 sm:p-14 text-center lg:text-left`}>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">
            {sectionLabel}
          </p>
          <h3 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-white">
            {headline}
          </h3>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
            {subline}
          </p>
        </div>
      </div>
    </div>
  );
}
