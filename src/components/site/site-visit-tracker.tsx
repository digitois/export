'use client';

import { useEffect } from 'react';

export function SiteVisitTracker({ siteId }: { siteId: string }) {
  useEffect(() => {
    try {
      fetch('/api/site/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: siteId,
          path: window.location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent
        })
      }).catch(() => {});
    } catch {
      // ignore
    }
  }, [siteId]);

  return null;
}