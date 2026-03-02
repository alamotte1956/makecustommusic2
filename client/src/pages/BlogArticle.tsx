import { useParams, Link, Redirect } from "wouter";
import { usePageMeta } from "@/hooks/usePageMeta";
import { getArticleBySlug, getAllArticles } from "../../../shared/blogArticles";
import { Calendar, Clock, ArrowLeft, ArrowRight, Tag, User, BookOpen } from "lucide-react";
import { useEffect } from "react";

/** Minimal Markdown-to-HTML renderer for blog content */
function renderMarkdown(md: string): string {
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold text-foreground mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-foreground mt-10 mb-4">$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    // Links — convert internal links to the site
    .replace(
      /\[([^\]]+)\]\((https:\/\/makecustommusic\.com[^)]*)\)/g,
      '<a href="$2" class="text-primary underline hover:opacity-80">$1</a>'
    )
    // External links
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-primary underline hover:opacity-80" target="_blank" rel="noopener noreferrer">$1</a>'
    )
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-muted-foreground leading-relaxed">$1</li>')
    // Ordered lists (simple)
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-muted-foreground leading-relaxed list-decimal">$1</li>')
    // Paragraphs — wrap lines that aren't already wrapped in tags
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<li") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol")
      ) {
        // Wrap consecutive <li> items in <ul>
        if (trimmed.startsWith("<li")) {
          return `<ul class="space-y-1.5 my-4 list-disc">${trimmed}</ul>`;
        }
        return trimmed;
      }
      return `<p class="text-muted-foreground leading-relaxed mb-4">${trimmed}</p>`;
    })
    .join("\n");

  return html;
}

/** Build JSON-LD Article structured data */
function buildArticleJsonLd(article: {
  title: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  slug: string;
}) {
  return {
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
}

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticleBySlug(slug) : undefined;
  const allArticles = getAllArticles();

  usePageMeta({
    title: article ? article.title : "Article Not Found",
    description: article
      ? article.excerpt.slice(0, 160)
      : "The requested blog article could not be found.",
    canonicalPath: article ? `/blog/${article.slug}` : "/blog",
  });

  // Inject JSON-LD structured data
  useEffect(() => {
    if (!article) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "blog-article-jsonld";
    script.textContent = JSON.stringify(buildArticleJsonLd(article));
    document.head.appendChild(script);
    return () => {
      const existing = document.getElementById("blog-article-jsonld");
      if (existing) existing.remove();
    };
  }, [article]);

  if (!article) {
    return <Redirect to="/blog" />;
  }

  // Find adjacent articles for navigation
  const currentIndex = allArticles.findIndex((a) => a.slug === article.slug);
  const prevArticle = currentIndex < allArticles.length - 1 ? allArticles[currentIndex + 1] : null;
  const nextArticle = currentIndex > 0 ? allArticles[currentIndex - 1] : null;

  const contentHtml = renderMarkdown(article.content);

  return (
    <div>
      {/* Article Header */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
        <div className="container relative py-10 md:py-14">
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Link href="/">
                <span className="hover:text-foreground transition-colors cursor-pointer">Home</span>
              </Link>
              <span>/</span>
              <Link href="/blog">
                <span className="hover:text-foreground transition-colors cursor-pointer">Blog</span>
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium truncate max-w-[200px]">
                {article.title}
              </span>
            </nav>

            {/* Tags */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight mb-4">
              {article.title}
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {article.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(article.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {article.readingTime} min read
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-8 md:py-12">
        <div className="container max-w-3xl">
          <article
            className="prose-custom"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          {/* Internal CTA */}
          <div className="mt-12 p-6 rounded-xl border border-primary/20 bg-primary/5 text-center space-y-3">
            <BookOpen className="w-8 h-8 text-primary mx-auto" />
            <h3 className="text-lg font-semibold text-foreground">
              Create Your Own AI Music
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Ready to try it yourself? Generate original songs from text
              descriptions in seconds.
            </p>
            <Link href="/generate">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer mt-2">
                Start Creating
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Article Navigation */}
      <section className="py-8 border-t border-border">
        <div className="container max-w-3xl">
          <div className="flex items-stretch gap-4">
            {prevArticle ? (
              <Link href={`/blog/${prevArticle.slug}`}>
                <div className="flex-1 group p-4 rounded-xl border border-border hover:shadow-md transition-all cursor-pointer">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                    <ArrowLeft className="w-3 h-3" />
                    Previous
                  </span>
                  <span className="text-sm font-medium text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {prevArticle.title}
                  </span>
                </div>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {nextArticle ? (
              <Link href={`/blog/${nextArticle.slug}`}>
                <div className="flex-1 group p-4 rounded-xl border border-border hover:shadow-md transition-all text-right cursor-pointer">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center justify-end gap-1 mb-1">
                    Next
                    <ArrowRight className="w-3 h-3" />
                  </span>
                  <span className="text-sm font-medium text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {nextArticle.title}
                  </span>
                </div>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
          </div>

          {/* Back to Blog */}
          <div className="text-center mt-8">
            <Link href="/blog">
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
                Back to All Articles
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
