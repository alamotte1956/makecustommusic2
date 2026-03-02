import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Trash2, LogIn, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

/** Format a date into a relative "time ago" string */
function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 5) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Generate a deterministic avatar color from a user name */
function avatarColor(name: string): string {
  const colors = [
    "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
    "bg-rose-500", "bg-cyan-500", "bg-fuchsia-500", "bg-lime-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface CommentSectionProps {
  articleSlug: string;
}

export default function CommentSection({ articleSlug }: CommentSectionProps) {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: comments, isLoading } = trpc.blogComments.list.useQuery(
    { articleSlug },
    { refetchOnWindowFocus: false }
  );

  const createMutation = trpc.blogComments.create.useMutation({
    onMutate: async () => {
      setIsSubmitting(true);
      // Cancel outgoing fetches
      await utils.blogComments.list.cancel({ articleSlug });
      const prev = utils.blogComments.list.getData({ articleSlug });
      // Optimistic update
      if (prev && user) {
        utils.blogComments.list.setData({ articleSlug }, [
          {
            id: -Date.now(),
            articleSlug,
            userId: user.id,
            content: content.trim(),
            createdAt: new Date(),
            updatedAt: new Date(),
            userName: user.name || "You",
          },
          ...prev,
        ]);
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        utils.blogComments.list.setData({ articleSlug }, ctx.prev);
      }
      toast.error("Failed to post comment. Please try again.");
    },
    onSettled: () => {
      setIsSubmitting(false);
      utils.blogComments.list.invalidate({ articleSlug });
      utils.blogComments.count.invalidate({ articleSlug });
    },
    onSuccess: () => {
      setContent("");
      toast.success("Comment posted!");
    },
  });

  const deleteMutation = trpc.blogComments.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.blogComments.list.cancel({ articleSlug });
      const prev = utils.blogComments.list.getData({ articleSlug });
      if (prev) {
        utils.blogComments.list.setData(
          { articleSlug },
          prev.filter((c) => c.id !== id)
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        utils.blogComments.list.setData({ articleSlug }, ctx.prev);
      }
      toast.error("Failed to delete comment.");
    },
    onSettled: () => {
      utils.blogComments.list.invalidate({ articleSlug });
      utils.blogComments.count.invalidate({ articleSlug });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 2000) return;
    createMutation.mutate({ articleSlug, content: trimmed });
  };

  const commentCount = comments?.length ?? 0;

  // Memoize the character count
  const charCount = useMemo(() => content.trim().length, [content]);

  return (
    <section className="mt-12 pt-8 border-t border-border">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">
          Discussion
        </h2>
        {commentCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {commentCount}
          </span>
        )}
      </div>

      {/* Comment Form */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex items-start gap-3">
            {/* User Avatar */}
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 ${avatarColor(user?.name || "U")}`}
            >
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 space-y-2">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts on this article..."
                className="min-h-[80px] resize-y bg-card text-card-foreground border-border focus:border-primary/50"
                maxLength={2000}
                disabled={isSubmitting}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {charCount}/2000
                </span>
                <Button
                  type="submit"
                  size="sm"
                  disabled={charCount === 0 || charCount > 2000 || isSubmitting}
                  className="gap-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Post Comment
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-5 rounded-xl border border-border bg-muted/30 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Sign in to join the discussion and share your thoughts.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In to Comment
          </Button>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-3 w-3/4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : commentCount === 0 ? (
        <div className="text-center py-10">
          <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No comments yet. Be the first to share your thoughts!
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {comments?.map((comment) => (
            <div
              key={comment.id}
              className="flex items-start gap-3 group"
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 ${avatarColor(comment.userName)}`}
              >
                {comment.userName.charAt(0).toUpperCase()}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">
                    {comment.userName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(new Date(comment.createdAt))}
                  </span>
                  {/* Delete button for own comments */}
                  {user && user.id === comment.userId && (
                    <button
                      onClick={() => deleteMutation.mutate({ id: comment.id })}
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded"
                      title="Delete comment"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
