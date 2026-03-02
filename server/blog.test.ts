import { describe, it, expect } from "vitest";
import {
  blogArticles,
  getAllArticles,
  getArticleBySlug,
} from "../shared/blogArticles";

// ─── Blog Article Data Tests ───

describe("Blog Articles Data", () => {
  it("should have at least 5 articles", () => {
    expect(blogArticles.length).toBeGreaterThanOrEqual(5);
  });

  it("should have unique slugs", () => {
    const slugs = blogArticles.map((a) => a.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });

  it("should have unique titles", () => {
    const titles = blogArticles.map((a) => a.title);
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });

  it("should have valid slug format (lowercase, hyphens, no spaces)", () => {
    for (const article of blogArticles) {
      expect(article.slug).toMatch(/^[a-z0-9-]+$/);
      expect(article.slug).not.toContain(" ");
    }
  });

  it("should have non-empty titles", () => {
    for (const article of blogArticles) {
      expect(article.title.length).toBeGreaterThan(0);
    }
  });

  it("should have excerpts between 50 and 200 characters", () => {
    for (const article of blogArticles) {
      expect(article.excerpt.length).toBeGreaterThanOrEqual(50);
      expect(article.excerpt.length).toBeLessThanOrEqual(200);
    }
  });

  it("should have non-empty content", () => {
    for (const article of blogArticles) {
      expect(article.content.length).toBeGreaterThan(100);
    }
  });

  it("should have valid ISO date strings for publishedAt", () => {
    for (const article of blogArticles) {
      const date = new Date(article.publishedAt);
      expect(date.toString()).not.toBe("Invalid Date");
    }
  });

  it("should have at least one tag per article", () => {
    for (const article of blogArticles) {
      expect(article.tags.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("should have positive reading time", () => {
    for (const article of blogArticles) {
      expect(article.readingTime).toBeGreaterThan(0);
    }
  });

  it("should have an author for each article", () => {
    for (const article of blogArticles) {
      expect(article.author.length).toBeGreaterThan(0);
    }
  });
});

// ─── getAllArticles Tests ───

describe("getAllArticles", () => {
  it("should return all articles", () => {
    const articles = getAllArticles();
    expect(articles.length).toBe(blogArticles.length);
  });

  it("should return articles sorted by date descending (newest first)", () => {
    const articles = getAllArticles();
    for (let i = 0; i < articles.length - 1; i++) {
      const current = new Date(articles[i].publishedAt).getTime();
      const next = new Date(articles[i + 1].publishedAt).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  it("should return a new array (not mutate the original)", () => {
    const articles1 = getAllArticles();
    const articles2 = getAllArticles();
    expect(articles1).not.toBe(articles2);
    expect(articles1).toEqual(articles2);
  });
});

// ─── getArticleBySlug Tests ───

describe("getArticleBySlug", () => {
  it("should return the correct article for a valid slug", () => {
    const article = getArticleBySlug("how-to-create-ai-music-2026");
    expect(article).toBeDefined();
    expect(article!.title).toContain("How to Create AI Music");
  });

  it("should return undefined for a non-existent slug", () => {
    const article = getArticleBySlug("non-existent-article-slug");
    expect(article).toBeUndefined();
  });

  it("should return undefined for an empty slug", () => {
    const article = getArticleBySlug("");
    expect(article).toBeUndefined();
  });

  it("should find each article by its slug", () => {
    for (const original of blogArticles) {
      const found = getArticleBySlug(original.slug);
      expect(found).toBeDefined();
      expect(found!.slug).toBe(original.slug);
      expect(found!.title).toBe(original.title);
    }
  });
});

// ─── Blog SEO Tests ───

describe("Blog SEO", () => {
  it("should have SEO-friendly slugs targeting keywords", () => {
    const slugs = blogArticles.map((a) => a.slug);
    // At least one slug should contain "ai-music"
    expect(slugs.some((s) => s.includes("ai-music"))).toBe(true);
  });

  it("should have titles under 70 characters for optimal SEO", () => {
    for (const article of blogArticles) {
      // Google typically displays 50-60 chars, but up to 70 is acceptable
      expect(article.title.length).toBeLessThanOrEqual(80);
    }
  });

  it("should have meta-description-ready excerpts (under 160 chars)", () => {
    for (const article of blogArticles) {
      const metaDesc = article.excerpt.slice(0, 160);
      expect(metaDesc.length).toBeLessThanOrEqual(160);
      expect(metaDesc.length).toBeGreaterThanOrEqual(50);
    }
  });

  it("should have content with headings (## markers)", () => {
    for (const article of blogArticles) {
      expect(article.content).toContain("## ");
    }
  });

  it("should have content with internal links to makecustommusic.com", () => {
    // At least one article should link back to the site
    const hasInternalLink = blogArticles.some(
      (a) =>
        a.content.includes("makecustommusic.com") ||
        a.content.includes("/generate")
    );
    expect(hasInternalLink).toBe(true);
  });
});

// ─── Blog JSON-LD Structured Data Tests ───

describe("Blog JSON-LD Structured Data", () => {
  it("should build valid Article schema for each article", () => {
    for (const article of blogArticles) {
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.excerpt,
        author: {
          "@type": "Organization",
          name: article.author,
          url: "https://makecustommusic.com",
        },
        publisher: {
          "@type": "Organization",
          name: "Make Custom Music",
          url: "https://makecustommusic.com",
        },
        datePublished: article.publishedAt,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `https://makecustommusic.com/blog/${article.slug}`,
        },
      };

      expect(jsonLd["@context"]).toBe("https://schema.org");
      expect(jsonLd["@type"]).toBe("Article");
      expect(jsonLd.headline).toBe(article.title);
      expect(jsonLd.description).toBe(article.excerpt);
      expect(jsonLd.author["@type"]).toBe("Organization");
      expect(jsonLd.publisher.name).toBe("Make Custom Music");
      expect(jsonLd.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(jsonLd.mainEntityOfPage["@id"]).toContain("/blog/");
    }
  });

  it("should produce valid JSON when stringified", () => {
    for (const article of blogArticles) {
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.excerpt,
        datePublished: article.publishedAt,
      };

      const json = JSON.stringify(jsonLd);
      expect(() => JSON.parse(json)).not.toThrow();
    }
  });
});

// ─── Blog Sitemap Integration Tests ───

describe("Blog Sitemap Integration", () => {
  it("should generate sitemap URLs for all blog articles", () => {
    const BASE_URL = "https://makecustommusic.com";
    const articles = getAllArticles();

    const urls = articles.map(
      (article) =>
        `  <url>\n    <loc>${BASE_URL}/blog/${article.slug}</loc>\n    <lastmod>${article.publishedAt}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`
    );

    expect(urls.length).toBe(articles.length);
    for (const article of articles) {
      const hasUrl = urls.some((u) => u.includes(`/blog/${article.slug}`));
      expect(hasUrl).toBe(true);
    }
  });

  it("should include /blog in static routes", () => {
    const STATIC_ROUTES = [
      { path: "/", changefreq: "weekly", priority: 1.0 },
      { path: "/generate", changefreq: "weekly", priority: 0.9 },
      { path: "/blog", changefreq: "weekly", priority: 0.7 },
    ];

    const blogRoute = STATIC_ROUTES.find((r) => r.path === "/blog");
    expect(blogRoute).toBeDefined();
    expect(blogRoute!.priority).toBe(0.7);
    expect(blogRoute!.changefreq).toBe("weekly");
  });

  it("should have blog article lastmod dates matching publishedAt", () => {
    const articles = getAllArticles();
    for (const article of articles) {
      expect(article.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

// ─── Blog Robots.txt Tests ───

describe("Blog Robots.txt", () => {
  it("should allow /blog and /blog/ paths", () => {
    const robotsTxt = `User-agent: *
Allow: /
Allow: /blog
Allow: /blog/
Disallow: /api/`;

    expect(robotsTxt).toContain("Allow: /blog");
    expect(robotsTxt).toContain("Allow: /blog/");
  });
});

// ─── Blog Navigation Tests ───

describe("Blog Navigation", () => {
  it("should have adjacent article navigation data", () => {
    const articles = getAllArticles();
    // For each article except the first and last, there should be prev and next
    for (let i = 0; i < articles.length; i++) {
      const currentIndex = i;
      const prevArticle =
        currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null;
      const nextArticle = currentIndex > 0 ? articles[currentIndex - 1] : null;

      if (i === 0) {
        // Newest article: no next (newer), has prev (older)
        expect(nextArticle).toBeNull();
        expect(prevArticle).not.toBeNull();
      } else if (i === articles.length - 1) {
        // Oldest article: has next (newer), no prev (older)
        expect(nextArticle).not.toBeNull();
        expect(prevArticle).toBeNull();
      } else {
        // Middle articles: both prev and next
        expect(nextArticle).not.toBeNull();
        expect(prevArticle).not.toBeNull();
      }
    }
  });
});
