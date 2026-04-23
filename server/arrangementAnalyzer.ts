/**
 * Arrangement Analyzer
 * 
 * Analyzes a song's characteristics and determines:
 * - What instruments should be included in the arrangement
 * - What vocal parts are needed (Lead, Harmony 1, Harmony 2, etc.)
 * - The overall instrumentation based on genre and mood
 */

import { invokeLLM } from "./_core/llm";

export interface ArrangementPart {
  name: string;
  type: "vocal" | "instrument";
  instrument?: string;
  clef: "treble" | "bass" | "alto";
  range: {
    low: number;  // MIDI note
    high: number; // MIDI note
  };
  description: string;
  voiceType?: "soprano" | "alto" | "tenor" | "bass"; // For vocals
}

export interface ArrangementAnalysis {
  songTitle: string;
  genre: string;
  mood: string;
  tempo: number;
  timeSignature: string;
  keySignature: string;
  parts: ArrangementPart[];
  arrangementStyle: string;
  description: string;
}

const INSTRUMENT_RANGES = {
  soprano: { low: 60, high: 84 },      // C4 to C6
  alto: { low: 55, high: 79 },         // G3 to G5
  tenor: { low: 48, high: 72 },        // C3 to C5
  bass: { low: 41, high: 65 },         // E2 to F4
  
  piano: { low: 21, high: 108 },       // A0 to C8
  guitar: { low: 40, high: 84 },       // E2 to C6
  bass_guitar: { low: 28, high: 55 },  // E1 to G3
  violin: { low: 55, high: 103 },      // G3 to G7
  cello: { low: 36, high: 84 },        // C2 to C6
  flute: { low: 60, high: 96 },        // C4 to C7
  clarinet: { low: 50, high: 103 },    // D3 to G7
  trumpet: { low: 52, high: 88 },      // E3 to E6
  trombone: { low: 40, high: 72 },     // E2 to C5
  drums: { low: 0, high: 0 },          // Percussion
};

export class ArrangementAnalyzer {
  /**
   * Analyze a song and determine the arrangement
   */
  static async analyzeSong(
    songTitle: string,
    genre: string,
    mood: string,
    tempo: number,
    keySignature: string,
    timeSignature: string = "4/4",
    lyrics?: string
  ): Promise<ArrangementAnalysis> {
    const prompt = `You are a professional music arranger. Analyze this song and create a detailed arrangement.

Song Details:
- Title: ${songTitle}
- Genre: ${genre}
- Mood: ${mood}
- Tempo: ${tempo} BPM
- Key: ${keySignature}
- Time Signature: ${timeSignature}
${lyrics ? `- Lyrics/Theme: ${lyrics}` : ""}

Based on these characteristics, determine:

1. What instruments should be in this arrangement? (Consider genre conventions and mood)
2. What vocal parts are needed? (Lead vocal, Harmony 1, Harmony 2, etc.)
3. What is the overall arrangement style?

Respond in this exact JSON format:
{
  "arrangementStyle": "description of overall arrangement approach",
  "vocalParts": [
    {
      "name": "Lead Vocal",
      "voiceType": "soprano|alto|tenor|bass",
      "range": "describe the vocal range",
      "description": "role in the arrangement"
    }
  ],
  "instruments": [
    {
      "name": "instrument name",
      "role": "description of what this instrument does",
      "range": "describe the range"
    }
  ],
  "reasoning": "explain why these parts work for this song"
}`;

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a professional music arranger with deep knowledge of orchestration, harmony, and music production. Respond only with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const content = response.choices[0].message.content;
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
      const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error("Could not parse arrangement analysis from LLM response");
      }

      const analysis = JSON.parse(jsonMatch![0]);
      
      return this.buildArrangement(
        songTitle,
        genre,
        mood,
        tempo,
        keySignature,
        timeSignature,
        analysis
      );
    } catch (error) {
      console.error("Error analyzing arrangement:", error);
      // Return default arrangement if analysis fails
      return this.getDefaultArrangement(songTitle, genre, mood, tempo, keySignature, timeSignature);
    }
  }

  /**
   * Build arrangement from LLM analysis
   */
  private static buildArrangement(
    songTitle: string,
    genre: string,
    mood: string,
    tempo: number,
    keySignature: string,
    timeSignature: string,
    analysis: any
  ): ArrangementAnalysis {
    const parts: ArrangementPart[] = [];

    // Add vocal parts
    if (analysis.vocalParts && Array.isArray(analysis.vocalParts)) {
      for (const vocalPart of analysis.vocalParts) {
        const voiceType = vocalPart.voiceType || "soprano";
        const voiceKey = voiceType as keyof typeof INSTRUMENT_RANGES;
        const range = INSTRUMENT_RANGES[voiceKey] || INSTRUMENT_RANGES.soprano;

        parts.push({
          name: vocalPart.name,
          type: "vocal",
          clef: this.getClefForVoice(voiceType),
          range,
          description: vocalPart.description || "",
          voiceType: voiceType as any
        });
      }
    }

    // Add instrumental parts
    if (analysis.instruments && Array.isArray(analysis.instruments)) {
      for (const instrument of analysis.instruments) {
        const instrumentName = instrument.name.toLowerCase();
        const instrumentKey = instrumentName as keyof typeof INSTRUMENT_RANGES;
        const range = INSTRUMENT_RANGES[instrumentKey] || INSTRUMENT_RANGES.piano;

        parts.push({
          name: instrument.name,
          type: "instrument",
          instrument: instrument.name,
          clef: this.getClefForInstrument(instrumentName),
          range,
          description: instrument.role || ""
        });
      }
    }

    return {
      songTitle,
      genre,
      mood,
      tempo,
      timeSignature,
      keySignature,
      parts,
      arrangementStyle: analysis.arrangementStyle || "Professional arrangement",
      description: analysis.reasoning || ""
    };
  }

  /**
   * Get default arrangement based on genre
   */
  private static getDefaultArrangement(
    songTitle: string,
    genre: string,
    mood: string,
    tempo: number,
    keySignature: string,
    timeSignature: string
  ): ArrangementAnalysis {
    const parts: ArrangementPart[] = [];

    // Always include lead vocal
    parts.push({
      name: "Lead Vocal",
      type: "vocal",
      clef: "treble",
      range: INSTRUMENT_RANGES.soprano,
      description: "Main melody and lyrics",
      voiceType: "soprano"
    });

    // Genre-specific arrangements
    switch (genre.toLowerCase()) {
      case "pop":
      case "contemporary":
        parts.push(
          {
            name: "Harmony Vocal 1",
            type: "vocal",
            clef: "treble",
            range: INSTRUMENT_RANGES.alto,
            description: "Supporting harmony",
            voiceType: "alto"
          },
          {
            name: "Piano",
            type: "instrument",
            instrument: "Piano",
            clef: "treble",
            range: INSTRUMENT_RANGES.piano,
            description: "Harmonic foundation and accompaniment"
          },
          {
            name: "Bass",
            type: "instrument",
            instrument: "Bass Guitar",
            clef: "bass",
            range: INSTRUMENT_RANGES.bass_guitar,
            description: "Bass line"
          },
          {
            name: "Drums",
            type: "instrument",
            instrument: "Drums",
            clef: "treble",
            range: { low: 0, high: 0 },
            description: "Rhythm and percussion"
          }
        );
        break;

      case "worship":
      case "gospel":
      case "praise":
        parts.push(
          {
            name: "Harmony Vocal 1",
            type: "vocal",
            clef: "treble",
            range: INSTRUMENT_RANGES.alto,
            description: "Alto harmony",
            voiceType: "alto"
          },
          {
            name: "Harmony Vocal 2",
            type: "vocal",
            clef: "treble",
            range: INSTRUMENT_RANGES.tenor,
            description: "Tenor harmony",
            voiceType: "tenor"
          },
          {
            name: "Harmony Vocal 3",
            type: "vocal",
            clef: "bass",
            range: INSTRUMENT_RANGES.bass,
            description: "Bass harmony",
            voiceType: "bass"
          },
          {
            name: "Piano",
            type: "instrument",
            instrument: "Piano",
            clef: "treble",
            range: INSTRUMENT_RANGES.piano,
            description: "Harmonic foundation"
          },
          {
            name: "Guitar",
            type: "instrument",
            instrument: "Guitar",
            clef: "treble",
            range: INSTRUMENT_RANGES.guitar,
            description: "Melodic accompaniment"
          },
          {
            name: "Bass",
            type: "instrument",
            instrument: "Bass Guitar",
            clef: "bass",
            range: INSTRUMENT_RANGES.bass_guitar,
            description: "Bass line"
          },
          {
            name: "Drums",
            type: "instrument",
            instrument: "Drums",
            clef: "treble",
            range: { low: 0, high: 0 },
            description: "Rhythm"
          }
        );
        break;

      case "classical":
      case "orchestral":
        parts.push(
          {
            name: "Violin I",
            type: "instrument",
            instrument: "Violin",
            clef: "treble",
            range: INSTRUMENT_RANGES.violin,
            description: "First violin section"
          },
          {
            name: "Violin II",
            type: "instrument",
            instrument: "Violin",
            clef: "treble",
            range: INSTRUMENT_RANGES.violin,
            description: "Second violin section"
          },
          {
            name: "Cello",
            type: "instrument",
            instrument: "Cello",
            clef: "bass",
            range: INSTRUMENT_RANGES.cello,
            description: "Cello section"
          },
          {
            name: "Piano",
            type: "instrument",
            instrument: "Piano",
            clef: "treble",
            range: INSTRUMENT_RANGES.piano,
            description: "Piano accompaniment"
          }
        );
        break;

      case "jazz":
        parts.push(
          {
            name: "Piano",
            type: "instrument",
            instrument: "Piano",
            clef: "treble",
            range: INSTRUMENT_RANGES.piano,
            description: "Harmonic foundation and comping"
          },
          {
            name: "Bass",
            type: "instrument",
            instrument: "Bass Guitar",
            clef: "bass",
            range: INSTRUMENT_RANGES.bass_guitar,
            description: "Walking bass line"
          },
          {
            name: "Drums",
            type: "instrument",
            instrument: "Drums",
            clef: "treble",
            range: { low: 0, high: 0 },
            description: "Swing rhythm"
          }
        );
        break;

      default:
        parts.push(
          {
            name: "Piano",
            type: "instrument",
            instrument: "Piano",
            clef: "treble",
            range: INSTRUMENT_RANGES.piano,
            description: "Accompaniment"
          },
          {
            name: "Guitar",
            type: "instrument",
            instrument: "Guitar",
            clef: "treble",
            range: INSTRUMENT_RANGES.guitar,
            description: "Accompaniment"
          }
        );
    }

    return {
      songTitle,
      genre,
      mood,
      tempo,
      timeSignature,
      keySignature,
      parts,
      arrangementStyle: `Professional ${genre} arrangement`,
      description: `Arrangement optimized for ${genre} style with ${mood} mood`
    };
  }

  /**
   * Get appropriate clef for vocal type
   */
  private static getClefForVoice(voiceType: string): "treble" | "bass" | "alto" {
    switch (voiceType) {
      case "soprano":
      case "alto":
        return "treble";
      case "tenor":
        return "treble"; // Tenor typically written in treble with 8va notation
      case "bass":
        return "bass";
      default:
        return "treble";
    }
  }

  /**
   * Get appropriate clef for instrument
   */
  private static getClefForInstrument(instrument: string): "treble" | "bass" | "alto" {
    const lowerInstrument = instrument.toLowerCase();
    
    if (lowerInstrument.includes("bass") || lowerInstrument.includes("cello") || lowerInstrument.includes("trombone")) {
      return "bass";
    }
    
    if (lowerInstrument.includes("viola")) {
      return "alto";
    }
    
    return "treble";
  }
}

export default ArrangementAnalyzer;
