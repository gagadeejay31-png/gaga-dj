/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { AboutSection } from './components/AboutSection';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { ContactSection } from './components/ContactSection';
import { EventsSection } from './components/EventsSection';
import { Footer } from './components/Footer';
import { GallerySection } from './components/GallerySection';
import { Hero } from './components/Hero';
import { MusicSection } from './components/MusicSection';
import { Navbar } from './components/Navbar';
import { NewsSection } from './components/NewsSection';
import { VideosSection } from './components/VideosSection';
import { fetchPublishedContent } from './lib/supabaseClient';
import { ContentItem } from './types/content';

export default function App() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [adminOpen, setAdminOpen] = useState(false);

  const loadPublicContent = useCallback(async () => {
    try {
      const items = await fetchPublishedContent();
      setContentItems(items);
    } catch {
      // keep current state on network hiccup
    }
  }, []);

  useEffect(() => {
    void loadPublicContent();
  }, [loadPublicContent]);

  useEffect(() => {
    if (window.location.hash === '#admin') {
      setAdminOpen(true);
    }
    const onHashChange = () => {
      if (window.location.hash === '#admin') {
        setAdminOpen(true);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setAdminOpen(true);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const newsItems = contentItems.filter((i) => i.category === 'NEWS');
  const announcements = contentItems.filter((i) => i.category === 'ANNOUNCEMENTS');
  const advertisements = contentItems.filter((i) => i.category === 'ADVERTISEMENTS');
  const mixes = contentItems.filter((i) => i.category === 'MUSIC');
  const videos = contentItems.filter((i) => i.category === 'VIDEOS');
  const events = contentItems.filter((i) => i.category === 'EVENTS');
  const galleryPhotos = contentItems.filter((i) => i.category === 'GALLERY');

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <Navbar />
      <main>
        <Hero />
        <AboutSection />
        <NewsSection
          newsItems={newsItems}
          announcements={announcements}
          advertisements={advertisements}
        />
        <MusicSection mixes={mixes} />
        <VideosSection videos={videos} />
        <EventsSection events={events} />
        <GallerySection photos={galleryPhotos} />
        <ContactSection />
      </main>
      <Footer onOpenAdmin={() => setAdminOpen(true)} />
      <AdminDashboardModal
        open={adminOpen}
        onClose={() => {
          setAdminOpen(false);
          if (window.location.hash === '#admin') {
            history.replaceState(null, '', window.location.pathname);
          }
        }}
        onContentChanged={() => void loadPublicContent()}
      />
    </div>
  );
}
