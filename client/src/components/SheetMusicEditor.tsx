import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { AlertCircle, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  parseAbcForEditing,
  reconstructAbcFromEdits,
  type AbcEditableSection,
} from "@/lib/abcEditor";

interface SheetMusicEditorProps {
  abc: string;
  onSave: (updatedAbc: string) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function SheetMusicEditor({
  abc,
  onSave,
  onCancel,
  isSaving = false,
}: SheetMusicEditorProps) {
  const [editState, setEditState] = useState(() => parseAbcForEditing(abc));
  const [hasChanges, setHasChanges] = useState(false);

  const handleSectionChange = (lineNumber: number, newContent: string) => {
    setEditState((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.lineNumber === lineNumber ? { ...s, content: newContent } : s,
      ),
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      const updatedAbc = reconstructAbcFromEdits(abc, editState.sections);
      await onSave(updatedAbc);
      setHasChanges(false);
      toast.success("Sheet music updated successfully");
    } catch (error) {
      toast.error("Failed to save changes");
      console.error(error);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (
        confirm(
          "You have unsaved changes. Are you sure you want to discard them?",
        )
      ) {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Edit Sheet Music</h3>
        {hasChanges && (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <AlertCircle className="w-4 h-4" />
            Unsaved changes
          </div>
        )}
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {editState.sections.map((section) => (
          <div key={section.lineNumber} className="space-y-2">
            <label className="text-sm font-medium capitalize">
              {section.type === "lyric" ? "Lyrics" : section.type}
            </label>

            {section.type === "lyric" || section.type === "chord" ? (
              <Input
                value={section.content}
                onChange={(e) =>
                  handleSectionChange(section.lineNumber, e.target.value)
                }
                placeholder={`Enter ${section.type}...`}
                className="font-mono text-sm"
              />
            ) : (
              <Input
                value={section.content}
                onChange={(e) =>
                  handleSectionChange(section.lineNumber, e.target.value)
                }
                placeholder={`Enter ${section.type}...`}
              />
            )}
          </div>
        ))}

        {editState.sections.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No editable content found in this sheet music.</p>
            <p className="text-sm mt-2">
              Only lyrics and chords can be edited.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={isSaving}
          className="gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
