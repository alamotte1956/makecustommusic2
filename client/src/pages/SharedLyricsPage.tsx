import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { usePageMeta } from "@/hooks/usePageMeta";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";
import { useRoute } from "wouter";
import {
  PenLine, Plus, Trash2, ChevronDown, ChevronUp,
  Loader2, Save, Copy, Users, Clock, Link2,
  Eye, EyeOff, Check
} from "lucide-react";

/* ─── Types ─── */
type SectionType = "intro" | "verse" | "pre-chorus" | "chorus" | "bridge" | "outro" | "interlude" | "hook" | "ad-lib";

interface LyricSection {
  id: string;
  type: SectionType;
  label?: string;
  content: string;
}

const SECTION_TYPES: { value: SectionType; label: string }[] = [
  { value: "intro", label: "Intro" },
  { value: "verse", label: "Verse" },
  { value: "pre-chorus", label: "Pre-Chorus" },
  { value: "chorus", label: "Chorus" },
  { value: "bridge", label: "Bridge" },
  { value: "hook", label: "Hook" },
  { value: "interlude", label: "Interlude" },
  { value: "ad-lib", label: "Ad-lib" },
  { value: "outro", label: "Outro" },
];

const SECTION_COLORS: Record<string, string> = {
  intro: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  verse: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "pre-chorus": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  chorus: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  bridge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  hook: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  interlude: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "ad-lib": "bg-pink-500/10 text-pink-400 border-pink-500/20",
  outro: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function SharedLyricsPage() {
  const [, params] = useRoute("/shared-lyrics/:token");
  const token = params?.token ?? "";

  usePageMeta({ title: "Shared Lyrics" });

  // Fetch shared lyrics
  const { data: sharedData, isLoading, error, refetch } = trpc.sharedLyrics.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  // Local editing state
  const [sections, setSections] = useState<LyricSection[]>([]);
  const [title, setTitle] = useState("");
  const [editorName, setEditorName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("shared-lyrics-editor-name") || "";
    }
    return "";
  });
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const initialized = useRef(false);

  // Initialize local state from fetched data
  useEffect(() => {
    if (sharedData && !initialized.current) {
      setSections(
        (sharedData.sections as LyricSection[]).map(s => ({
          ...s,
          type: s.type as SectionType,
        }))
      );
      setTitle(sharedData.title);
      initialized.current = true;
    }
  }, [sharedData]);

  // Save editor name to localStorage
  useEffect(() => {
    if (editorName) {
      localStorage.setItem("shared-lyrics-editor-name", editorName);
    }
  }, [editorName]);

  // Update mutation
  const updateMutation = trpc.sharedLyrics.update.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      toast.success("Changes saved!");
      refetch();
    },
    onError: (err) => {
      setIsSaving(false);
      toast.error(err.message || "Failed to save changes");
    },
  });

  // Mark changes as unsaved
  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Save handler
  const handleSave = useCallback(() => {
    if (!token) return;
    setIsSaving(true);
    updateMutation.mutate({
      token,
      title: title.trim() || "Untitled Song",
      sections: sections.map(s => ({
        id: s.id,
        type: s.type,
        label: s.label,
        content: s.content,
      })),
      editorName: editorName.trim() || undefined,
    });
  }, [token, title, sections, editorName, updateMutation]);

  // Section handlers
  const updateSection = useCallback((id: string, content: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, content } : s));
    markDirty();
  }, [markDirty]);

  const updateSectionType = useCallback((id: string, type: SectionType) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, type } : s));
    markDirty();
  }, [markDirty]);

  const addSection = useCallback((type: SectionType = "verse") => {
    setSections(prev => [...prev, { id: newId(), type, content: "" }]);
    markDirty();
  }, [markDirty]);

  const removeSection = useCallback((id: string) => {
    setSections(prev => {
      if (prev.length <= 1) { toast.error("Must have at least one section"); return prev; }
      return prev.filter(s => s.id !== id);
    });
    markDirty();
  }, [markDirty]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Copy share link
  const handleCopyLink = useCallback(() => {
    copyToClipboard(window.location.href);
    toast.success("Link copied to clipboard!");
  }, []);

  // Full lyrics for preview
  const fullLyrics = useMemo(() => {
    return sections
      .filter(s => s.content.trim())
      .map(s => `[${SECTION_TYPES.find(t => t.value === s.type)?.label || s.type}]\n${s.content.trim()}`)
      .join("\n\n");
  }, [sections]);

  // Loading state
  if (isLoading) {
    return (
      <div className="container max-w-4xl py-12">
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading shared lyrics...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !sharedData) {
    return (
      <div className="container max-w-4xl py-12">
        <Card className="border-destructive/50">
          <CardContent className="p-8 text-center">
            <PenLine className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Shared Lyrics Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This shared lyrics link may have expired or been deleted by the owner.
            </p>
            <Button variant="outline" onClick={() => window.location.href = "/write-lyrics"}>
              Write Your Own Lyrics
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            Shared Lyrics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Collaborative editing — anyone with this link can contribute.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5">
            <Link2 className="w-4 h-4" /> Copy Link
          </Button>
          <Button
            variant={hasUnsavedChanges ? "default" : "outline"}
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="gap-1.5"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {hasUnsavedChanges ? "Save Changes" : "Saved"}
          </Button>
        </div>
      </div>

      {/* Info Bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {sharedData.ownerName && (
          <span className="flex items-center gap-1">
            <PenLine className="w-3 h-3" /> Created by <strong>{sharedData.ownerName}</strong>
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> Last updated {new Date(sharedData.updatedAt).toLocaleDateString()}
        </span>
        {sharedData.editCount > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            {sharedData.editCount} edit{sharedData.editCount !== 1 ? "s" : ""}
          </Badge>
        )}
        {sharedData.genre && <Badge variant="outline" className="text-[10px]">{sharedData.genre}</Badge>}
        {sharedData.mood && <Badge variant="outline" className="text-[10px]">{sharedData.mood}</Badge>}
        {lastSaved && (
          <span className="flex items-center gap-1 text-green-500">
            <Check className="w-3 h-3" /> Saved {lastSaved.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Editor Name */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground shrink-0">Your name:</label>
        <Input
          value={editorName}
          onChange={(e) => setEditorName(e.target.value)}
          placeholder="Anonymous collaborator"
          className="max-w-xs text-sm"
        />
      </div>

      {/* Song Title */}
      <div>
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); markDirty(); }}
          placeholder="Song Title"
          className="text-lg font-semibold"
        />
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section) => {
          const isCollapsed = collapsedSections.has(section.id);
          const colorClass = SECTION_COLORS[section.type] || SECTION_COLORS.verse;

          return (
            <Card key={section.id} className="border-border/50 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/30">
                {/* Section type selector */}
                <select
                  value={section.type}
                  onChange={(e) => updateSectionType(section.id, e.target.value as SectionType)}
                  className="text-xs font-medium bg-transparent border-0 cursor-pointer focus:ring-0 focus:outline-none"
                >
                  {SECTION_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <Badge variant="outline" className={`text-[10px] ${colorClass}`}>
                  {SECTION_TYPES.find(t => t.value === section.type)?.label || section.type}
                </Badge>
                <div className="flex-1" />
                {/* Collapse toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => toggleCollapse(section.id)}
                >
                  {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </Button>
                {/* Remove */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSection(section.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove section</TooltipContent>
                </Tooltip>
              </div>
              {!isCollapsed && (
                <CardContent className="p-3">
                  <Textarea
                    value={section.content}
                    onChange={(e) => updateSection(section.id, e.target.value)}
                    placeholder={`Write your ${SECTION_TYPES.find(t => t.value === section.type)?.label || "lyrics"} here...`}
                    className="min-h-[100px] resize-y text-sm leading-relaxed"
                  />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Section */}
      <div className="flex flex-wrap gap-2">
        {SECTION_TYPES.map(t => (
          <Button
            key={t.value}
            variant="outline"
            size="sm"
            onClick={() => addSection(t.value)}
            className="gap-1 text-xs"
          >
            <Plus className="w-3 h-3" /> {t.label}
          </Button>
        ))}
      </div>

      {/* Preview Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="gap-1.5"
        >
          {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showPreview ? "Hide Preview" : "Show Preview"}
        </Button>
      </div>

      {/* Preview */}
      {showPreview && (
        <Card className="border-border/50 bg-muted/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Full Lyrics Preview</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { copyToClipboard(fullLyrics); toast.success("Lyrics copied!"); }}
                className="gap-1.5 h-7 text-xs"
              >
                <Copy className="w-3 h-3" /> Copy
              </Button>
            </div>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-foreground/90">
              {fullLyrics || "No lyrics yet..."}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground pt-4">
        &copy; {new Date().getFullYear()} Albert LaMotte &mdash; Made with Make Custom Music
      </p>
    </div>
  );
}
