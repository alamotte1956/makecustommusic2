import { useEffect } from "react";

const DEFAULT_TITLE = "Create Christian Music - AI Music Generator & Composer";
const DEFAULT_DESCRIPTION =
  "Create AI-generated music from text descriptions. Compose songs, download MP3s, view sheet music, and build albums instantly.";
const BASE_URL = "https://makecustommusic.com";

interface PageMeta {
  title?: string;
  description?: string;
  /** Path for canonical URL (e.g., "/pricing"). Defaults to current pathname. */
  canonicalPath?: string;
}

/**
 * Sets the document title, meta description, and canonical URL for the current page.
 * Restores defaults on unmount for SPA route changes.
 */
export function usePageMeta({ title, description, canonicalPath }: PageMeta) {
  useEffect(() => {
    const prevTitle = document.title;

    if (title) {
      document.title = `${title} | Create Christian Music`;
    }

    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute("content") ?? null;
    if (description && metaDesc) {
      metaDesc.setAttribute("content", description);
    }

    // Update canonical URL
    const canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const prevCanonical = canonicalLink?.getAttribute("href") ?? null;
    const path = canonicalPath ?? window.location.pathname;
    const canonicalUrl = `${BASE_URL}${path === "/" ? "" : path}`;
    if (canonicalLink) {
      canonicalLink.setAttribute("href", canonicalUrl);
    } else {
      // Create canonical link if it doesn't exist
      const link = document.createElement("link");
      link.rel = "canonical";
      link.href = canonicalUrl;
      document.head.appendChild(link);
    }

    // Also update og:url and twitter:url to match canonical
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const prevOgUrl = ogUrl?.getAttribute("content") ?? null;
    if (ogUrl) {
      ogUrl.setAttribute("content", canonicalUrl);
    }
    const twitterUrl = document.querySelector('meta[name="twitter:url"]');
    const prevTwitterUrl = twitterUrl?.getAttribute("content") ?? null;
    if (twitterUrl) {
      twitterUrl.setAttribute("content", canonicalUrl);
    }

    return () => {
      document.title = prevTitle || DEFAULT_TITLE;
      if (metaDesc && prevDesc !== null) {
        metaDesc.setAttribute("content", prevDesc);
      } else if (metaDesc) {
        metaDesc.setAttribute("content", DEFAULT_DESCRIPTION);
      }
      // Restore canonical
      if (canonicalLink && prevCanonical !== null) {
        canonicalLink.setAttribute("href", prevCanonical);
      } else if (canonicalLink) {
        canonicalLink.setAttribute("href", BASE_URL);
      }
      // Restore og:url and twitter:url
      if (ogUrl && prevOgUrl !== null) {
        ogUrl.setAttribute("content", prevOgUrl);
      }
      if (twitterUrl && prevTwitterUrl !== null) {
        twitterUrl.setAttribute("content", prevTwitterUrl);
      }
    };
  }, [title, description, canonicalPath]);
}
