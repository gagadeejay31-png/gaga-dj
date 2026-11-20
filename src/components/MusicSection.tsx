import { ArrowUpRight, Pause, Play, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ContentItem } from '../types/content';
import { EmptySectionState } from './EmptySectionState';

interface MusicSectionProps {
  mixes: ContentItem[];
}

export function MusicSection({ mixes }: MusicSectionProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeMixId, setActiveMixId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);

  const activeMix = mixes.find((m) => m.id === activeMixId) ?? mixes[0] ?? null;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleTogglePlay = (mix: ContentItem) => {
    const audio = audioRef.current;
    if (!mix.mediaUrl) {
      if (mix.externalUrl) {
        window.open(mix.externalUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    if (activeMixId === mix.id && isPlaying && audio) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    if (activeMixId !== mix.id) {
      setActiveMixId(mix.id);
      setCurrentTime(0);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }
      }, 30);
    } else if (audio) {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec) || sec <= 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <section id="music" className="relative bg-[#050505] py-24 lg:py-32 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-white/10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
              03. DJ Mixes &amp; Audio Sets
            </p>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white [text-wrap:balance]">
              Music &amp; Live Mixes
            </h2>
          </div>
          <p className="max-w-sm text-sm text-zinc-400">
            Stream official mixes and club recordings uploaded directly by GAGA DJ.
          </p>
        </div>

        {mixes.length === 0 ? (
          <EmptySectionState
            sectionLabel="Music · DJ Mixes"
            headline="NEW CONTENT COMING SOON"
            subline="STAY TUNED FOR UPDATES"
          />
        ) : (
          <>
            {/* Real HTML5 Audio Element */}
            <audio
              ref={audioRef}
              src={activeMix?.mediaUrl}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setIsPlaying(false)}
            />

            {/* Active Audio Deck */}
            {activeMix && activeMix.mediaUrl && (
              <div className="mt-10 border border-white/12 bg-[#0b0b0e] p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-5 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleTogglePlay(activeMix)}
                      aria-label={isPlaying ? `Pause ${activeMix.title}` : `Play ${activeMix.title}`}
                      className="flex h-14 w-14 shrink-0 items-center justify-center bg-white text-black hover:bg-cyan-400 transition-colors cursor-pointer"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5 fill-current" />
                      ) : (
                        <Play className="h-5 w-5 fill-current ml-0.5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-[0.16em] text-cyan-400">
                        {activeMix.genre || 'DJ Mix'}
                        {activeMix.bpm ? ` · ${activeMix.bpm} BPM` : ''}
                      </div>
                      <h3 className="mt-1 truncate font-display text-2xl sm:text-3xl font-bold uppercase text-white">
                        {activeMix.title}
                      </h3>
                      {activeMix.subtitle && (
                        <p className="truncate text-xs text-zinc-400">{activeMix.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-5 flex flex-col gap-2">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCurrentTime(val);
                        if (audioRef.current) audioRef.current.currentTime = val;
                      }}
                      aria-label="Seek mix playback"
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <div className="flex justify-between font-mono-tabular text-xs text-zinc-400">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <div className="lg:col-span-2 flex items-center justify-end gap-2 text-zinc-400">
                    <Volume2 className="h-4 w-4 shrink-0" />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      aria-label="Audio volume"
                      className="w-24 accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Mixes List */}
            <div className="mt-10 divide-y divide-white/10 border-t border-b border-white/10">
              {mixes.map((mix, index) => {
                const playingThis = isPlaying && activeMix?.id === mix.id;
                return (
                  <div
                    key={mix.id}
                    className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 py-6 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="md:col-span-1 font-mono-tabular text-sm text-zinc-500 pl-2">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div className="md:col-span-6 flex items-center gap-4">
                      {mix.coverImageUrl && (
                        <img
                          src={mix.coverImageUrl}
                          alt={mix.title}
                          referrerPolicy="no-referrer"
                          className="h-14 w-14 object-cover border border-white/10 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="font-display text-2xl font-bold uppercase tracking-tight text-white">
                          {mix.title}
                        </div>
                        {mix.body && <p className="mt-0.5 text-xs text-zinc-400 line-clamp-1">{mix.body}</p>}
                      </div>
                    </div>

                    <div className="md:col-span-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      {mix.genre && <span className="text-zinc-200">{mix.genre}</span>}
                      {mix.genre && mix.bpm && <span aria-hidden="true">·</span>}
                      {mix.bpm && <span className="font-mono-tabular">{mix.bpm} BPM</span>}
                    </div>

                    <div className="md:col-span-2 flex items-center md:justify-end gap-2 pr-2">
                      {mix.mediaUrl ? (
                        <button
                          type="button"
                          onClick={() => handleTogglePlay(mix)}
                          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            playingThis
                              ? 'bg-cyan-400 text-black'
                              : 'border border-white/25 text-white hover:bg-white hover:text-black'
                          }`}
                        >
                          {playingThis ? (
                            <>
                              <Pause className="h-3.5 w-3.5 fill-current" /> Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5 fill-current" /> Play
                            </>
                          )}
                        </button>
                      ) : mix.externalUrl ? (
                        <a
                          href={mix.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-white hover:text-black transition-colors whitespace-nowrap shrink-0"
                        >
                          Listen <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
