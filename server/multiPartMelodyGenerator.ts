/**
 * Multi-Part Melody Generator
 * 
 * Generates individual melodic lines for each instrument and vocal part
 * based on the main melody and harmonic structure.
 */

import { invokeLLM } from "./_core/llm";
import { ArrangementPart } from "./arrangementAnalyzer";

export interface MelodyLine {
  partName: string;
  partType: "vocal" | "instrument";
  voiceType?: string;
  clef: string;
  range: { low: number; high: number };
  abcNotation: string;
  description: string;
}

export class MultiPartMelodyGenerator {
  /**
   * Generate individual melody lines for each arrangement part
   */
  static async generateMultiPartMelodies(
    songTitle: string,
    mainMelody: string,
    chordProgression: string,
    tempo: number,
    keySignature: string,
    timeSignature: string,
    arrangementParts: ArrangementPart[],
    lyrics?: string
  ): Promise<MelodyLine[]> {
    const melodyLines: MelodyLine[] = [];

    for (const part of arrangementParts) {
      try {
        const melodyLine = await this.generatePartMelody(
          part,
          mainMelody,
          chordProgression,
          tempo,
          keySignature,
          timeSignature,
          lyrics
        );
        melodyLines.push(melodyLine);
      } catch (error) {
        console.error(`Error generating melody for ${part.name}:`, error);
        // Create a fallback melody
        melodyLines.push(this.createFallbackMelody(part, mainMelody));
      }
    }

    return melodyLines;
  }

  /**
   * Generate melody for a specific arrangement part
   */
  private static async generatePartMelody(
    part: ArrangementPart,
    mainMelody: string,
    chordProgression: string,
    tempo: number,
    keySignature: string,
    timeSignature: string,
    lyrics?: string
  ): Promise<MelodyLine> {
    const prompt = this.buildGenerationPrompt(
      part,
      mainMelody,
      chordProgression,
      tempo,
      keySignature,
      timeSignature,
      lyrics
    );

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a professional music arranger. Generate ABC notation for a specific part in a musical arrangement. 
            
ABC Notation Rules:
- Use standard ABC format (X:1, T:title, M:meter, L:unit_length, K:key)
- Use note names (C D E F G A B) and octave numbers (C, c, c')
- Use durations: whole=4, half=2, quarter=1, eighth=1/2, sixteenth=1/4
- Use rests: z for rest
- Use | for bar lines
- Keep melodies singable and playable within the specified range
- Respect the key signature and harmonic structure

Return ONLY the ABC notation, nothing else.`
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const content = response.choices[0].message.content;
      const abcNotation = typeof content === 'string' ? content : JSON.stringify(content);

      return {
        partName: part.name,
        partType: part.type,
        voiceType: part.voiceType,
        clef: part.clef,
        range: part.range,
        abcNotation: abcNotation.trim(),
        description: part.description
      };
    } catch (error) {
      console.error(`Error generating melody for ${part.name}:`, error);
      throw error;
    }
  }

  /**
   * Build the prompt for melody generation
   */
  private static buildGenerationPrompt(
    part: ArrangementPart,
    mainMelody: string,
    chordProgression: string,
    tempo: number,
    keySignature: string,
    timeSignature: string,
    lyrics?: string
  ): string {
    const rangeDescription = this.getRangeDescription(part.range);
    const partTypeDescription = this.getPartTypeDescription(part);

    let prompt = `Generate ABC notation for the following arrangement part:

Part Name: ${part.name}
Part Type: ${part.type}
${part.voiceType ? `Voice Type: ${part.voiceType}` : ""}
${part.instrument ? `Instrument: ${part.instrument}` : ""}
Clef: ${part.clef}
Range: ${rangeDescription} (MIDI notes ${part.range.low}-${part.range.high})
Description: ${part.description}

Song Details:
- Tempo: ${tempo} BPM
- Key: ${keySignature}
- Time Signature: ${timeSignature}

Main Melody (reference):
${mainMelody}

Chord Progression:
${chordProgression}

${lyrics ? `Lyrics:\n${lyrics}\n` : ""}

Guidelines:
1. ${partTypeDescription}
2. Stay within the specified range (${part.range.low}-${part.range.high})
3. Follow the harmonic structure of the chord progression
4. Create a musically coherent part that complements the main melody
5. Use appropriate rhythm patterns for the instrument/voice type
6. Ensure the part is playable/singable at ${tempo} BPM
7. Keep the part in ${keySignature} key

Generate the ABC notation for this part:`;

    return prompt;
  }

  /**
   * Get range description for a MIDI range
   */
  private static getRangeDescription(range: { low: number; high: number }): string {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const lowNote = noteNames[range.low % 12];
    const lowOctave = Math.floor(range.low / 12) - 1;
    const highNote = noteNames[range.high % 12];
    const highOctave = Math.floor(range.high / 12) - 1;

    return `${lowNote}${lowOctave} to ${highNote}${highOctave}`;
  }

  /**
   * Get specific generation instructions based on part type
   */
  private static getPartTypeDescription(part: ArrangementPart): string {
    if (part.type === "vocal") {
      switch (part.voiceType) {
        case "soprano":
          return "Generate a soprano vocal line with the highest notes, typically carrying the main melody or a countermelody.";
        case "alto":
          return "Generate an alto vocal line that provides harmonic support, typically in the upper-middle range.";
        case "tenor":
          return "Generate a tenor vocal line that provides harmonic support, typically in the middle range.";
        case "bass":
          return "Generate a bass vocal line that provides harmonic foundation, typically in the lower range.";
        default:
          return "Generate a vocal line that fits the voice type and provides harmonic support.";
      }
    } else {
      switch (part.instrument?.toLowerCase()) {
        case "piano":
          return "Generate a piano part with both melody and harmonic accompaniment, using appropriate voicings for the chord progression.";
        case "guitar":
          return "Generate a guitar part with fingerpicking patterns or strumming rhythms that complement the main melody.";
        case "bass guitar":
        case "bass":
          return "Generate a walking bass line or rhythmic bass pattern that outlines the chord progression.";
        case "violin":
          return "Generate a violin part with flowing melodic lines and appropriate bowing patterns.";
        case "cello":
          return "Generate a cello part with warm, resonant tones that provide harmonic support.";
        case "flute":
          return "Generate a flute part with flowing, lyrical lines that complement the main melody.";
        case "trumpet":
          return "Generate a trumpet part with bright, clear tones that add energy to the arrangement.";
        case "drums":
        case "percussion":
          return "Generate a drum/percussion pattern with appropriate rhythmic notation for the time signature and tempo.";
        default:
          return "Generate an instrumental part that fits the instrument and provides musical support.";
      }
    }
  }

  /**
   * Create a fallback melody if generation fails
   */
  private static createFallbackMelody(part: ArrangementPart, mainMelody: string): MelodyLine {
    let fallbackAbc = "";

    if (part.type === "vocal") {
      // For vocals, use a simplified version of the main melody
      fallbackAbc = this.transposeMelodyToRange(mainMelody, part.range);
    } else {
      // For instruments, create a simple accompaniment pattern
      fallbackAbc = this.createSimpleAccompaniment(part);
    }

    return {
      partName: part.name,
      partType: part.type,
      voiceType: part.voiceType,
      clef: part.clef,
      range: part.range,
      abcNotation: fallbackAbc,
      description: part.description
    };
  }

  /**
   * Transpose a melody to fit within a specific range
   */
  private static transposeMelodyToRange(melody: string, range: { low: number; high: number }): string {
    // Simple transposition: shift the melody to fit the range
    // This is a simplified implementation
    const midpoint = (range.low + range.high) / 2;
    const defaultMidpoint = 72; // C5

    const transposition = Math.round(midpoint - defaultMidpoint);

    // In a real implementation, we would parse the ABC and transpose each note
    // For now, return the original melody
    return melody;
  }

  /**
   * Create a simple accompaniment pattern for an instrument
   */
  private static createSimpleAccompaniment(part: ArrangementPart): string {
    const instrument = part.instrument?.toLowerCase() || "";

    if (instrument.includes("bass")) {
      // Simple walking bass pattern
      return "X:1\nT:Bass Line\nM:4/4\nL:1/4\nK:C\nC,2 D,2 | E,2 F,2 | G,2 A,2 | B,2 C2 |]";
    } else if (instrument.includes("drum") || instrument.includes("percussion")) {
      // Simple drum pattern
      return "X:1\nT:Drum Pattern\nM:4/4\nL:1/4\nK:C\nBD BD | BD BD | BD BD | BD BD |]";
    } else if (instrument.includes("guitar")) {
      // Simple chord strumming pattern
      return "X:1\nT:Guitar Accompaniment\nM:4/4\nL:1/4\nK:C\nCEGc | CEGc | CEGc | CEGc |]";
    } else if (instrument.includes("piano")) {
      // Simple chord accompaniment
      return "X:1\nT:Piano Accompaniment\nM:4/4\nL:1/4\nK:C\n[CEG]2 [CEG]2 | [CEG]2 [CEG]2 | [CEG]2 [CEG]2 | [CEG]2 [CEG]2 |]";
    } else {
      // Generic accompaniment
      return "X:1\nT:Accompaniment\nM:4/4\nL:1/4\nK:C\nC2 C2 | C2 C2 | C2 C2 | C2 C2 |]";
    }
  }
}

export default MultiPartMelodyGenerator;
