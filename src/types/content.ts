export type ContentCategory =
  | 'NEWS'
  | 'MUSIC'
  | 'VIDEOS'
  | 'EVENTS'
  | 'ADVERTISEMENTS'
  | 'GALLERY'
  | 'ANNOUNCEMENTS';

export const CONTENT_CATEGORIES: { value: ContentCategory; label: string; description: string }[] = [
  { value: 'NEWS', label: 'News', description: 'Press releases, tour updates & editorial stories' },
  { value: 'MUSIC', label: 'Music', description: 'DJ mixes, live sets & audio uploads' },
  { value: 'VIDEOS', label: 'Videos', description: 'Stage reels, live clips & video uploads' },
  { value: 'EVENTS', label: 'Events', description: 'Upcoming shows, venues & event posters' },
  { value: 'ADVERTISEMENTS', label: 'Advertisements', description: 'Promotions, sponsorships & brand flyers' },
  { value: 'GALLERY', label: 'Gallery', description: 'Official photography & crowd moments' },
  { value: 'ANNOUNCEMENTS', label: 'Announcements', description: 'Pinned notices & urgent alerts' },
];

export interface ContentItem {
  id: string;
  category: ContentCategory;
  title: string;
  subtitle?: string;
  body: string;
  mediaUrl?: string;
  coverImageUrl?: string;
  eventDate?: string;
  venue?: string;
  city?: string;
  ticketStatus?: string;
  bpm?: string;
  genre?: string;
  externalUrl?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BookingInquiry {
  id: string;
  type: 'BOOKING' | 'RSVP';
  name: string;
  email: string;
  eventType?: string;
  eventDate?: string;
  venueCity?: string;
  eventId?: string;
  eventTitle?: string;
  guestCount?: string;
  notes?: string;
  createdAt: string;
}
