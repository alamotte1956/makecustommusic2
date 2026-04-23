import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { extractLeadSheet, type LeadSheet } from "@/lib/leadSheetExtractor";
import { detectKeyFromABC, transposeABC, COMMON_KEYS } from "@/lib/transpose";
import { extractChordsFromABC } from "@/lib/midiExport";
import { getBestCapoPositions } from "@/lib/capoChart";
import { convertChordLineToNashville, getNashvilleLegend } from "@/lib/nashvilleNumber";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus, Trash2, GripVertical, Music, BookOpen, Clock, ChevronRight,
  Sparkles, Loader2, Calendar, Church, ListMusic, Edit2, Copy,
  ArrowUp, ArrowDown, FileText, Cross, Mic, Heart, Hand, MessageSquare,
  Printer, Download, Settings2
} from "lucide-react";
import { Link } from "wouter";
import { usePageMeta } from "@/hooks/usePageMeta";

/* ─── Item type icons & colors ─── */
const ITEM_TYPE_CONFIG: Record<string, { icon: typeof Music; color: string; label: string }> = {
  song: { icon: Music, color: "bg-purple-500/20 text-purple-400", label: "Song" },
  prayer: { icon: Hand, color: "bg-blue-500/20 text-blue-400", label: "Prayer" },
  scripture: { icon: BookOpen, color: "bg-amber-500/20 text-amber-400", label: "Scripture" },
  sermon: { icon: MessageSquare, color: "bg-green-500/20 text-green-400", label: "Sermon" },
  offering: { icon: Heart, color: "bg-pink-500/20 text-pink-400", label: "Offering" },
  communion: { icon: Cross, color: "bg-red-500/20 text-red-400", label: "Communion" },
  announcement: { icon: Mic, color: "bg-cyan-500/20 text-cyan-400", label: "Announcement" },
  transition: { icon: ChevronRight, color: "bg-gray-500/20 text-gray-400", label: "Transition" },
  other: { icon: FileText, color: "bg-gray-500/20 text-gray-400", label: "Other" },
};

/* ─── Worship Set List View ─── */
function WorshipSetList({
  onSelect,
  onCreate,
}: {
  onSelect: (id: number) => void;
  onCreate: () => void;
}) {
  const setsQuery = trpc.worship.list.useQuery();
  const deleteMutation = trpc.worship.delete.useMutation();
  const utils = trpc.useUtils();

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this worship set? This cannot be undone.")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      utils.worship.list.invalidate();
      toast.success("Worship set deleted");
    } catch {
      toast.error("Failed to delete worship set");
    }
  };

  if (setsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sets = setsQuery.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-purple-400" />
            Worship Set Builder
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Plan your worship services with AI-powered suggestions, drag-and-drop ordering, and key management.
          </p>
        </div>
        <Button onClick={onCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          New Worship Set
        </Button>
      </div>

      {/* Empty state */}
      {sets.length === 0 && (
        <Card className="bg-white/[0.03] border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
              <Church className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Worship Sets Yet</h3>
            <p className="text-sm text-white/50 max-w-md mb-6">
              Create your first worship set to start planning services. Add songs, prayers, scripture readings,
              and more — then use AI to suggest the perfect flow.
            </p>
            <Button onClick={onCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Set
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Set cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sets.map((set) => (
          <Card
            key={set.id}
            className="bg-white/[0.03] border-white/10 hover:border-purple-500/30 transition-all cursor-pointer group"
            onClick={() => onSelect(set.id)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                    {set.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {set.serviceType && (
                      <Badge variant="outline" className="text-[10px] border-white/20 text-white/60">
                        {set.serviceType}
                      </Badge>
                    )}
                    {set.liturgicalSeason && (
                      <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400">
                        {set.liturgicalSeason}
                      </Badge>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(set.id, e)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {set.date && (
                <div className="flex items-center gap-1.5 text-xs text-white/40 mb-2">
                  <Calendar className="w-3 h-3" />
                  {new Date(set.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </div>
              )}

              {set.notes && (
                <p className="text-xs text-white/40 line-clamp-2 mb-3">{set.notes}</p>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs text-white/30">
                  Updated {new Date(set.updatedAt).toLocaleDateString()}
                </span>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-purple-400 transition-colors" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Create Worship Set Dialog ─── */
function CreateWorshipSetDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: number) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [liturgicalSeason, setLiturgicalSeason] = useState("");
  const [notes, setNotes] = useState("");

  const constantsQuery = trpc.worship.constants.useQuery();
  const createMutation = trpc.worship.create.useMutation();
  const utils = trpc.useUtils();

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    try {
      const result = await createMutation.mutateAsync({
        title: title.trim(),
        date: date || undefined,
        serviceType: serviceType || undefined,
        liturgicalSeason: liturgicalSeason || undefined,
        notes: notes || undefined,
      });
      utils.worship.list.invalidate();
      toast.success("Worship set created!");
      onOpenChange(false);
      setTitle(""); setDate(""); setServiceType(""); setLiturgicalSeason(""); setNotes("");
      if (result?.id) onCreated(result.id);
    } catch {
      toast.error("Failed to create worship set");
    }
  };

  const serviceTypes = constantsQuery.data?.serviceTypes ?? [];
  const seasons = constantsQuery.data?.liturgicalSeasons ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Church className="w-5 h-5 text-purple-400" />
            New Worship Set
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-white/60 mb-1 block">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Sunday Morning — March 30"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-white/60 mb-1 block">Service Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-white/60 mb-1 block">Service Type</label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10">
                  {serviceTypes.map((t) => (
                    <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-white/60 mb-1 block">Liturgical Season</label>
            <Select value={liturgicalSeason} onValueChange={setLiturgicalSeason}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select season (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                {seasons.map((s) => (
                  <SelectItem key={s} value={s} className="text-white">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-white/60 mb-1 block">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Theme, scripture focus, special notes for the team..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-white/10 text-white/60">Cancel</Button>
          </DialogClose>
          <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-2">
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Set
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Worship Set Detail View ─── */
function WorshipSetDetail({
  setId,
  onBack,
}: {
  setId: number;
  onBack: () => void;
}) {
  const setQuery = trpc.worship.get.useQuery({ id: setId });
  const constantsQuery = trpc.worship.constants.useQuery();
  const addItemMutation = trpc.worship.addItem.useMutation();
  const updateItemMutation = trpc.worship.updateItem.useMutation();
  const deleteItemMutation = trpc.worship.deleteItem.useMutation();
  const reorderMutation = trpc.worship.reorderItems.useMutation();
  const suggestMutation = trpc.worship.suggestSet.useMutation();
  const utils = trpc.useUtils();

  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemType, setNewItemType] = useState("song");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemKey, setNewItemKey] = useState("");
  const [newItemDuration, setNewItemDuration] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestDialog, setShowSuggestDialog] = useState(false);
  const [suggestTheme, setSuggestTheme] = useState("");
  const [suggestScripture, setSuggestScripture] = useState("");
  const [suggestMood, setSuggestMood] = useState("");
  const [isPrintingChords, setIsPrintingChords] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [showTransposeDialog, setShowTransposeDialog] = useState(false);
  const [transposeMode, setTransposeMode] = useState<"print" | "pdf">("print");
  const [songTransposeKeys, setSongTransposeKeys] = useState<Record<number, string>>({});
  const [songOriginalKeys, setSongOriginalKeys] = useState<Record<number, string>>({});
  const [chordFormat, setChordFormat] = useState<"standard" | "nashville">("standard");
  const { user } = useAuth();

  const worshipSet = setQuery.data;
  const items = worshipSet?.items ?? [];

  const totalDuration = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.duration ?? 0), 0);
  }, [items]);

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }
    try {
      await addItemMutation.mutateAsync({
        worshipSetId: setId,
        itemType: newItemType as any,
        title: newItemTitle.trim(),
        songKey: newItemKey || undefined,
        duration: newItemDuration ? parseInt(newItemDuration) : undefined,
        notes: newItemNotes || undefined,
        sortOrder: items.length,
      });
      utils.worship.get.invalidate({ id: setId });
      setNewItemTitle(""); setNewItemKey(""); setNewItemDuration(""); setNewItemNotes("");
      setShowAddItem(false);
      toast.success("Item added");
    } catch {
      toast.error("Failed to add item");
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await deleteItemMutation.mutateAsync({ id: itemId, worshipSetId: setId });
      utils.worship.get.invalidate({ id: setId });
      toast.success("Item removed");
    } catch {
      toast.error("Failed to remove item");
    }
  };

  const handleMoveItem = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newOrder = [...items.map(i => i.id)];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    try {
      await reorderMutation.mutateAsync({ worshipSetId: setId, itemIds: newOrder });
      utils.worship.get.invalidate({ id: setId });
    } catch {
      toast.error("Failed to reorder");
    }
  };

  const handleAISuggest = async () => {
    if (!worshipSet) return;
    setIsSuggesting(true);
    try {
      const suggestion = await suggestMutation.mutateAsync({
        serviceType: worshipSet.serviceType || "Sunday Morning",
        liturgicalSeason: worshipSet.liturgicalSeason || undefined,
        theme: suggestTheme || undefined,
        scriptureReading: suggestScripture || undefined,
        mood: suggestMood || undefined,
      });

      // Add each suggested item
      for (let i = 0; i < suggestion.items.length; i++) {
        const item = suggestion.items[i];
        await addItemMutation.mutateAsync({
          worshipSetId: setId,
          itemType: item.type as any,
          title: item.title,
          songKey: item.songKey || undefined,
          duration: item.duration ? Math.round(item.duration) : undefined,
          notes: item.notes || undefined,
          sortOrder: items.length + i,
        });
      }

      utils.worship.get.invalidate({ id: setId });
      setShowSuggestDialog(false);
      setSuggestTheme(""); setSuggestScripture(""); setSuggestMood("");
      toast.success(`Added ${suggestion.items.length} items from AI suggestion!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate suggestions");
    } finally {
      setIsSuggesting(false);
    }
  };

  // ─── Print Chord Charts for entire set ───
  const setAbcQuery = trpc.worship.getSetSongsAbc.useQuery(
    { id: setId },
    { enabled: false } // only fetch on demand
  );

  /** Open the transpose dialog, pre-populating each song's detected key */
  const openTransposeDialog = useCallback(async (mode: "print" | "pdf") => {
    setTransposeMode(mode);
    // Pre-fetch ABC data to detect keys
    const result = await setAbcQuery.refetch();
    const data = result.data;
    if (!data) {
      toast.error("Failed to load song data for this set");
      return;
    }
    const songItems = data.items.filter((item) => item.abc && item.itemType === "song");
    if (songItems.length === 0) {
      toast.error("No songs with sheet music found in this set");
      return;
    }
    // Build original keys map and default transpose keys (same as original)
    const origKeys: Record<number, string> = {};
    const transpKeys: Record<number, string> = {};
    for (const item of songItems) {
      const detected = detectKeyFromABC(item.abc!) || item.songKeySignature || item.songKey || "C";
      origKeys[item.id] = detected;
      transpKeys[item.id] = detected; // default: no transpose
    }
    setSongOriginalKeys(origKeys);
    setSongTransposeKeys(transpKeys);
    setShowTransposeDialog(true);
  }, [setAbcQuery]);

  /** Get the (possibly transposed) ABC for a song item */
  const getTransposedAbc = (item: { id: number; abc: string }, transposeKeys: Record<number, string>, origKeys: Record<number, string>): string => {
    const origKey = origKeys[item.id];
    const targetKey = transposeKeys[item.id];
    if (!origKey || !targetKey || origKey === targetKey) return item.abc;
    return transposeABC(item.abc, origKey, targetKey);
  };

  const handlePrintChordCharts = async (transposeKeys: Record<number, string>, origKeys: Record<number, string>) => {
    setIsPrintingChords(true);
    try {
      const result = await setAbcQuery.refetch();
      const data = result.data;
      if (!data) {
        toast.error("Failed to load song data for this set");
        return;
      }

      const songItems = data.items.filter((item) => item.abc && item.itemType === "song");
      if (songItems.length === 0) {
        toast.error("No songs with sheet music found in this set");
        return;
      }

      const currentYear = new Date().getFullYear();
      const copyrightName = user?.name || "Albert LaMotte";
      const isNashville = chordFormat === "nashville";
      const formatLabel = isNashville ? "Nashville Numbers" : "Standard Chords";

      // Build HTML for each song's chord chart
      let allSongsHtml = "";
      for (let i = 0; i < songItems.length; i++) {
        const item = songItems[i];
        const abc = getTransposedAbc({ id: item.id, abc: item.abc! }, transposeKeys, origKeys);
        const songKey = detectKeyFromABC(abc) || item.songKeySignature || null;
        const leadSheet = extractLeadSheet(abc);
        if (!leadSheet || leadSheet.sections.length === 0) continue;

        const transposedKey = transposeKeys[item.id];
        const originalKey = origKeys[item.id];
        const wasTransposed = transposedKey && originalKey && transposedKey !== originalKey;

        // Also extract the original (un-transposed) lead sheet for comparison
        const origLeadSheet = wasTransposed ? extractLeadSheet(item.abc!) : null;

        const chords = extractChordsFromABC(abc);
        let capoLabel = "";
        if (songKey && chords.length > 0) {
          const best = getBestCapoPositions(songKey, chords, 1);
          if (best.length > 0 && best[0].fret > 0) {
            capoLabel = `Capo: Fret ${best[0].fret} (play in ${best[0].playKey})`;
          }
        }

        const keyLabel = transposedKey || item.songKey || songKey || "";
        const origKeyLabel = wasTransposed ? `(orig: ${originalKey})` : "";

        let sectionsHtml = "";
        // Build a flat list of original chord lines for comparison
        const origChordLines: string[] = [];
        if (origLeadSheet) {
          for (const sec of origLeadSheet.sections) {
            for (const ln of sec.lines) {
              origChordLines.push(ln.chords || "");
            }
          }
        }
        let origLineIdx = 0;
        for (const section of leadSheet.sections) {
          let sectionContent = "";
          if (section.label) {
            sectionContent += `<div class="section-label">${escHtml(section.label)}</div>`;
          }
          for (const line of section.lines) {
            sectionContent += `<div class="lead-line">`;
            if (wasTransposed && origChordLines[origLineIdx]) {
              // Show original chords in muted style above transposed chords
              sectionContent += `<pre class="chord-line-orig">${escHtml(origChordLines[origLineIdx])}</pre>`;
            }
            if (line.chords) {
              const displayChords = isNashville && songKey
                ? convertChordLineToNashville(line.chords, songKey)
                : line.chords;
              sectionContent += `<pre class="chord-line">${escHtml(displayChords)}</pre>`;
            }
            if (line.lyrics) {
              sectionContent += `<pre class="lyrics-line">${escHtml(line.lyrics)}</pre>`;
            }
            sectionContent += `</div>`;
            origLineIdx++;
          }
          sectionsHtml += `<div class="section">${sectionContent}</div>`;
        }

        // Nashville legend for this song
        let nashvilleLegendHtml = "";
        if (isNashville && songKey) {
          const legend = getNashvilleLegend(songKey);
          if (legend.length > 0) {
            nashvilleLegendHtml = `<div class="nashville-legend">
              <div class="nashville-legend-title">Nashville Reference (Key of ${escHtml(songKey)})</div>
              <div class="nashville-legend-items">
                ${legend.map(l => `<span class="nashville-legend-item"><strong>${escHtml(l.number)}</strong> = ${escHtml(l.chord)}</span>`).join("")}
              </div>
            </div>`;
          }
        }

        const pageBreak = i < songItems.length - 1 ? 'page-break-after: always;' : '';
        allSongsHtml += `
          <div class="song" style="${pageBreak}">
            <div class="song-header">
              <div class="song-number">${i + 1}</div>
              <div class="song-title">${escHtml(item.title)}</div>
              <div class="song-meta">
                ${keyLabel ? `<span class="meta-item">Key: ${escHtml(keyLabel)}</span>` : ""}
                ${origKeyLabel ? `<span class="meta-item orig-key">${origKeyLabel}</span>` : ""}
                ${leadSheet.meter ? `<span class="meta-item">Time: ${leadSheet.meter}</span>` : ""}
                ${capoLabel ? `<span class="capo-badge">${capoLabel}</span>` : ""}
                ${isNashville ? `<span class="format-badge">Nashville</span>` : ""}
              </div>
              ${item.notes ? `<div class="song-notes">${escHtml(item.notes)}</div>` : ""}
              ${wasTransposed ? `<div class="transpose-legend">
                <span><span class="legend-swatch legend-orig"></span>Original (${escHtml(originalKey)})</span>
                <span><span class="legend-swatch legend-new"></span>Transposed (${escHtml(transposedKey)})</span>
              </div>` : ""}
            </div>
            ${nashvilleLegendHtml}
            ${sectionsHtml}
          </div>`;
      }

      const setTitle = data.setTitle || "Worship Set";
      const setDate = data.setDate
        ? new Date(data.setDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
        : "";

      const html = `<!DOCTYPE html>
<html>
<head>
  <title>${escHtml(setTitle)} - Chord Charts</title>
  <style>
    @page { size: letter portrait; margin: 0.6in; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      color: #000; background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .cover {
      text-align: center;
      padding: 40px 0 30px;
      border-bottom: 3px solid #333;
      margin-bottom: 30px;
      page-break-after: always;
    }
    .cover-title { font-size: 32px; font-weight: bold; margin-bottom: 8px; }
    .cover-subtitle { font-size: 14px; color: #666; font-style: italic; }
    .cover-date { font-size: 16px; color: #444; margin-top: 12px; }
    .cover-service { font-size: 13px; color: #666; margin-top: 4px; }
    .toc { margin: 20px 0; }
    .toc-title { font-size: 18px; font-weight: bold; margin-bottom: 12px; }
    .toc-item {
      display: flex; justify-content: space-between; align-items: baseline;
      padding: 4px 0; border-bottom: 1px dotted #ccc; font-size: 13px;
    }
    .toc-num { font-weight: bold; color: #666; min-width: 24px; }
    .toc-song { flex: 1; }
    .toc-key { color: #666; font-size: 12px; }
    .song { margin-bottom: 20px; }
    .song-header {
      text-align: center;
      margin-bottom: 18px;
      padding-bottom: 10px;
      border-bottom: 2px solid #333;
    }
    .song-number {
      display: inline-block;
      background: #333; color: #fff;
      width: 28px; height: 28px; line-height: 28px;
      border-radius: 50%; font-size: 13px; font-weight: bold;
      margin-bottom: 6px;
    }
    .song-title { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
    .song-meta {
      display: flex; justify-content: center; gap: 16px;
      font-size: 12px; color: #444; margin-top: 4px;
    }
    .meta-item { font-weight: 600; }
    .orig-key { font-weight: normal; font-style: italic; color: #888; }
    .capo-badge {
      background: #fef3c7; color: #92400e; padding: 2px 8px;
      border-radius: 4px; font-weight: 600; border: 1px solid #fcd34d;
    }
    .song-notes {
      font-size: 11px; color: #888; font-style: italic;
      margin-top: 6px;
    }
    .section { margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid; }
    .section-label {
      font-size: 12px; font-weight: bold; text-transform: uppercase;
      letter-spacing: 1px; color: #444; margin-bottom: 4px;
      padding-bottom: 2px; border-bottom: 1px solid #ddd;
    }
    .lead-line { margin-bottom: 2px; }
    .chord-line-orig {
      font-family: 'Courier New', monospace;
      font-size: 10px; font-weight: normal; color: #999;
      line-height: 1.3; margin: 0; white-space: pre;
      letter-spacing: 0.3px;
    }
    .chord-line {
      font-family: 'Courier New', monospace;
      font-size: 12px; font-weight: bold; color: #1a56db;
      line-height: 1.4; margin: 0; white-space: pre;
    }
    .transpose-legend {
      display: flex; align-items: center; gap: 12px;
      font-size: 10px; color: #888; margin-top: 8px;
      justify-content: center;
    }
    .legend-swatch {
      display: inline-block; width: 10px; height: 3px;
      border-radius: 1px; margin-right: 4px; vertical-align: middle;
    }
    .legend-orig { background: #999; }
    .legend-new { background: #1a56db; }
    .format-badge {
      background: #ede9fe; color: #5b21b6; padding: 2px 8px;
      border-radius: 4px; font-weight: 600; border: 1px solid #c4b5fd;
      font-size: 11px;
    }
    .nashville-legend {
      background: #f8f7ff; border: 1px solid #e0ddf5;
      border-radius: 6px; padding: 8px 12px; margin-bottom: 16px;
    }
    .nashville-legend-title {
      font-size: 10px; font-weight: bold; text-transform: uppercase;
      letter-spacing: 0.5px; color: #5b21b6; margin-bottom: 4px;
    }
    .nashville-legend-items {
      display: flex; flex-wrap: wrap; gap: 6px 14px;
    }
    .nashville-legend-item {
      font-size: 11px; color: #444; font-family: 'Courier New', monospace;
    }
    .nashville-legend-item strong { color: #1a56db; }
    .lyrics-line {
      font-family: 'Georgia', serif;
      font-size: 13px; line-height: 1.4; margin: 0 0 4px 0;
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 20px; padding-top: 8px;
      border-top: 1px solid #ccc; text-align: center;
      font-size: 9px; color: #999;
    }
  </style>
</head>
<body>
  <div class="cover">
    <div class="cover-title">${escHtml(setTitle)}</div>
    <div class="cover-subtitle">Chord Charts &bull; Lead Sheets${isNashville ? " &bull; Nashville Numbers" : ""}</div>
    ${setDate ? `<div class="cover-date">${setDate}</div>` : ""}
    ${data.serviceType ? `<div class="cover-service">${escHtml(data.serviceType)}</div>` : ""}
    <div class="toc">
      <div class="toc-title">Set List</div>
      ${songItems.map((item, idx) => {
        const k = item.songKey || detectKeyFromABC(item.abc!) || item.songKeySignature || "";
        return `<div class="toc-item">
          <span class="toc-num">${idx + 1}.</span>
          <span class="toc-song">${escHtml(item.title)}</span>
          ${k ? `<span class="toc-key">Key: ${escHtml(k)}</span>` : ""}
        </div>`;
      }).join("")}
    </div>
  </div>
  ${allSongsHtml}
  <div class="footer">
    &copy; ${currentYear} ${escHtml(copyrightName)} &middot; Generated with Create Christian Music &middot; createchristianmusic.com
  </div>
</body>
</html>`;

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Pop-up blocked. Please allow pop-ups for this site.");
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => printWindow.focus();
      toast.success(`Chord charts ready for ${songItems.length} song${songItems.length > 1 ? "s" : ""}!`);
    } catch (err: any) {
      console.error("Print chord charts error:", err);
      toast.error("Failed to generate chord charts");
    } finally {
      setIsPrintingChords(false);
    }
  };

  // ─── Download Chord Charts as PDF ───
  const handleDownloadChordChartsPDF = async (transposeKeys: Record<number, string>, origKeys: Record<number, string>) => {
    setIsDownloadingPdf(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const result = await setAbcQuery.refetch();
      const data = result.data;
      if (!data) {
        toast.error("Failed to load song data for this set");
        return;
      }

      const songItems = data.items.filter((item) => item.abc && item.itemType === "song");
      if (songItems.length === 0) {
        toast.error("No songs with sheet music found in this set");
        return;
      }

      const currentYear = new Date().getFullYear();
      const copyrightName = user?.name || "Albert LaMotte";
      const isNashville = chordFormat === "nashville";
      const setTitle = data.setTitle || "Worship Set";
      const setDate = data.setDate
        ? new Date(data.setDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
        : "";

      // PDF constants
      const PW = 215.9; // Letter width mm
      const PH = 279.4; // Letter height mm
      const ML = 18;
      const MR = 18;
      const MT = 22;
      const MB = 22;
      const CW = PW - ML - MR;
      const SAFE_B = PH - MB - 10;
      const FOOTER_Y = PH - MB + 2;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

      const pgBreak = (y: number, needed: number): number => {
        if (y + needed > SAFE_B) { doc.addPage(); return MT; }
        return y;
      };

      // ─── Cover Page ───
      let y = MT + 30;
      doc.setFontSize(28);
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.text(setTitle, PW / 2, y, { align: "center" });
      y += 10;
      doc.setFontSize(12);
      doc.setTextColor(120, 120, 120);
      doc.setFont("helvetica", "italic");
      doc.text(`Chord Charts \u2022 Lead Sheets${isNashville ? " \u2022 Nashville Numbers" : ""}`, PW / 2, y, { align: "center" });
      y += 8;
      if (setDate) {
        doc.setFontSize(13);
        doc.setTextColor(60, 60, 60);
        doc.setFont("helvetica", "normal");
        doc.text(setDate, PW / 2, y, { align: "center" });
        y += 6;
      }
      if (data.serviceType) {
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(data.serviceType, PW / 2, y, { align: "center" });
        y += 6;
      }

      // Divider
      y += 6;
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      doc.line(ML + 20, y, PW - MR - 20, y);
      y += 10;

      // Table of contents
      doc.setFontSize(16);
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.text("Set List", ML, y);
      y += 8;

      for (let i = 0; i < songItems.length; i++) {
        const item = songItems[i];
        const tocKey = transposeKeys[item.id] || item.songKey || detectKeyFromABC(item.abc!) || item.songKeySignature || "";
        y = pgBreak(y, 7);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(`${i + 1}.`, ML, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        doc.text(item.title, ML + 10, y);
        if (tocKey) {
          doc.setFontSize(10);
          doc.setTextColor(120, 120, 120);
          doc.text(`Key: ${tocKey}`, PW - MR, y, { align: "right" });
        }
        // Dotted line
        doc.setDrawColor(200, 200, 200);
        doc.setLineDashPattern([1, 1], 0);
        const titleW = doc.getTextWidth(item.title);
        const keyW = tocKey ? doc.getTextWidth(`Key: ${tocKey}`) + 2 : 0;
        doc.line(ML + 10 + titleW + 2, y, PW - MR - keyW - 2, y);
        doc.setLineDashPattern([], 0);
        y += 6;
      }

      // ─── Song Pages ───
      for (let i = 0; i < songItems.length; i++) {
        const item = songItems[i];
        const abc = getTransposedAbc({ id: item.id, abc: item.abc! }, transposeKeys, origKeys);
        const songKey = detectKeyFromABC(abc) || item.songKeySignature || null;
        const leadSheet = extractLeadSheet(abc);
        if (!leadSheet || leadSheet.sections.length === 0) continue;

        const transposedKey = transposeKeys[item.id];
        const originalKey = origKeys[item.id];
        const wasTransposed = transposedKey && originalKey && transposedKey !== originalKey;

        // Extract original lead sheet for dual-chord comparison
        const origLeadSheet = wasTransposed ? extractLeadSheet(item.abc!) : null;
        const origChordLinesPdf: string[] = [];
        if (origLeadSheet) {
          for (const sec of origLeadSheet.sections) {
            for (const ln of sec.lines) {
              origChordLinesPdf.push(ln.chords || "");
            }
          }
        }

        const chords = extractChordsFromABC(abc);
        let capoLabel = "";
        if (songKey && chords.length > 0) {
          const best = getBestCapoPositions(songKey, chords, 1);
          if (best.length > 0 && best[0].fret > 0) {
            capoLabel = `Capo: Fret ${best[0].fret} (play in ${best[0].playKey})`;
          }
        }
        const keyLabel = transposedKey || item.songKey || songKey || "";

        // New page for each song
        doc.addPage();
        y = MT;

        // Song number badge
        doc.setFillColor(50, 50, 50);
        doc.circle(PW / 2, y + 3, 5, "F");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text(`${i + 1}`, PW / 2, y + 4.5, { align: "center" });
        y += 12;

        // Song title
        doc.setFontSize(22);
        doc.setTextColor(30, 30, 30);
        doc.setFont("helvetica", "bold");
        doc.text(item.title, PW / 2, y, { align: "center" });
        y += 7;

        // Meta line (key, time, capo)
        const metaParts: string[] = [];
        if (keyLabel) metaParts.push(`Key: ${keyLabel}`);
        if (wasTransposed) metaParts.push(`(orig: ${originalKey})`);
        if (leadSheet.meter) metaParts.push(`Time: ${leadSheet.meter}`);
        if (metaParts.length > 0 || capoLabel) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80, 80, 80);
          const metaStr = metaParts.join("  \u2022  ");
          if (metaStr) {
            doc.text(metaStr, PW / 2, y, { align: "center" });
            y += 5;
          }
          if (capoLabel) {
            // Capo badge
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            const capW = doc.getTextWidth(capoLabel) + 8;
            const capX = (PW - capW) / 2;
            doc.setFillColor(254, 243, 199);
            doc.setDrawColor(252, 211, 77);
            doc.roundedRect(capX, y - 3.5, capW, 6, 1.5, 1.5, "FD");
            doc.setTextColor(146, 64, 14);
            doc.text(capoLabel, PW / 2, y + 0.5, { align: "center" });
            y += 6;
          }
        }

        // Notes
        if (item.notes) {
          doc.setFontSize(9);
          doc.setTextColor(140, 140, 140);
          doc.setFont("helvetica", "italic");
          doc.text(item.notes, PW / 2, y, { align: "center" });
          y += 5;
        }

        // Transpose legend in PDF
        if (wasTransposed) {
          y += 2;
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          // Original legend
          doc.setFillColor(170, 170, 170);
          doc.rect(PW / 2 - 42, y - 1.5, 8, 2, "F");
          doc.setTextColor(140, 140, 140);
          doc.text(`Original (${originalKey})`, PW / 2 - 32, y);
          // Transposed legend
          doc.setFillColor(26, 86, 219);
          doc.rect(PW / 2 + 10, y - 1.5, 8, 2, "F");
          doc.setTextColor(26, 86, 219);
          doc.text(`Transposed (${transposedKey})`, PW / 2 + 20, y);
          y += 5;
        }

        // Nashville format badge
        if (isNashville) {
          y += 1;
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          const nBadge = "Nashville Numbers";
          const nBadgeW = doc.getTextWidth(nBadge) + 8;
          const nBadgeX = (PW - nBadgeW) / 2;
          doc.setFillColor(237, 233, 254);
          doc.setDrawColor(196, 181, 253);
          doc.roundedRect(nBadgeX, y - 3.5, nBadgeW, 6, 1.5, 1.5, "FD");
          doc.setTextColor(91, 33, 182);
          doc.text(nBadge, PW / 2, y + 0.5, { align: "center" });
          y += 6;
        }

        // Nashville legend
        if (isNashville && songKey) {
          const legend = getNashvilleLegend(songKey);
          if (legend.length > 0) {
            y += 2;
            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(91, 33, 182);
            doc.text(`NASHVILLE REFERENCE (KEY OF ${songKey.toUpperCase()})`, ML, y);
            y += 4;
            doc.setFontSize(8);
            doc.setFont("courier", "normal");
            let lx = ML;
            for (const l of legend) {
              const txt = `${l.number} = ${l.chord}`;
              const tw = doc.getTextWidth(txt) + 6;
              if (lx + tw > PW - MR) { lx = ML; y += 4; }
              doc.setTextColor(26, 86, 219);
              doc.setFont("courier", "bold");
              doc.text(l.number, lx, y);
              const nw = doc.getTextWidth(l.number);
              doc.setTextColor(100, 100, 100);
              doc.setFont("courier", "normal");
              doc.text(` = ${l.chord}`, lx + nw, y);
              lx += tw;
            }
            y += 6;
          }
        }

        // Divider
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.4);
        doc.line(ML, y, PW - MR, y);
        y += 8;

        // Sections
        let pdfOrigLineIdx = 0;
        for (const section of leadSheet.sections) {
          // Section label
          if (section.label) {
            y = pgBreak(y, 12);
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            doc.setFont("helvetica", "bold");
            doc.text(section.label.toUpperCase(), ML, y);
            y += 2;
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.2);
            doc.line(ML, y, ML + doc.getTextWidth(section.label.toUpperCase()) + 4, y);
            y += 4;
          }

          for (const line of section.lines) {
            const origChordH = (wasTransposed && origChordLinesPdf[pdfOrigLineIdx]) ? 3.5 : 0;
            const chordH = line.chords ? 4.5 : 0;
            const lyricsH = line.lyrics ? 4.5 : 0;
            y = pgBreak(y, origChordH + chordH + lyricsH + 1);

            // Original chords (muted, smaller) when transposed
            if (wasTransposed && origChordLinesPdf[pdfOrigLineIdx]) {
              doc.setFontSize(8);
              doc.setTextColor(170, 170, 170);
              doc.setFont("courier", "normal");
              doc.text(origChordLinesPdf[pdfOrigLineIdx], ML, y);
              y += origChordH;
            }

            if (line.chords) {
              const displayChords = isNashville && songKey
                ? convertChordLineToNashville(line.chords, songKey)
                : line.chords;
              doc.setFontSize(10);
              doc.setTextColor(26, 86, 219); // Blue chords
              doc.setFont("courier", "bold");
              doc.text(displayChords, ML, y);
              y += chordH;
            }
            pdfOrigLineIdx++;
            if (line.lyrics) {
              doc.setFontSize(10);
              doc.setTextColor(50, 50, 50);
              doc.setFont("times", "normal");
              // Wrap long lyrics
              const wrapped = doc.splitTextToSize(line.lyrics, CW);
              for (const wl of wrapped) {
                y = pgBreak(y, 4.5);
                doc.text(wl, ML, y);
                y += 4.5;
              }
            }
            y += 1; // Small gap between lines
          }
          y += 4; // Gap between sections
        }
      }

      // ─── Footer on all pages ───
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.setFont("helvetica", "normal");
        doc.text(
          `\u00A9 ${currentYear} ${copyrightName} \u2022 Generated with Create Christian Music \u2022 createchristianmusic.com`,
          PW / 2, FOOTER_Y, { align: "center" }
        );
        doc.text(`Page ${p} of ${pageCount}`, PW - MR, FOOTER_Y, { align: "right" });
      }

      const safeTitle = setTitle.replace(/[^a-zA-Z0-9 ]/g, "").trim();
      doc.save(`${safeTitle} - Chord Charts.pdf`);
      toast.success(`PDF downloaded with ${songItems.length} chord chart${songItems.length > 1 ? "s" : ""}!`);
    } catch (err: any) {
      console.error("Download chord charts PDF error:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (setQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!worshipSet) {
    return (
      <div className="text-center py-20">
        <p className="text-white/50">Worship set not found.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={onBack} className="text-xs text-white/40 hover:text-white/60 mb-2 flex items-center gap-1">
            ← Back to Worship Sets
          </button>
          <h1 className="text-2xl font-bold text-white">{worshipSet.title}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {worshipSet.serviceType && (
              <Badge variant="outline" className="border-white/20 text-white/60">
                <Church className="w-3 h-3 mr-1" />
                {worshipSet.serviceType}
              </Badge>
            )}
            {worshipSet.liturgicalSeason && (
              <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                {worshipSet.liturgicalSeason}
              </Badge>
            )}
            {worshipSet.date && (
              <Badge variant="outline" className="border-white/20 text-white/60">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(worshipSet.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </Badge>
            )}
            <Badge variant="outline" className="border-white/20 text-white/60">
              <Clock className="w-3 h-3 mr-1" />
              {totalDuration} min total
            </Badge>
            <Badge variant="outline" className="border-white/20 text-white/60">
              <ListMusic className="w-3 h-3 mr-1" />
              {items.length} items
            </Badge>
          </div>
          {worshipSet.notes && (
            <p className="text-sm text-white/40 mt-2 max-w-2xl">{worshipSet.notes}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Dialog open={showSuggestDialog} onOpenChange={setShowSuggestDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                <Sparkles className="w-4 h-4" />
                AI Suggest
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  AI Worship Set Suggestion
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm text-white/50">
                  Let AI suggest a complete worship service flow based on your service type, season, and theme.
                  Items will be added to your current set.
                </p>
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1 block">Theme / Sermon Topic</label>
                  <Input
                    value={suggestTheme}
                    onChange={(e) => setSuggestTheme(e.target.value)}
                    placeholder="e.g., God's Faithfulness, Forgiveness, Hope"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1 block">Scripture Reading</label>
                  <Input
                    value={suggestScripture}
                    onChange={(e) => setSuggestScripture(e.target.value)}
                    placeholder="e.g., Psalm 23, Romans 8:28-39"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1 block">Desired Mood</label>
                  <Select value={suggestMood} onValueChange={setSuggestMood}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Select mood" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10">
                      {(constantsQuery.data?.worshipMoods ?? []).map((m) => (
                        <SelectItem key={m} value={m} className="text-white">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" className="border-white/10 text-white/60">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAISuggest} disabled={isSuggesting} className="gap-2">
                  {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isSuggesting ? "Generating..." : "Generate Suggestions"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            disabled={isPrintingChords || isDownloadingPdf || items.filter(i => i.songId).length === 0}
            onClick={() => openTransposeDialog("print")}
          >
            {isPrintingChords ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Print Chords
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            disabled={isPrintingChords || isDownloadingPdf || items.filter(i => i.songId).length === 0}
            onClick={() => openTransposeDialog("pdf")}
          >
            {isDownloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PDF
          </Button>
          <Button onClick={() => setShowAddItem(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Service Flow Timeline */}
      <Card className="bg-white/[0.03] border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
            <ListMusic className="w-4 h-4" />
            Service Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {items.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-white/40 mb-3">No items yet. Add songs, prayers, and readings to build your service flow.</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => setShowAddItem(true)} className="gap-1.5 border-white/10 text-white/60">
                  <Plus className="w-3 h-3" /> Add Manually
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowSuggestDialog(true)} className="gap-1.5 border-purple-500/30 text-purple-400">
                  <Sparkles className="w-3 h-3" /> AI Suggest
                </Button>
              </div>
            </div>
          )}

          {items.map((item, index) => {
            const config = ITEM_TYPE_CONFIG[item.itemType] || ITEM_TYPE_CONFIG.other;
            const Icon = config.icon;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
              >
                {/* Order number */}
                <span className="text-xs font-mono text-white/20 w-5 text-right shrink-0">
                  {index + 1}
                </span>

                {/* Type icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{item.title}</span>
                    {item.songKey && (
                      <Badge variant="outline" className="text-[10px] border-white/20 text-white/50 shrink-0">
                        Key: {item.songKey}
                      </Badge>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-xs text-white/30 truncate mt-0.5">{item.notes}</p>
                  )}
                </div>

                {/* Duration */}
                {item.duration && (
                  <span className="text-xs text-white/30 shrink-0">
                    {item.duration} min
                  </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => handleMoveItem(index, "up")}
                    disabled={index === 0}
                    className="p-1 rounded text-white/30 hover:text-white/60 disabled:opacity-20"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveItem(index, "down")}
                    disabled={index === items.length - 1}
                    className="p-1 rounded text-white/30 hover:text-white/60 disabled:opacity-20"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  {item.songId && (
                    <Link href={`/songs/${item.songId}`}>
                      <span className="p-1 rounded text-white/30 hover:text-purple-400">
                        <Music className="w-3.5 h-3.5" />
                      </span>
                    </Link>
                  )}
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1 rounded text-white/30 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Add Item Panel */}
      {showAddItem && (
        <Card className="bg-white/[0.03] border-purple-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                Add Service Item
              </span>
              <button onClick={() => setShowAddItem(false)} className="text-white/30 hover:text-white/60">
                ✕
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Item type selector */}
            <div>
              <label className="text-xs font-medium text-white/60 mb-2 block">Item Type</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(ITEM_TYPE_CONFIG).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setNewItemType(type)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        newItemType === type
                          ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                          : "border-white/10 text-white/50 hover:border-white/20"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-white/60 mb-1 block">Title *</label>
                <Input
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder={newItemType === "song" ? "Song title" : newItemType === "scripture" ? "e.g., Psalm 23:1-6" : "Item title"}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {newItemType === "song" && (
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1 block">Key</label>
                    <Input
                      value={newItemKey}
                      onChange={(e) => setNewItemKey(e.target.value)}
                      placeholder="e.g., G"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1 block">Duration (min)</label>
                  <Input
                    type="number"
                    value={newItemDuration}
                    onChange={(e) => setNewItemDuration(e.target.value)}
                    placeholder="5"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-white/60 mb-1 block">Notes for the team</label>
              <Input
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                placeholder="e.g., Start soft, build to full band at chorus"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddItem(false)} className="border-white/10 text-white/60">
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddItem} disabled={addItemMutation.isPending} className="gap-1.5">
                {addItemMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Add to Set
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-white/[0.03] border-white/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">{items.filter(i => i.itemType === "song").length}</div>
              <div className="text-xs text-white/40">Songs</div>
            </CardContent>
          </Card>
          <Card className="bg-white/[0.03] border-white/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">{totalDuration}</div>
              <div className="text-xs text-white/40">Total Minutes</div>
            </CardContent>
          </Card>
          <Card className="bg-white/[0.03] border-white/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {new Set(items.filter(i => i.songKey).map(i => i.songKey)).size}
              </div>
              <div className="text-xs text-white/40">Key Changes</div>
            </CardContent>
          </Card>
          <Card className="bg-white/[0.03] border-white/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">{items.length}</div>
              <div className="text-xs text-white/40">Total Items</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transpose Dialog */}
      <Dialog open={showTransposeDialog} onOpenChange={setShowTransposeDialog}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-amber-400" />
              {transposeMode === "print" ? "Print" : "Download"} Chord Charts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-white/50">
              Adjust the key for each song before {transposeMode === "print" ? "printing" : "downloading"}. Select a new key to transpose, or leave as-is.
            </p>
            <div className="space-y-2">
              {Object.entries(songOriginalKeys).map(([idStr, origKey]) => {
                const id = Number(idStr);
                const songItem = items.find(i => i.id === id) ||
                  (setAbcQuery.data?.items.find(i => i.id === id));
                const title = songItem?.title || `Song #${id}`;
                const currentTarget = songTransposeKeys[id] || origKey;
                const isTransposed = currentTarget !== origKey;
                return (
                  <div key={id} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{title}</div>
                      <div className="text-xs text-white/40">Original: {origKey}</div>
                    </div>
                    <Select
                      value={currentTarget}
                      onValueChange={(val) => setSongTransposeKeys(prev => ({ ...prev, [id]: val }))}
                    >
                      <SelectTrigger className={`w-24 h-8 text-xs ${
                        isTransposed
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                          : "bg-white/5 border-white/10 text-white"
                      }`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#222] border-white/10">
                        {COMMON_KEYS.map(k => (
                          <SelectItem key={k} value={k} className="text-white text-xs">
                            {k}{k === origKey ? " (orig)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
            {Object.entries(songTransposeKeys).some(([id, key]) => key !== songOriginalKeys[Number(id)]) && (
              <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                <Settings2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs text-amber-300">
                  {Object.entries(songTransposeKeys).filter(([id, key]) => key !== songOriginalKeys[Number(id)]).length} song(s) will be transposed
                </span>
              </div>
            )}

            {/* Chord Format Toggle */}
            <div className="pt-2 border-t border-white/5">
              <div className="text-xs text-white/50 mb-2">Chord Format</div>
              <div className="flex gap-1 p-0.5 rounded-lg bg-white/[0.03] border border-white/5">
                <button
                  onClick={() => setChordFormat("standard")}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                    chordFormat === "standard"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-white/50 hover:text-white/70 hover:bg-white/5"
                  }`}
                >
                  Standard (A, Bm, C#)
                </button>
                <button
                  onClick={() => setChordFormat("nashville")}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                    chordFormat === "nashville"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-white/50 hover:text-white/70 hover:bg-white/5"
                  }`}
                >
                  Nashville (1, 2m, 3)
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                // Reset all to original keys
                setSongTransposeKeys({ ...songOriginalKeys });
              }}
              className="text-white/60 border-white/10 hover:bg-white/5"
            >
              Reset All
            </Button>
            <Button
              onClick={async () => {
                setShowTransposeDialog(false);
                if (transposeMode === "print") {
                  await handlePrintChordCharts(songTransposeKeys, songOriginalKeys);
                } else {
                  await handleDownloadChordChartsPDF(songTransposeKeys, songOriginalKeys);
                }
              }}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              disabled={isPrintingChords || isDownloadingPdf}
            >
              {(isPrintingChords || isDownloadingPdf) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : transposeMode === "print" ? (
                <Printer className="w-4 h-4" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {transposeMode === "print" ? "Print" : "Download PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Main Page ─── */
export default function WorshipSetBuilder() {
  usePageMeta({
    title: "Worship Set Builder",
    description: "Plan church worship services with AI-powered song suggestions. Build service flows with hymns, prayers, and scripture readings.",
    keywords: "worship set builder, church service planner, worship setlist generator, praise song order, church music planning, worship leader tool, service flow builder, Sunday worship planner, church worship order, praise and worship set list",
    canonicalPath: "/worship",
  });

  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (!isAuthenticated) return null;

  return (
    <div className="container max-w-5xl py-8">
      {selectedSetId ? (
        <WorshipSetDetail
          setId={selectedSetId}
          onBack={() => setSelectedSetId(null)}
        />
      ) : (
        <WorshipSetList
          onSelect={setSelectedSetId}
          onCreate={() => setShowCreateDialog(true)}
        />
      )}

      <CreateWorshipSetDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={(id) => setSelectedSetId(id)}
      />
    </div>
  );
}

/** Escape HTML special characters */
function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
