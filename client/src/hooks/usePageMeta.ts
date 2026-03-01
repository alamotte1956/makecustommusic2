import { useEffect } from "react";

const DEFAULT_TITLE = "Make Custom Music - AI Music Generator & Composer";
const DEFAULT_DESCRIPTION =
  "Create AI-generated music from text descriptions. Compose songs, download MP3s, view sheet music, and build albums instantly.";

interface PageMeta {
  title?: string;
  description?: string;
}

/**
 * Sets the document title and meta description for the current page.
 * Restores defaults on unmount for SPA route changes.
 */
export function usePageMeta({ title, description }: PageMeta) {
  useEffect(() => {
    const prevTitle = document.title;

    if (title) {
      document.title = `${title} | Make Custom Music`;
    }

    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute("content") ?? null;
    if (description && metaDesc) {
      metaDesc.setAttribute("content", description);
    }

    return () => {
      document.title = prevTitle || DEFAULT_TITLE;
      if (metaDesc && prevDesc !== null) {
        metaDesc.setAttribute("content", prevDesc);
      } else if (metaDesc) {
        metaDesc.setAttribute("content", DEFAULT_DESCRIPTION);
      }
    };
  }, [title, description]);
}
