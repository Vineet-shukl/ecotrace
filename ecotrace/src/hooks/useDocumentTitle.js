// src/hooks/useDocumentTitle.js
import { useEffect } from 'react';

const SITE_NAME = 'EcoTrace';

/**
 * Sets the document <title> (and optionally the meta description) for the
 * current route, restoring the previous values when the component unmounts.
 * Dependency-free and reusable across every page.
 *
 * @param {string}  title         page title, suffixed with the site name
 * @param {string} [description]  optional meta description for this route
 */
export function useDocumentTitle(title, description) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME;

    const metaEl = description
      ? document.querySelector('meta[name="description"]')
      : null;
    const prevDescription = metaEl?.getAttribute('content');
    if (metaEl) metaEl.setAttribute('content', description);

    return () => {
      document.title = prevTitle;
      if (metaEl && prevDescription != null) {
        metaEl.setAttribute('content', prevDescription);
      }
    };
  }, [title, description]);
}
