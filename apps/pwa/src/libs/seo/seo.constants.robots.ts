import type { Metadata } from 'next';

// Shared noindex/nofollow directive — the app is private and must stay out of
// search engines. Applied in the root layout (landing), the login page and the
// dashboard layout, and mirrored by /robots.txt (see src/app/robots.ts).
export const noIndexRobots: Metadata['robots'] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};
