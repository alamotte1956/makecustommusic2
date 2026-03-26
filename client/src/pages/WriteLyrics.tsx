import { useState, useCallback, useMemo, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import AudioPlayer from "@/components/AudioPlayer";
import { downloadFile, sanitizeFilename } from "@/lib/safariDownload";
import FavoriteButton from "@/components/FavoriteButton";
import GenerateCoverButton from "@/components/GenerateCoverButton";
import { copyToClipboard } from "@/lib/clipboard";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import {
  PenLine, Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
  Wand2, Sparkles, Loader2, Music, Download, Share2, RefreshCw,
  BookOpen, Cross, Mic, MicOff, FileText,
  Save, FolderOpen, Copy, RotateCcw, Eye, EyeOff, Heart,
  Undo2, Redo2, FileDown, FileType, Link2, ExternalLink, Users
} from "lucide-react";

/* ─── Types ─── */
type SectionType = "intro" | "verse" | "pre-chorus" | "chorus" | "bridge" | "outro" | "interlude" | "hook" | "ad-lib";

interface LyricSection {
  id: string;
  type: SectionType;
  content: string;
  label?: string;
}

type GeneratedSong = {
  id: number;
  title: string;
  keywords: string;
  musicDescription: string | null;
  audioUrl: string | null;
  mp3Url: string | null;
  genre: string | null;
  mood: string | null;
  tempo: number | null;
  keySignature: string | null;
  timeSignature: string | null;
  instruments: string[] | null;
  engine: string | null;
  vocalType: string | null;
  lyrics: string | null;
  styleTags: string | null;
  imageUrl: string | null;
  duration: number | null;
};

/* ─── Constants ─── */
const SECTION_TYPES: { value: SectionType; label: string; color: string }[] = [
  { value: "intro", label: "Intro", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  { value: "verse", label: "Verse", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { value: "pre-chorus", label: "Pre-Chorus", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
  { value: "chorus", label: "Chorus", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { value: "bridge", label: "Bridge", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  { value: "hook", label: "Hook", color: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
  { value: "interlude", label: "Interlude", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  { value: "ad-lib", label: "Ad-lib", color: "bg-pink-500/20 text-pink-300 border-pink-500/30" },
  { value: "outro", label: "Outro", color: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
];

const GENRES = [
  "Pop", "Rock", "R&B", "Hip Hop", "Country", "Folk", "Jazz", "Blues",
  "Electronic", "Ambient", "Classical", "Reggae",
  "Christian", "Gospel", "Christian Modern", "Christian Pop",
  "Christian Rock", "Praise & Worship", "Hymns", "CCM",
  "Liturgical", "Choral", "Christian Acoustic", "Anthem",
];

const MOODS = [
  "Happy", "Sad", "Energetic", "Calm", "Romantic", "Dark", "Uplifting",
  "Melancholic", "Triumphant", "Peaceful", "Intense", "Dreamy",
  "Reverent", "Joyful Praise", "Prayerful", "Grateful", "Reflective",
  "Celebratory", "Devotional", "Hopeful",
];

type VocalValue = "none" | "male" | "female" | "mixed" | "male_and_female";
const VOCAL_TYPES: { value: VocalValue; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "mixed", label: "Duet" },
  { value: "male_and_female", label: "Choir" },
  { value: "none", label: "Instrumental (No Vocals)" },
];

const SCRIPTURE_STARTERS = [
  { label: "Psalm 23", text: "The Lord is my shepherd, I shall not want\nHe makes me lie down in green pastures\nHe leads me beside still waters\nHe restores my soul" },
  { label: "Psalm 100", text: "Make a joyful noise unto the Lord\nAll the earth, serve the Lord with gladness\nCome before His presence with singing\nKnow that the Lord, He is God" },
  { label: "Phil 4:13", text: "I can do all things\nThrough Christ who strengthens me\nNothing is impossible\nWhen I believe" },
  { label: "Jer 29:11", text: "For I know the plans I have for you\nPlans to prosper and not to harm\nPlans to give you hope and a future\nDeclares the Lord Almighty" },
  { label: "Rom 8:28", text: "All things work together for good\nFor those who love the Lord\nCalled according to His purpose\nNothing can separate us from His love" },
  { label: "Isaiah 40:31", text: "Those who wait upon the Lord\nShall renew their strength\nThey shall mount up with wings like eagles\nRun and not grow weary" },
];

const SONG_TEMPLATES = [
  {
    label: "Worship Song",
    sections: [
      { type: "verse" as SectionType, content: "" },
      { type: "chorus" as SectionType, content: "" },
      { type: "verse" as SectionType, content: "" },
      { type: "chorus" as SectionType, content: "" },
      { type: "bridge" as SectionType, content: "" },
      { type: "chorus" as SectionType, content: "" },
    ],
  },
  {
    label: "Pop/Rock",
    sections: [
      { type: "intro" as SectionType, content: "" },
      { type: "verse" as SectionType, content: "" },
      { type: "pre-chorus" as SectionType, content: "" },
      { type: "chorus" as SectionType, content: "" },
      { type: "verse" as SectionType, content: "" },
      { type: "pre-chorus" as SectionType, content: "" },
      { type: "chorus" as SectionType, content: "" },
      { type: "bridge" as SectionType, content: "" },
      { type: "chorus" as SectionType, content: "" },
      { type: "outro" as SectionType, content: "" },
    ],
  },
  {
    label: "Hymn (4 Verses)",
    sections: [
      { type: "verse" as SectionType, content: "" },
      { type: "verse" as SectionType, content: "" },
      { type: "verse" as SectionType, content: "" },
      { type: "verse" as SectionType, content: "" },
    ],
  },
  {
    label: "Gospel",
    sections: [
      { type: "verse" as SectionType, content: "" },
      { type: "chorus" as SectionType, content: "" },
      { type: "verse" as SectionType, content: "" },
      { type: "chorus" as SectionType, content: "" },
      { type: "bridge" as SectionType, content: "" },
      { type: "chorus" as SectionType, content: "" },
      { type: "ad-lib" as SectionType, content: "" },
      { type: "outro" as SectionType, content: "" },
    ],
  },
  {
    label: "Simple (V-C-V-C)",
    sections: [
      { type: "verse" as SectionType, content: "" },
      { type: "chorus" as SectionType, content: "" },
      { type: "verse" as SectionType, content: "" },
      { type: "chorus" as SectionType, content: "" },
    ],
  },
];

let sectionCounter = 0;
function newId() { return `sec_${++sectionCounter}_${Date.now()}`; }

/* ─── Sortable Section Card ─── */
function SortableSectionCard({
  section,
  isExpanded,
  isRefining,
  sectionCount,
  onToggle,
  onUpdate,
  onChangeType,
  onDuplicate,
  onRemove,
  onRefine,
}: {
  section: LyricSection;
  isExpanded: boolean;
  isRefining: boolean;
  sectionCount: number;
  onToggle: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
  onChangeType: (id: string, type: SectionType) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onRefine: (id: string, mode: "polish" | "rhyme" | "restructure" | "rewrite") => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  const typeInfo = SECTION_TYPES.find(t => t.value === section.type)!;

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`border-border/40 bg-card/50 backdrop-blur group ${
        isDragging ? "ring-2 ring-primary/30 shadow-xl" : ""
      }`}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="w-6 h-8 flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
            aria-label="Drag to reorder section"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${typeInfo.color}`}>
            {typeInfo.label}
          </Badge>
          <select
            value={section.type}
            onChange={e => onChangeType(section.id, e.target.value as SectionType)}
            className="text-[11px] bg-transparent border-0 text-muted-foreground cursor-pointer focus:outline-none"
          >
            {SECTION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {section.content.trim().split(/\s+/).filter(Boolean).length} words
          </span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onDuplicate(section.id)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duplicate</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => onRemove(section.id)} disabled={sectionCount <= 1}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onToggle(section.id)}>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
        {isExpanded && (
          <CardContent className="p-4 pt-3 space-y-2">
            <Textarea
              value={section.content}
              onChange={e => onUpdate(section.id, e.target.value)}
              placeholder={`Write your ${typeInfo.label.toLowerCase()} lyrics here...\nEach line will be a line in the song.`}
              className="min-h-[100px] resize-y bg-transparent border-border/20 text-sm leading-relaxed font-mono"
            />
            {/* AI Refine buttons */}
            {section.content.trim() && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-muted-foreground self-center mr-1">AI:</span>
                {(["polish", "rhyme", "restructure", "rewrite"] as const).map(mode => (
                  <Button
                    key={mode}
                    variant="ghost"
                    size="sm"
                    className="text-[10px] h-6 px-2 gap-1"
                    disabled={isRefining}
                    onClick={() => onRefine(section.id, mode)}
                  >
                    {isRefining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

/* ─── Drag Overlay Preview ─── */
function SectionCardOverlay({ section }: { section: LyricSection }) {
  const typeInfo = SECTION_TYPES.find(t => t.value === section.type)!;
  const preview = section.content.trim()
    ? section.content.trim().split("\n").slice(0, 2).join(" / ")
    : "(empty)";

  return (
    <Card className="border-primary/40 bg-card/95 backdrop-blur shadow-2xl ring-2 ring-primary/20 cursor-grabbing">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <GripVertical className="w-4 h-4 text-primary/60" />
        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${typeInfo.color}`}>
          {typeInfo.label}
        </Badge>
        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
          {preview}
        </span>
      </div>
    </Card>
  );
}

/* ─── Component ─── */
export default function WriteLyrics() {
  usePageMeta({ title: "Write Your Own Lyrics", description: "Write, structure, and generate songs from your own lyrics with AI assistance." });
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Song metadata
  const [songTitle, setSongTitle] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [vocalType, setVocalType] = useState<VocalValue>("female");
  const [customStyle, setCustomStyle] = useState("");

  // Sections with undo/redo history
  const initialSections: LyricSection[] = useMemo(() => [
    { id: newId(), type: "verse" as SectionType, content: "" },
    { id: newId(), type: "chorus" as SectionType, content: "" },
    { id: newId(), type: "verse" as SectionType, content: "" },
    { id: newId(), type: "chorus" as SectionType, content: "" },
  ], []);
  const {
    state: sections,
    pushSnapshot,
    pushSnapshotDebounced,
    undo,
    redo,
    resetHistory,
    canUndo,
    canRedo,
  } = useUndoHistory<LyricSection[]>(initialSections);

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(sections.map(s => s.id)));
  const [aiSubject, setAiSubject] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [refiningSection, setRefiningSection] = useState<string | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [generatedSong, setGeneratedSong] = useState<GeneratedSong | null>(null);

  // Draft state
  const [draftName, setDraftName] = useState("");
  const [savedDrafts, setSavedDrafts] = useState<{ name: string; title: string; sections: LyricSection[]; genre: string | null; mood: string | null; vocal: string; style: string }[]>(() => {
    try {
      const stored = localStorage.getItem("mcm_lyric_drafts");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showDrafts, setShowDrafts] = useState(false);

  // Mutations
  const generateLyricsMutation = trpc.songs.generateLyrics.useMutation();
  const refineLyricsMutation = trpc.songs.refineLyrics.useMutation();
  const generateMutation = trpc.songs.generate.useMutation();
  const shareMutation = trpc.songs.createShareLink.useMutation();
  const summaryQuery = trpc.credits.summary.useQuery();
  const utils = trpc.useUtils();

  const userPlan = summaryQuery.data?.plan ?? "free";
  const hasSubscription = userPlan !== "free";

  // Computed
  const fullLyrics = useMemo(() => {
    return sections
      .filter(s => s.content.trim())
      .map(s => {
        const typeInfo = SECTION_TYPES.find(t => t.value === s.type);
        const label = s.label || typeInfo?.label || s.type;
        return `[${label}]\n${s.content.trim()}`;
      })
      .join("\n\n");
  }, [sections]);

  const wordCount = useMemo(() => {
    return sections.reduce((acc, s) => acc + s.content.trim().split(/\s+/).filter(Boolean).length, 0);
  }, [sections]);

  const lineCount = useMemo(() => {
    return sections.reduce((acc, s) => acc + s.content.trim().split("\n").filter(l => l.trim()).length, 0);
  }, [sections]);

  const hasContent = sections.some(s => s.content.trim().length > 0);

  /* ─── Section Handlers (all push to undo history) ─── */
  const addSection = useCallback((type: SectionType, afterId?: string) => {
    const newSection: LyricSection = { id: newId(), type, content: "" };
    const next = afterId
      ? (() => { const arr = [...sections]; const idx = arr.findIndex(s => s.id === afterId); arr.splice(idx + 1, 0, newSection); return arr; })()
      : [...sections, newSection];
    pushSnapshot(next);
    setExpandedSections(prev => { const s = new Set(Array.from(prev)); s.add(newSection.id); return s; });
  }, [sections, pushSnapshot]);

  const removeSection = useCallback((id: string) => {
    pushSnapshot(sections.filter(s => s.id !== id));
  }, [sections, pushSnapshot]);

  const updateSection = useCallback((id: string, content: string) => {
    pushSnapshotDebounced(sections.map(s => s.id === id ? { ...s, content } : s));
  }, [sections, pushSnapshotDebounced]);

  const changeSectionType = useCallback((id: string, type: SectionType) => {
    pushSnapshot(sections.map(s => s.id === id ? { ...s, type } : s));
  }, [sections, pushSnapshot]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex(s => s.id === String(active.id));
      const newIndex = sections.findIndex(s => s.id === String(over.id));
      pushSnapshot(arrayMove(sections, oldIndex, newIndex));
    }
  }, [sections, pushSnapshot]);

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const sectionIds = useMemo(() => sections.map(s => s.id), [sections]);
  const activeDragSection = activeDragId ? sections.find(s => s.id === activeDragId) : null;

  const duplicateSection = useCallback((id: string) => {
    const idx = sections.findIndex(s => s.id === id);
    if (idx === -1) return;
    const original = sections[idx];
    const dup: LyricSection = { id: newId(), type: original.type, content: original.content, label: original.label };
    const next = [...sections];
    next.splice(idx + 1, 0, dup);
    pushSnapshot(next);
  }, [sections, pushSnapshot]);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  /* ─── Template / Scripture ─── */
  const applyTemplate = useCallback((template: typeof SONG_TEMPLATES[0]) => {
    const newSections = template.sections.map(s => ({ id: newId(), type: s.type, content: s.content }));
    pushSnapshot(newSections);
    setExpandedSections(new Set(newSections.map(s => s.id)));
    toast.success(`Applied "${template.label}" template`);
  }, [pushSnapshot]);

  const insertScripture = useCallback((scripture: typeof SCRIPTURE_STARTERS[0]) => {
    const emptyIdx = sections.findIndex(s => !s.content.trim());
    if (emptyIdx !== -1) {
      pushSnapshot(sections.map((s, i) => i === emptyIdx ? { ...s, content: scripture.text } : s));
      toast.success(`Inserted ${scripture.label} into ${SECTION_TYPES.find(t => t.value === sections[emptyIdx].type)?.label || "section"}`);
    } else {
      const newSection: LyricSection = { id: newId(), type: "verse", content: scripture.text };
      pushSnapshot([...sections, newSection]);
      setExpandedSections(prev => { const next = new Set(Array.from(prev)); next.add(newSection.id); return next; });
      toast.success(`Added new verse with ${scripture.label}`);
    }
  }, [sections, pushSnapshot]);

  /* ─── AI Helpers ─── */
  const handleAIGenerate = useCallback(async () => {
    if (!aiSubject.trim()) { toast.error("Enter a subject or theme for the AI"); return; }
    try {
      setIsGeneratingAI(true);
      const result = await generateLyricsMutation.mutateAsync({
        subject: aiSubject.trim(),
        genre: selectedGenre || undefined,
        mood: selectedMood || undefined,
        vocalType: vocalType as "none" | "male" | "female" | "mixed" | "male_and_female",
      });
      // Parse AI lyrics into sections
      const lines = result.lyrics.split("\n");
      const newSections: LyricSection[] = [];
      let currentType: SectionType = "verse";
      let currentContent: string[] = [];

      for (const line of lines) {
        const sectionMatch = line.match(/^\[(.*?)\]/i);
        if (sectionMatch) {
          if (currentContent.length > 0) {
            newSections.push({ id: newId(), type: currentType, content: currentContent.join("\n").trim() });
            currentContent = [];
          }
          const label = sectionMatch[1].toLowerCase();
          if (label.includes("verse")) currentType = "verse";
          else if (label.includes("pre-chorus") || label.includes("pre chorus")) currentType = "pre-chorus";
          else if (label.includes("chorus")) currentType = "chorus";
          else if (label.includes("bridge")) currentType = "bridge";
          else if (label.includes("intro")) currentType = "intro";
          else if (label.includes("outro")) currentType = "outro";
          else if (label.includes("hook")) currentType = "hook";
          else currentType = "verse";
        } else if (line.trim()) {
          currentContent.push(line);
        }
      }
      if (currentContent.length > 0) {
        newSections.push({ id: newId(), type: currentType, content: currentContent.join("\n").trim() });
      }

      if (newSections.length > 0) {
        pushSnapshot(newSections);
        setExpandedSections(new Set(newSections.map(s => s.id)));
        toast.success("AI lyrics generated! Edit them to make them yours.");
      } else {
        // Fallback: put all lyrics in one verse
        pushSnapshot([{ id: newId(), type: "verse", content: result.lyrics }]);
        toast.success("AI lyrics generated!");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to generate lyrics");
    } finally {
      setIsGeneratingAI(false);
    }
  }, [aiSubject, selectedGenre, selectedMood, vocalType, generateLyricsMutation, pushSnapshot]);

  const handleRefineSection = useCallback(async (sectionId: string, mode: "polish" | "rhyme" | "restructure" | "rewrite") => {
    const section = sections.find(s => s.id === sectionId);
    if (!section || !section.content.trim()) { toast.error("Section is empty"); return; }
    try {
      setIsRefining(true);
      setRefiningSection(sectionId);
      const result = await refineLyricsMutation.mutateAsync({
        lyrics: section.content,
        mode,
        genre: selectedGenre || undefined,
        mood: selectedMood || undefined,
      });
      updateSection(sectionId, result.lyrics);
      toast.success(`Section ${mode === "polish" ? "polished" : mode === "rhyme" ? "rhymes enhanced" : mode === "restructure" ? "restructured" : "rewritten"}!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to refine lyrics");
    } finally {
      setIsRefining(false);
      setRefiningSection(null);
    }
  }, [sections, selectedGenre, selectedMood, refineLyricsMutation, updateSection]);

  /* ─── Draft Management ─── */
  const saveDraft = useCallback(() => {
    const name = draftName.trim() || songTitle.trim() || `Draft ${new Date().toLocaleDateString()}`;
    const draft = { name, title: songTitle, sections, genre: selectedGenre, mood: selectedMood, vocal: vocalType, style: customStyle };
    const updated = [...savedDrafts.filter(d => d.name !== name), draft];
    setSavedDrafts(updated);
    localStorage.setItem("mcm_lyric_drafts", JSON.stringify(updated));
    setDraftName("");
    toast.success(`Draft "${name}" saved`);
  }, [draftName, songTitle, sections, selectedGenre, selectedMood, vocalType, customStyle, savedDrafts]);

  const loadDraft = useCallback((draft: typeof savedDrafts[0]) => {
    setSongTitle(draft.title);
    const newSecs = draft.sections.map(s => ({ ...s, id: newId() }));
    resetHistory(newSecs);
    setSelectedGenre(draft.genre);
    setSelectedMood(draft.mood);
    setVocalType(draft.vocal as VocalValue);
    setCustomStyle(draft.style);
    setExpandedSections(new Set(newSecs.map(s => s.id)));
    setShowDrafts(false);
    toast.success(`Loaded "${draft.name}"`);
  }, [resetHistory]);

  const deleteDraft = useCallback((name: string) => {
    const updated = savedDrafts.filter(d => d.name !== name);
    setSavedDrafts(updated);
    localStorage.setItem("mcm_lyric_drafts", JSON.stringify(updated));
    toast.success("Draft deleted");
  }, [savedDrafts]);

  /* ─── Generate Song ─── */
  const handleGenerateSong = useCallback(async () => {
    if (!hasContent) { toast.error("Write some lyrics first!"); return; }
    if (!user) { window.location.href = getLoginUrl(); return; }
    if (!hasSubscription) { toast.error("You need an active subscription to generate music."); navigate("/pricing"); return; }

    setGeneratedSong(null);
    try {
      setIsGenerating(true);
      setProgressMessage("Composing your song from lyrics... (30-120 seconds)");
      setProgress(15);

      const song = await generateMutation.mutateAsync({
        keywords: songTitle.trim() || "Custom Song",
        engine: "elevenlabs",
        genre: selectedGenre || undefined,
        mood: selectedMood || undefined,
        vocalType,
        mode: "custom" as const,
        customTitle: songTitle.trim() || undefined,
        customLyrics: fullLyrics,
        customStyle: customStyle || undefined,
      });

      if (!song) throw new Error("Failed to generate song");
      setGeneratedSong(song as GeneratedSong);
      setProgress(100);
      setProgressMessage("Done!");
      utils.songs.list.invalidate();
      utils.credits.summary.invalidate();
      toast.success("Your song has been created!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate song");
      setProgress(0);
      setProgressMessage("");
    } finally {
      setIsGenerating(false);
    }
  }, [hasContent, user, hasSubscription, songTitle, selectedGenre, selectedMood, vocalType, fullLyrics, customStyle, generateMutation, utils, navigate]);

  const handleShareSong = useCallback(async () => {
    if (!generatedSong) return;
    try {
      const result = await shareMutation.mutateAsync({ songId: generatedSong.id });
      const url = `${window.location.origin}/share/${result.shareToken}`;
      await copyToClipboard(url);
      toast.success("Share link copied to clipboard!");
    } catch { toast.error("Failed to create share link"); }
  }, [generatedSong, shareMutation]);

  const clearAll = useCallback(() => {
    resetHistory([
      { id: newId(), type: "verse" as SectionType, content: "" },
      { id: newId(), type: "chorus" as SectionType, content: "" },
    ]);
    setSongTitle("");
    setSelectedGenre(null);
    setSelectedMood(null);
    setCustomStyle("");
    setGeneratedSong(null);
    setProgress(0);
    setProgressMessage("");
  }, [resetHistory]);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  /* ─── Export Lyrics ─── */
  const handleExport = useCallback(async (format: "pdf" | "txt" | "docx") => {
    if (!hasContent) { toast.error("Write some lyrics first!"); return; }
    try {
      setIsExporting(true);
      const payload = {
        title: songTitle.trim() || "Untitled Song",
        genre: selectedGenre || undefined,
        mood: selectedMood || undefined,
        vocalType: vocalType || undefined,
        sections: sections.map(s => ({
          type: s.type,
          label: s.label,
          content: s.content,
        })),
        format,
      };

      const response = await fetch("/api/lyrics/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Export failed" }));
        throw new Error(err.error || "Export failed");
      }

      const blob = await response.blob();
      const filename = (songTitle.trim() || "lyrics").replace(/[^a-zA-Z0-9\s_-]/g, "").replace(/\s+/g, "_").slice(0, 100) || "lyrics";
      const ext = format;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const formatLabel = format === "pdf" ? "PDF" : format === "txt" ? "Plain Text" : "Word Document";
      toast.success(`Lyrics exported as ${formatLabel}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to export lyrics");
    } finally {
      setIsExporting(false);
    }
  }, [hasContent, songTitle, selectedGenre, selectedMood, vocalType, sections]);

  /* ─── Share Lyrics ─── */
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const createShareMutation = trpc.sharedLyrics.create.useMutation({
    onSuccess: (data) => {
      const url = `${window.location.origin}/shared-lyrics/${data.shareToken}`;
      setShareUrl(url);
      copyToClipboard(url);
      toast.success("Share link copied to clipboard!");
      setIsSharing(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create share link");
      setIsSharing(false);
    },
  });

  const handleShareLyrics = useCallback(() => {
    if (!hasContent) { toast.error("Write some lyrics first!"); return; }
    if (!user) { toast.error("Please sign in to share lyrics"); return; }
    setIsSharing(true);
    setShareUrl(null);
    setShowShareDialog(true);
    createShareMutation.mutate({
      title: songTitle.trim() || "Untitled Song",
      genre: selectedGenre || undefined,
      mood: selectedMood || undefined,
      vocalType: vocalType || undefined,
      sections: sections.map(s => ({
        id: s.id,
        type: s.type,
        label: s.label,
        content: s.content,
      })),
    });
  }, [hasContent, user, songTitle, selectedGenre, selectedMood, vocalType, sections, createShareMutation]);

  const handleCopyShareUrl = useCallback(() => {
    if (shareUrl) {
      copyToClipboard(shareUrl);
      toast.success("Link copied to clipboard!");
    }
  }, [shareUrl]);

  /* ─── Keyboard Shortcuts: Ctrl+Z / Ctrl+Shift+Z (Cmd on Mac) ─── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      // Don't intercept when focus is on an input/textarea (let browser handle native undo)
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  /* ─── Render ─── */
  return (
    <div className="container max-w-6xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <PenLine className="w-7 h-7 text-primary" />
            Write Your Own Lyrics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Craft your lyrics section by section, then let AI bring them to life as a song.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 mr-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={undo}
                  disabled={!canUndo}
                  aria-label="Undo"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo <span className="text-muted-foreground text-[10px] ml-1">⌘Z</span></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={redo}
                  disabled={!canRedo}
                  aria-label="Redo"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo <span className="text-muted-foreground text-[10px] ml-1">⌘⇧Z</span></TooltipContent>
            </Tooltip>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowDrafts(!showDrafts)} className="gap-1.5">
            <FolderOpen className="w-4 h-4" /> Drafts {savedDrafts.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{savedDrafts.length}</Badge>}
          </Button>
          <Button variant="outline" size="sm" onClick={saveDraft} className="gap-1.5">
            <Save className="w-4 h-4" /> Save
          </Button>
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={!hasContent || isExporting}>
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Download lyrics as</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-2 cursor-pointer">
                <FileText className="w-4 h-4 text-red-500" />
                PDF Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("docx")} className="gap-2 cursor-pointer">
                <FileType className="w-4 h-4 text-blue-500" />
                Word Document (.docx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("txt")} className="gap-2 cursor-pointer">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Plain Text (.txt)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Share Button & Dialog */}
          <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!hasContent || !user}
                onClick={handleShareLyrics}
              >
                {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                Share
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Share Lyrics for Co-Editing
                </DialogTitle>
                <DialogDescription>
                  Anyone with this link can view and edit these lyrics. Changes are saved automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {isSharing ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Creating share link...</span>
                  </div>
                ) : shareUrl ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        value={shareUrl}
                        readOnly
                        className="text-sm font-mono"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <Button size="sm" variant="outline" onClick={handleCopyShareUrl} className="shrink-0 gap-1.5">
                        <Copy className="w-4 h-4" /> Copy
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => window.open(shareUrl, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4" /> Open in New Tab
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tip: Collaborators can edit the lyrics directly. Each save increments the edit counter.
                    </p>
                  </>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1.5 text-muted-foreground">
            <RotateCcw className="w-4 h-4" /> Clear
          </Button>
        </div>
      </div>

      {/* Drafts Panel */}
      {showDrafts && savedDrafts.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Saved Drafts</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {savedDrafts.map(draft => (
                <div key={draft.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors">
                  <button onClick={() => loadDraft(draft)} className="text-left flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{draft.name}</p>
                    <p className="text-[11px] text-muted-foreground">{draft.sections.length} sections</p>
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => deleteDraft(draft.name)} className="shrink-0 h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
        {/* ─── Main Editor ─── */}
        <div className="space-y-4">
          {/* Song Title */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Song Title</label>
              <Input
                value={songTitle}
                onChange={e => setSongTitle(e.target.value)}
                placeholder="Give your song a title..."
                className="mt-1.5 text-lg font-semibold bg-transparent border-0 border-b border-border/30 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground/40"
              />
            </CardContent>
          </Card>

          {/* AI Assistant */}
          <Card className="border-primary/20 bg-primary/5 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">AI Lyric Assistant</h3>
              </div>
              <div className="flex gap-2">
                <Input
                  value={aiSubject}
                  onChange={e => setAiSubject(e.target.value)}
                  placeholder="Describe your song theme (e.g., 'God's grace in hard times', 'summer love', 'overcoming fear')..."
                  className="flex-1"
                  onKeyDown={e => e.key === "Enter" && handleAIGenerate()}
                />
                <Button onClick={handleAIGenerate} disabled={!aiSubject.trim() || isGeneratingAI} className="gap-1.5 shrink-0">
                  {isGeneratingAI ? <><Loader2 className="w-4 h-4 animate-spin" /> Writing...</> : <><Wand2 className="w-4 h-4" /> Generate</>}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">AI will generate structured lyrics that you can edit section by section.</p>
            </CardContent>
          </Card>

          {/* Templates & Scripture */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-medium text-muted-foreground self-center mr-1">Templates:</span>
            {SONG_TEMPLATES.map(t => (
              <Button key={t.label} variant="outline" size="sm" className="text-xs h-7" onClick={() => applyTemplate(t)}>
                {t.label}
              </Button>
            ))}
            <span className="text-xs font-medium text-muted-foreground self-center ml-3 mr-1">Scripture:</span>
            {SCRIPTURE_STARTERS.map(s => (
              <Button key={s.label} variant="outline" size="sm" className="text-xs h-7" onClick={() => insertScripture(s)}>
                <BookOpen className="w-3 h-3 mr-1" />{s.label}
              </Button>
            ))}
          </div>

          {/* Sections with Drag & Drop */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {sections.map((section) => (
                  <SortableSectionCard
                    key={section.id}
                    section={section}
                    isExpanded={expandedSections.has(section.id)}
                    isRefining={isRefining && refiningSection === section.id}
                    sectionCount={sections.length}
                    onToggle={toggleSection}
                    onUpdate={updateSection}
                    onChangeType={changeSectionType}
                    onDuplicate={duplicateSection}
                    onRemove={removeSection}
                    onRefine={handleRefineSection}
                  />
                ))}
              </div>
            </SortableContext>

            {/* Drag overlay: shows a floating preview of the dragged section */}
            <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
              {activeDragSection ? (
                <SectionCardOverlay section={activeDragSection} />
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Add Section */}
          <div className="flex flex-wrap gap-2 justify-center py-2">
            <span className="text-xs text-muted-foreground self-center mr-1">Add:</span>
            {SECTION_TYPES.map(t => (
              <Button key={t.value} variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => addSection(t.value)}>
                <Plus className="w-3 h-3" /> {t.label}
              </Button>
            ))}
          </div>

          {/* Generate Button */}
          <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{wordCount} words &middot; {lineCount} lines &middot; {sections.length} sections</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {!user ? "Sign in to generate" : !hasSubscription ? "Subscribe to generate" : "Ready to create your song"}
                  </p>
                </div>
                {!user ? (
                  <a href={getLoginUrl()}>
                    <Button size="lg" className="gap-2 px-8">
                      <Music className="w-5 h-5" /> Sign In to Create
                    </Button>
                  </a>
                ) : !hasSubscription ? (
                  <Link href="/pricing">
                    <Button size="lg" className="gap-2 px-8">
                      <Sparkles className="w-5 h-5" /> Subscribe to Create
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="lg"
                    className="gap-2 px-8"
                    onClick={handleGenerateSong}
                    disabled={!hasContent || isGenerating}
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="w-5 h-5" /> Generate Song</>
                    )}
                  </Button>
                )}
              </div>

              {isGenerating && (
                <div className="mt-4 space-y-1">
                  <Progress value={progress} className="h-2" />
                  <p className="text-[11px] text-muted-foreground text-right">{progressMessage}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generated Song Result */}
          {generatedSong && (
            <Card className="border-primary/30 bg-card/80 backdrop-blur overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Music className="w-5 h-5 text-primary" />
                  {generatedSong.title}
                </CardTitle>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {generatedSong.genre && <Badge variant="secondary" className="text-[10px]">{generatedSong.genre}</Badge>}
                  {generatedSong.mood && <Badge variant="outline" className="text-[10px]">{generatedSong.mood}</Badge>}
                  {generatedSong.vocalType && <Badge variant="outline" className="text-[10px]">{generatedSong.vocalType}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(generatedSong.audioUrl || generatedSong.mp3Url) && (
                  <AudioPlayer src={generatedSong.mp3Url || generatedSong.audioUrl || ""} title={generatedSong.title} />
                )}
                <div className="flex flex-wrap gap-2">
                  {generatedSong.mp3Url && (
                    <Button size="sm" variant="outline" onClick={() => downloadFile(generatedSong.mp3Url!, sanitizeFilename(generatedSong.title) + ".mp3")}>
                      <Download className="w-4 h-4 mr-1.5" /> Download MP3
                    </Button>
                  )}
                  <FavoriteButton songId={generatedSong.id} variant="outline" showLabel />
                  <Button size="sm" variant="outline" onClick={handleGenerateSong}>
                    <RefreshCw className="w-4 h-4 mr-1.5" /> Regenerate
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleShareSong}>
                    <Share2 className="w-4 h-4 mr-1.5" /> Share
                  </Button>
                  <GenerateCoverButton
                    songId={generatedSong.id}
                    hasImage={!!generatedSong.imageUrl}
                    size="sm"
                    variant="outline"
                    onGenerated={(url) => setGeneratedSong(prev => prev ? { ...prev, imageUrl: url } : prev)}
                  />
                  <Link href={`/songs/${generatedSong.id}`}>
                    <Button size="sm" variant="outline">
                      <FileText className="w-4 h-4 mr-1.5" /> Full Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── Right Sidebar: Style & Preview ─── */}
        <div className="space-y-4">
          {/* Style Panel */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowStylePanel(!showStylePanel)}>
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><Music className="w-4 h-4" /> Song Style</span>
                {showStylePanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CardTitle>
            </CardHeader>
            {showStylePanel && (
              <CardContent className="space-y-4 pt-0">
                {/* Genre */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Genre</label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {GENRES.map(g => (
                      <Badge
                        key={g}
                        variant={selectedGenre === g ? "default" : "outline"}
                        className="cursor-pointer text-[10px] hover:bg-primary/20 transition-colors"
                        onClick={() => setSelectedGenre(selectedGenre === g ? null : g)}
                      >
                        {g}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Mood */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Mood</label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {MOODS.map(m => (
                      <Badge
                        key={m}
                        variant={selectedMood === m ? "default" : "outline"}
                        className="cursor-pointer text-[10px] hover:bg-primary/20 transition-colors"
                        onClick={() => setSelectedMood(selectedMood === m ? null : m)}
                      >
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Vocal Type */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Vocals</label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {VOCAL_TYPES.map(v => (
                      <Badge
                        key={v.value}
                        variant={vocalType === v.value ? "default" : "outline"}
                        className="cursor-pointer text-[10px] hover:bg-primary/20 transition-colors"
                        onClick={() => setVocalType(v.value)}
                      >
                        {v.value === "none" ? <MicOff className="w-3 h-3 mr-1" /> : <Mic className="w-3 h-3 mr-1" />}
                        {v.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Style Tags */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Style Tags <span className="font-normal">(optional)</span></label>
                  <Input
                    value={customStyle}
                    onChange={e => setCustomStyle(e.target.value)}
                    placeholder="e.g., acoustic guitar, soft piano, choir harmonies"
                    className="mt-1.5 text-xs"
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Preview Panel */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowPreview(!showPreview)}>
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">{showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} Lyrics Preview</span>
                {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CardTitle>
            </CardHeader>
            {showPreview && (
              <CardContent className="pt-0">
                {hasContent ? (
                  <div className="bg-muted/20 rounded-lg p-4 border border-border/20">
                    {songTitle && <h3 className="text-base font-bold mb-3 text-center">{songTitle}</h3>}
                    <div className="space-y-3 text-sm font-mono leading-relaxed">
                      {sections.filter(s => s.content.trim()).map(s => {
                        const typeInfo = SECTION_TYPES.find(t => t.value === s.type);
                        return (
                          <div key={s.id}>
                            <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">
                              [{typeInfo?.label || s.type}]
                            </p>
                            {s.content.trim().split("\n").map((line, i) => (
                              <p key={i} className="text-foreground/80">{line}</p>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Start writing to see your lyrics preview here.</p>
                )}
                {hasContent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-xs gap-1.5"
                    onClick={() => { copyToClipboard(fullLyrics); toast.success("Lyrics copied!"); }}
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy All Lyrics
                  </Button>
                )}
              </CardContent>
            )}
          </Card>

          {/* Tips Card */}
          <Card className="border-border/30 bg-muted/10 backdrop-blur">
            <CardContent className="p-4">
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" /> Songwriting Tips
              </h3>
              <ul className="text-[11px] text-muted-foreground space-y-1.5 leading-relaxed">
                <li>Keep verses 4-8 lines for best results</li>
                <li>Choruses should be memorable and repeatable</li>
                <li>Use the bridge to add contrast or a new perspective</li>
                <li>Scripture starters work great as a foundation to build on</li>
                <li>Use AI Refine to polish, improve rhymes, or restructure</li>
                <li>Save drafts often — they're stored locally in your browser</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
