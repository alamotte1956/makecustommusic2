/**
 * Instrumentation Customizer Component
 * Allows users to select arrangement presets and customize individual instruments
 */

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, Settings2, Zap, Volume2 } from "lucide-react";
import { toast } from "sonner";

export interface InstrumentationPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  parts: {
    [key: string]: {
      enabled: boolean;
      prominence: number; // 1-10 scale
    };
  };
}

export interface InstrumentationConfig {
  presetId?: string;
  parts: {
    [key: string]: {
      enabled: boolean;
      prominence: number;
    };
  };
}

// Available instruments and vocal parts
const AVAILABLE_PARTS = {
  // Vocal parts
  "Lead Vocal": { category: "vocals", type: "vocal", default: true },
  "Harmony Vocal 1": { category: "vocals", type: "vocal", default: false },
  "Harmony Vocal 2": { category: "vocals", type: "vocal", default: false },
  "Harmony Vocal 3": { category: "vocals", type: "vocal", default: false },
  
  // Instruments
  "Piano": { category: "instruments", type: "instrument", default: true },
  "Guitar": { category: "instruments", type: "instrument", default: true },
  "Bass Guitar": { category: "instruments", type: "instrument", default: true },
  "Drums": { category: "instruments", type: "instrument", default: true },
  "Violin": { category: "instruments", type: "instrument", default: false },
  "Cello": { category: "instruments", type: "instrument", default: false },
  "Flute": { category: "instruments", type: "instrument", default: false },
  "Trumpet": { category: "instruments", type: "instrument", default: false },
  "Trombone": { category: "instruments", type: "instrument", default: false },
};

// Preset configurations
const PRESETS: InstrumentationPreset[] = [
  {
    id: "pop",
    name: "Pop",
    description: "Modern pop arrangement with lead, harmony, piano, guitar, bass, and drums",
    icon: "🎤",
    parts: {
      "Lead Vocal": { enabled: true, prominence: 10 },
      "Harmony Vocal 1": { enabled: true, prominence: 7 },
      "Harmony Vocal 2": { enabled: false, prominence: 5 },
      "Harmony Vocal 3": { enabled: false, prominence: 5 },
      "Piano": { enabled: true, prominence: 8 },
      "Guitar": { enabled: true, prominence: 8 },
      "Bass Guitar": { enabled: true, prominence: 7 },
      "Drums": { enabled: true, prominence: 8 },
      "Violin": { enabled: false, prominence: 0 },
      "Cello": { enabled: false, prominence: 0 },
      "Flute": { enabled: false, prominence: 0 },
      "Trumpet": { enabled: false, prominence: 0 },
      "Trombone": { enabled: false, prominence: 0 },
    },
  },
  {
    id: "worship",
    name: "Worship",
    description: "Full SATB vocals with piano, guitar, bass, and drums for worship settings",
    icon: "✨",
    parts: {
      "Lead Vocal": { enabled: true, prominence: 10 },
      "Harmony Vocal 1": { enabled: true, prominence: 8 },
      "Harmony Vocal 2": { enabled: true, prominence: 8 },
      "Harmony Vocal 3": { enabled: true, prominence: 8 },
      "Piano": { enabled: true, prominence: 8 },
      "Guitar": { enabled: true, prominence: 7 },
      "Bass Guitar": { enabled: true, prominence: 7 },
      "Drums": { enabled: true, prominence: 7 },
      "Violin": { enabled: false, prominence: 0 },
      "Cello": { enabled: false, prominence: 0 },
      "Flute": { enabled: false, prominence: 0 },
      "Trumpet": { enabled: false, prominence: 0 },
      "Trombone": { enabled: false, prominence: 0 },
    },
  },
  {
    id: "classical",
    name: "Classical",
    description: "Orchestral arrangement with strings, woodwinds, and brass",
    icon: "🎻",
    parts: {
      "Lead Vocal": { enabled: false, prominence: 0 },
      "Harmony Vocal 1": { enabled: false, prominence: 0 },
      "Harmony Vocal 2": { enabled: false, prominence: 0 },
      "Harmony Vocal 3": { enabled: false, prominence: 0 },
      "Piano": { enabled: true, prominence: 9 },
      "Guitar": { enabled: false, prominence: 0 },
      "Bass Guitar": { enabled: false, prominence: 0 },
      "Drums": { enabled: false, prominence: 0 },
      "Violin": { enabled: true, prominence: 9 },
      "Cello": { enabled: true, prominence: 8 },
      "Flute": { enabled: true, prominence: 7 },
      "Trumpet": { enabled: true, prominence: 7 },
      "Trombone": { enabled: true, prominence: 6 },
    },
  },
  {
    id: "jazz",
    name: "Jazz",
    description: "Jazz ensemble with piano, guitar, bass, drums, and brass",
    icon: "🎷",
    parts: {
      "Lead Vocal": { enabled: false, prominence: 0 },
      "Harmony Vocal 1": { enabled: false, prominence: 0 },
      "Harmony Vocal 2": { enabled: false, prominence: 0 },
      "Harmony Vocal 3": { enabled: false, prominence: 0 },
      "Piano": { enabled: true, prominence: 9 },
      "Guitar": { enabled: true, prominence: 8 },
      "Bass Guitar": { enabled: true, prominence: 8 },
      "Drums": { enabled: true, prominence: 8 },
      "Violin": { enabled: false, prominence: 0 },
      "Cello": { enabled: false, prominence: 0 },
      "Flute": { enabled: false, prominence: 0 },
      "Trumpet": { enabled: true, prominence: 8 },
      "Trombone": { enabled: true, prominence: 7 },
    },
  },
  {
    id: "acoustic",
    name: "Acoustic",
    description: "Stripped-down acoustic arrangement with vocals and minimal instruments",
    icon: "🎸",
    parts: {
      "Lead Vocal": { enabled: true, prominence: 10 },
      "Harmony Vocal 1": { enabled: true, prominence: 8 },
      "Harmony Vocal 2": { enabled: false, prominence: 0 },
      "Harmony Vocal 3": { enabled: false, prominence: 0 },
      "Piano": { enabled: false, prominence: 0 },
      "Guitar": { enabled: true, prominence: 9 },
      "Bass Guitar": { enabled: true, prominence: 7 },
      "Drums": { enabled: false, prominence: 0 },
      "Violin": { enabled: false, prominence: 0 },
      "Cello": { enabled: false, prominence: 0 },
      "Flute": { enabled: false, prominence: 0 },
      "Trumpet": { enabled: false, prominence: 0 },
      "Trombone": { enabled: false, prominence: 0 },
    },
  },
];

interface InstrumentationCustomizerProps {
  onConfirm: (config: InstrumentationConfig) => void;
  isLoading?: boolean;
}

export default function InstrumentationCustomizer({
  onConfirm,
  isLoading = false,
}: InstrumentationCustomizerProps) {
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("pop");
  const [customConfig, setCustomConfig] = useState<InstrumentationConfig>(() => ({
    presetId: "pop",
    parts: PRESETS[0].parts,
  }));
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Count enabled parts
  const enabledPartCount = useMemo(() => {
    return Object.values(customConfig.parts).filter((p) => p.enabled).length;
  }, [customConfig.parts]);

  const handlePresetSelect = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      setCustomConfig({
        presetId,
        parts: { ...preset.parts },
      });
      setIsCustomMode(false);
    }
  };

  const handlePartToggle = (partName: string) => {
    setCustomConfig((prev) => ({
      ...prev,
      parts: {
        ...prev.parts,
        [partName]: {
          ...prev.parts[partName],
          enabled: !prev.parts[partName].enabled,
        },
      },
    }));
    setIsCustomMode(true);
  };

  const handleProminenceChange = (partName: string, value: number) => {
    setCustomConfig((prev) => ({
      ...prev,
      parts: {
        ...prev.parts,
        [partName]: {
          ...prev.parts[partName],
          prominence: value,
        },
      },
    }));
    setIsCustomMode(true);
  };

  const handleConfirm = () => {
    if (enabledPartCount === 0) {
      toast.error("Please select at least one part");
      return;
    }
    onConfirm(customConfig);
    setOpen(false);
  };

  const currentPreset = PRESETS.find((p) => p.id === selectedPreset);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Customize Instruments
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-purple-600" />
            Instrumentation Customizer
          </DialogTitle>
          <DialogDescription>
            Choose a preset or customize individual instruments and vocal parts
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="presets">Presets</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          {/* Presets Tab */}
          <TabsContent value="presets" className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {PRESETS.map((preset) => (
                <Card
                  key={preset.id}
                  className={`cursor-pointer transition-all ${
                    selectedPreset === preset.id && !isCustomMode
                      ? "ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950"
                      : "hover:border-purple-300"
                  }`}
                  onClick={() => handlePresetSelect(preset.id)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{preset.icon}</span>
                          <h4 className="font-semibold">{preset.name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{preset.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(preset.parts)
                            .filter(([_, config]) => config.enabled)
                            .map(([name]) => (
                              <Badge key={name} variant="secondary" className="text-xs">
                                {name}
                              </Badge>
                            ))}
                        </div>
                      </div>
                      <Checkbox
                        checked={selectedPreset === preset.id && !isCustomMode}
                        onChange={() => handlePresetSelect(preset.id)}
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Custom Tab */}
          <TabsContent value="custom" className="space-y-6">
            <div className="space-y-4">
              {/* Vocal Parts */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="text-lg">🎤</span>
                  Vocal Parts
                </h4>
                <div className="space-y-3 ml-6">
                  {Object.entries(AVAILABLE_PARTS)
                    .filter(([_, info]) => info.category === "vocals")
                    .map(([partName, _]) => (
                      <div key={partName} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={partName}
                            checked={customConfig.parts[partName]?.enabled || false}
                            onCheckedChange={() => handlePartToggle(partName)}
                          />
                          <Label htmlFor={partName} className="font-medium cursor-pointer flex-1">
                            {partName}
                          </Label>
                          {customConfig.parts[partName]?.enabled && (
                            <span className="text-xs text-muted-foreground">
                              Prominence: {customConfig.parts[partName]?.prominence || 5}
                            </span>
                          )}
                        </div>
                        {customConfig.parts[partName]?.enabled && (
                          <div className="flex items-center gap-3 ml-6">
                            <Volume2 className="h-4 w-4 text-muted-foreground" />
                            <Slider
                              value={[customConfig.parts[partName]?.prominence || 5]}
                              onValueChange={(value) =>
                                handleProminenceChange(partName, value[0])
                              }
                              min={1}
                              max={10}
                              step={1}
                              className="flex-1"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Instruments */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="text-lg">🎸</span>
                  Instruments
                </h4>
                <div className="space-y-3 ml-6">
                  {Object.entries(AVAILABLE_PARTS)
                    .filter(([_, info]) => info.category === "instruments")
                    .map(([partName, _]) => (
                      <div key={partName} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={partName}
                            checked={customConfig.parts[partName]?.enabled || false}
                            onCheckedChange={() => handlePartToggle(partName)}
                          />
                          <Label htmlFor={partName} className="font-medium cursor-pointer flex-1">
                            {partName}
                          </Label>
                          {customConfig.parts[partName]?.enabled && (
                            <span className="text-xs text-muted-foreground">
                              Prominence: {customConfig.parts[partName]?.prominence || 5}
                            </span>
                          )}
                        </div>
                        {customConfig.parts[partName]?.enabled && (
                          <div className="flex items-center gap-3 ml-6">
                            <Volume2 className="h-4 w-4 text-muted-foreground" />
                            <Slider
                              value={[customConfig.parts[partName]?.prominence || 5]}
                              onValueChange={(value) =>
                                handleProminenceChange(partName, value[0])
                              }
                              min={1}
                              max={10}
                              step={1}
                              className="flex-1"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Summary */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Selected Parts: <span className="text-purple-600 font-semibold">{enabledPartCount}</span>
              </p>
              {isCustomMode && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ✓ Custom configuration created
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || enabledPartCount === 0}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Generate with Selected Parts
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Import Loader2 icon
import { Loader2 } from "lucide-react";
