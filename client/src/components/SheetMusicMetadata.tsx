/**
 * Sheet Music Metadata Panel
 * 
 * Provides input fields for professional sheet music metadata following
 * Nashville production standards:
 * - Subtitle
 * - Copyright holder
 * - Writer(s) / Songwriter(s)
 * - Publisher
 * - Producer
 * - Phonographic rights (℗)
 * 
 * All fields are persisted to localStorage per-song and used in print outputs.
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export interface SheetMusicMetadataValues {
  subtitle: string;
  copyright: string;
  writer: string;
  publisher: string;
  producer: string;
  phonographic: string;
  ccli: string;
}

const DEFAULT_METADATA: SheetMusicMetadataValues = {
  subtitle: "",
  copyright: "",
  writer: "",
  publisher: "",
  producer: "",
  phonographic: "",
  ccli: "",
};

interface SheetMusicMetadataProps {
  songId: number;
  songTitle: string;
  onChange: (metadata: SheetMusicMetadataValues) => void;
}

function getStorageKey(songId: number): string {
  return `sheetMusicMetadata_${songId}`;
}

function getGlobalDefaultsKey(): string {
  return "sheetMusicMetadata_defaults";
}

export function SheetMusicMetadata({ songId, songTitle, onChange }: SheetMusicMetadataProps) {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  const [metadata, setMetadata] = useState<SheetMusicMetadataValues>(() => {
    // Try to load song-specific metadata first
    const songSpecific = localStorage.getItem(getStorageKey(songId));
    if (songSpecific) {
      try {
        return { ...DEFAULT_METADATA, ...JSON.parse(songSpecific) };
      } catch { /* fall through */ }
    }

    // Fall back to global defaults
    const globalDefaults = localStorage.getItem(getGlobalDefaultsKey());
    if (globalDefaults) {
      try {
        const defaults = JSON.parse(globalDefaults);
        return {
          ...DEFAULT_METADATA,
          ...defaults,
          subtitle: "", // subtitle is always song-specific
        };
      } catch { /* fall through */ }
    }

    // Default: use user's name for copyright and writer
    const userName = user?.name || "Albert LaMotte";
    return {
      ...DEFAULT_METADATA,
      copyright: `© ${currentYear} ${userName}`,
      writer: userName,
      publisher: "",
      producer: "",
      phonographic: `℗ ${currentYear} ${userName}`,
    };
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Notify parent of changes
  useEffect(() => {
    onChange(metadata);
  }, [metadata, onChange]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(getStorageKey(songId), JSON.stringify(metadata));
  }, [songId, metadata]);

  const handleChange = useCallback((field: keyof SheetMusicMetadataValues, value: string) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  }, []);

  const saveAsDefaults = useCallback(() => {
    // Save current values (except subtitle) as global defaults
    const { subtitle, ...defaults } = metadata;
    localStorage.setItem(getGlobalDefaultsKey(), JSON.stringify(defaults));
  }, [metadata]);

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden">
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-700 dark:text-amber-300" />
          <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Sheet Music Credits & Metadata
          </span>
          {metadata.writer && !isExpanded && (
            <span className="text-xs text-amber-600 dark:text-amber-400 ml-2">
              — {metadata.writer}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        )}
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-amber-200 dark:border-amber-700 pt-4">
          {/* Subtitle */}
          <div>
            <Label className="text-xs font-medium text-amber-800 dark:text-amber-200">
              Subtitle
            </Label>
            <Input
              value={metadata.subtitle}
              onChange={(e) => handleChange("subtitle", e.target.value)}
              placeholder="e.g., A Worship Anthem, From the Album..."
              className="mt-1 text-sm bg-white dark:bg-amber-900/50 border-amber-300 dark:border-amber-600"
            />
          </div>

          {/* Writer / Songwriter */}
          <div>
            <Label className="text-xs font-medium text-amber-800 dark:text-amber-200">
              Writer / Songwriter
            </Label>
            <Input
              value={metadata.writer}
              onChange={(e) => handleChange("writer", e.target.value)}
              placeholder="e.g., Albert LaMotte, John Smith"
              className="mt-1 text-sm bg-white dark:bg-amber-900/50 border-amber-300 dark:border-amber-600"
            />
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Multiple writers separated by commas
            </p>
          </div>

          {/* Publisher */}
          <div>
            <Label className="text-xs font-medium text-amber-800 dark:text-amber-200">
              Publisher
            </Label>
            <Input
              value={metadata.publisher}
              onChange={(e) => handleChange("publisher", e.target.value)}
              placeholder="e.g., Create Christian Music Publishing"
              className="mt-1 text-sm bg-white dark:bg-amber-900/50 border-amber-300 dark:border-amber-600"
            />
          </div>

          {/* Producer */}
          <div>
            <Label className="text-xs font-medium text-amber-800 dark:text-amber-200">
              Producer
            </Label>
            <Input
              value={metadata.producer}
              onChange={(e) => handleChange("producer", e.target.value)}
              placeholder="e.g., Albert LaMotte"
              className="mt-1 text-sm bg-white dark:bg-amber-900/50 border-amber-300 dark:border-amber-600"
            />
          </div>

          {/* CCLI Song Number */}
          <div>
            <Label className="text-xs font-medium text-amber-800 dark:text-amber-200">
              CCLI Song Number
            </Label>
            <Input
              value={metadata.ccli}
              onChange={(e) => handleChange("ccli", e.target.value)}
              placeholder="e.g., 1234567"
              className="mt-1 text-sm bg-white dark:bg-amber-900/50 border-amber-300 dark:border-amber-600"
            />
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Required for churches with a CCLI license. Find your song number at ccli.com
            </p>
          </div>

          {/* Two-column row: Copyright and Phonographic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Copyright (©) */}
            <div>
              <Label className="text-xs font-medium text-amber-800 dark:text-amber-200">
                Copyright ©
              </Label>
              <Input
                value={metadata.copyright}
                onChange={(e) => handleChange("copyright", e.target.value)}
                placeholder={`© ${currentYear} Your Name`}
                className="mt-1 text-sm bg-white dark:bg-amber-900/50 border-amber-300 dark:border-amber-600"
              />
            </div>

            {/* Phonographic Rights (℗) */}
            <div>
              <Label className="text-xs font-medium text-amber-800 dark:text-amber-200">
                Phonographic Rights ℗
              </Label>
              <Input
                value={metadata.phonographic}
                onChange={(e) => handleChange("phonographic", e.target.value)}
                placeholder={`℗ ${currentYear} Your Name`}
                className="mt-1 text-sm bg-white dark:bg-amber-900/50 border-amber-300 dark:border-amber-600"
              />
            </div>
          </div>

          {/* Save as Defaults Button */}
          <div className="flex justify-end pt-2 border-t border-amber-200 dark:border-amber-700">
            <Button
              variant="outline"
              size="sm"
              onClick={saveAsDefaults}
              className="text-xs border-amber-300 dark:border-amber-600 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-800"
            >
              Save as Default for All Songs
            </Button>
          </div>

          <p className="text-xs text-amber-600 dark:text-amber-400">
            These credits appear on all printed and exported sheet music following Nashville production standards.
          </p>
        </div>
      )}
    </div>
  );
}
