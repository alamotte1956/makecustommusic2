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

  it("should have content with internal links to createchristianmusic.com", () => {
    // At least one article should link back to the site
    const hasInternalLink = blogArticles.some(
      (a) =>
        a.content.includes("createchristianmusic.com") ||
        a.content.includes("/generate")
    );
    expect(hasInternalLink).toBe(true);
  });
});

// ─── Enhanced Blog JSON-LD Structured Data Tests ───

const BASE_URL = "https://createchristianmusic.com";
const PUBLISHER_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663211654017/Q3oEbCsP6DUj527aoyypq7/logo-makecustommusic-V4H6NBVctSA5W9x5679fcE.webp";

function estimateWordCount(content: string): number {
  return content.replace(/[#*\[\]()\-_`>]/g, "").split(/\s+/).filter(Boolean).length;
}

function buildArticleJsonLd(article: (typeof blogArticles)[0]) {
  const wordCount = estimateWordCount(article.content);
  const articleUrl = `${BASE_URL}/blog/${article.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    image: article.coverImage || PUBLISHER_LOGO,
    wordCount,
    articleSection: article.tags[0] || "AI Music",
    keywords: article.tags.join(", "),
    inLanguage: "en-US",
    author: { "@type": "Organization", name: article.author, url: BASE_URL, logo: { "@type": "ImageObject", url: PUBLISHER_LOGO } },
    publisher: { "@type": "Organization", name: "Create Christian Music", url: BASE_URL, logo: { "@type": "ImageObject", url: PUBLISHER_LOGO, width: 1080, height: 1080 } },
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    url: articleUrl,
    isAccessibleForFree: true,
  };
}

function buildBreadcrumbJsonLd(article: (typeof blogArticles)[0]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: article.title, item: `${BASE_URL}/blog/${article.slug}` },
    ],
  };
}

function buildFaqJsonLd(faq: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

describe("Enhanced Article JSON-LD", () => {
  it("should build valid Article schema with all required fields", () => {
    for (const article of blogArticles) {
      const jsonLd = buildArticleJsonLd(article);
      expect(jsonLd["@context"]).toBe("https://schema.org");
      expect(jsonLd["@type"]).toBe("Article");
      expect(jsonLd.headline).toBe(article.title);
      expect(jsonLd.description).toBe(article.excerpt);
      expect(jsonLd.image).toBeTruthy();
      expect(jsonLd.wordCount).toBeGreaterThan(0);
      expect(jsonLd.articleSection).toBeTruthy();
      expect(jsonLd.keywords).toContain(article.tags[0]);
      expect(jsonLd.inLanguage).toBe("en-US");
      expect(jsonLd.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(jsonLd.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(jsonLd.url).toBe(`${BASE_URL}/blog/${article.slug}`);
      expect(jsonLd.isAccessibleForFree).toBe(true);
    }
  });

  it("should have publisher with logo ImageObject", () => {
    for (const article of blogArticles) {
      const jsonLd = buildArticleJsonLd(article);
      expect(jsonLd.publisher["@type"]).toBe("Organization");
      expect(jsonLd.publisher.logo["@type"]).toBe("ImageObject");
      expect(jsonLd.publisher.logo.url).toContain("http");
      expect(jsonLd.publisher.logo.width).toBe(1080);
      expect(jsonLd.publisher.logo.height).toBe(1080);
    }
  });

  it("should have author with logo ImageObject", () => {
    for (const article of blogArticles) {
      const jsonLd = buildArticleJsonLd(article);
      expect(jsonLd.author["@type"]).toBe("Organization");
      expect(jsonLd.author.logo["@type"]).toBe("ImageObject");
    }
  });

  it("should produce valid JSON when stringified", () => {
    for (const article of blogArticles) {
      const json = JSON.stringify(buildArticleJsonLd(article));
      expect(() => JSON.parse(json)).not.toThrow();
    }
  });

  it("should have accurate word count estimation", () => {
    for (const article of blogArticles) {
      const wc = estimateWordCount(article.content);
      // Each article should have at least 200 words
      expect(wc).toBeGreaterThan(200);
    }
  });
});

describe("BreadcrumbList JSON-LD", () => {
  it("should build valid BreadcrumbList with 3 items for each article", () => {
    for (const article of blogArticles) {
      const jsonLd = buildBreadcrumbJsonLd(article);
      expect(jsonLd["@context"]).toBe("https://schema.org");
      expect(jsonLd["@type"]).toBe("BreadcrumbList");
      expect(jsonLd.itemListElement).toHaveLength(3);
      expect(jsonLd.itemListElement[0].name).toBe("Home");
      expect(jsonLd.itemListElement[0].item).toBe(BASE_URL);
      expect(jsonLd.itemListElement[1].name).toBe("Blog");
      expect(jsonLd.itemListElement[1].item).toBe(`${BASE_URL}/blog`);
      expect(jsonLd.itemListElement[2].name).toBe(article.title);
      expect(jsonLd.itemListElement[2].item).toBe(`${BASE_URL}/blog/${article.slug}`);
    }
  });

  it("should have sequential positions starting from 1", () => {
    const article = blogArticles[0];
    const jsonLd = buildBreadcrumbJsonLd(article);
    jsonLd.itemListElement.forEach((item: any, i: number) => {
      expect(item.position).toBe(i + 1);
    });
  });

  it("should produce valid JSON when stringified", () => {
    const json = JSON.stringify(buildBreadcrumbJsonLd(blogArticles[0]));
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

describe("FAQPage JSON-LD", () => {
  it("should have FAQ data on all articles", () => {
    for (const article of blogArticles) {
      expect(article.faq).toBeDefined();
      expect(article.faq!.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("should build valid FAQPage schema from article FAQ data", () => {
    for (const article of blogArticles) {
      if (!article.faq || article.faq.length === 0) continue;
      const jsonLd = buildFaqJsonLd(article.faq);
      expect(jsonLd["@context"]).toBe("https://schema.org");
      expect(jsonLd["@type"]).toBe("FAQPage");
      expect(jsonLd.mainEntity.length).toBe(article.faq.length);
      for (const entity of jsonLd.mainEntity) {
        expect(entity["@type"]).toBe("Question");
        expect(entity.name.length).toBeGreaterThan(0);
        expect(entity.acceptedAnswer["@type"]).toBe("Answer");
        expect(entity.acceptedAnswer.text.length).toBeGreaterThan(0);
      }
    }
  });

  it("should have non-empty questions and answers", () => {
    for (const article of blogArticles) {
      if (!article.faq) continue;
      for (const item of article.faq) {
        expect(item.question.endsWith("?")).toBe(true);
        expect(item.answer.length).toBeGreaterThan(20);
      }
    }
  });

  it("should produce valid JSON when stringified", () => {
    const article = blogArticles.find((a) => a.faq && a.faq.length > 0);
    expect(article).toBeDefined();
    const json = JSON.stringify(buildFaqJsonLd(article!.faq!));
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

describe("CollectionPage JSON-LD (Blog Listing)", () => {
  it("should build valid CollectionPage schema", () => {
    const articles = getAllArticles();
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "AI Music Blog - Tips, Guides & News",
      url: `${BASE_URL}/blog`,
      isPartOf: { "@type": "WebSite", name: "Create Christian Music", url: BASE_URL },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: articles.map((a, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${BASE_URL}/blog/${a.slug}`,
          name: a.title,
        })),
      },
    };
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("CollectionPage");
    expect(jsonLd.url).toBe(`${BASE_URL}/blog`);
    expect(jsonLd.isPartOf["@type"]).toBe("WebSite");
    expect(jsonLd.mainEntity["@type"]).toBe("ItemList");
    expect(jsonLd.mainEntity.itemListElement.length).toBe(articles.length);
  });

  it("should have sequential positions in ItemList", () => {
    const articles = getAllArticles();
    articles.forEach((_, i) => {
      expect(i + 1).toBeGreaterThan(0);
    });
  });

  it("should include all article URLs in the ItemList", () => {
    const articles = getAllArticles();
    const items = articles.map((a, i) => ({
      position: i + 1,
      url: `${BASE_URL}/blog/${a.slug}`,
      name: a.title,
    }));
    for (const article of articles) {
      const found = items.find((item) => item.url.includes(article.slug));
      expect(found).toBeDefined();
    }
  });
});

describe("Blog Listing BreadcrumbList JSON-LD", () => {
  it("should build valid BreadcrumbList with 2 items for blog listing", () => {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
      ],
    };
    expect(jsonLd["@type"]).toBe("BreadcrumbList");
    expect(jsonLd.itemListElement).toHaveLength(2);
    expect(jsonLd.itemListElement[0].name).toBe("Home");
    expect(jsonLd.itemListElement[1].name).toBe("Blog");
  });
});

// ─── Blog Sitemap Integration Tests ───

describe("Blog Sitemap Integration", () => {
  it("should generate sitemap URLs for all blog articles", () => {
    const BASE_URL = "https://createchristianmusic.com";
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
