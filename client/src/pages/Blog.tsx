import { Link } from "wouter";
import { usePageMeta } from "@/hooks/usePageMeta";
import { getAllArticles } from "../../../shared/blogArticles";
import { Calendar, Clock, ArrowRight, BookOpen, Tag } from "lucide-react";

const articles = getAllArticles();

export default function Blog() {
  usePageMeta({
    title: "Blog - AI Music Tips, Guides & News",
    description:
      "Read expert guides on AI music generation, songwriting tips, licensing advice, and creative tutorials for content creators and musicians.",
    canonicalPath: "/blog",
  });

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
        <div className="container relative py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <BookOpen className="w-4 h-4" />
              Blog
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              AI Music <span className="text-primary">Insights</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Guides, tutorials, and tips for creating amazing music with
              artificial intelligence. Whether you're a beginner or a pro, find
              the knowledge you need.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Article (latest) */}
      {articles.length > 0 && (
        <section className="py-8 md:py-12">
          <div className="container max-w-5xl">
            <Link href={`/blog/${articles[0].slug}`}>
              <article className="group relative rounded-2xl border border-border bg-card overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="p-8 md:p-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                      Latest
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(articles[0].publishedAt).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "long", day: "numeric" }
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {articles[0].readingTime} min read
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-card-foreground mb-3 group-hover:text-primary transition-colors">
                    {articles[0].title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4 max-w-3xl">
                    {articles[0].excerpt}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    {articles[0].tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-medium"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-primary font-semibold text-sm group-hover:gap-2.5 transition-all">
                    Read Article
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </article>
            </Link>
          </div>
        </section>
      )}

      {/* Article Grid */}
      {articles.length > 1 && (
        <section className="py-8 md:py-12 bg-muted/30">
          <div className="container max-w-5xl">
            <h2 className="text-2xl font-bold text-foreground mb-8">
              More Articles
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {articles.slice(1).map((article) => (
                <Link key={article.slug} href={`/blog/${article.slug}`}>
                  <article className="group h-full rounded-xl border border-border bg-card p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(article.publishedAt).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "short", day: "numeric" }
                        )}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {article.readingTime} min
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-card-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-primary font-medium text-sm group-hover:gap-2.5 transition-all">
                      Read More
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-12 md:py-16">
        <div className="container text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">
            Ready to Create Your Own Music?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Put these tips into practice. Generate original AI music from simple
            text descriptions — no musical experience required.
          </p>
          <Link href="/generate">
            <span className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer">
              Start Creating Music
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
