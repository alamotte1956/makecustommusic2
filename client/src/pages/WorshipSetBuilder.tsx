import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus, Trash2, GripVertical, Music, BookOpen, Clock, ChevronRight,
  Sparkles, Loader2, Calendar, Church, ListMusic, Edit2, Copy,
  ArrowUp, ArrowDown, FileText, Cross, Mic, Heart, Hand, MessageSquare
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
