import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock LLM and sanitiser before importing the module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

vi.mock("./backgroundSheetMusic", () => ({
  sanitiseAbc: vi.fn((abc: string) => abc),
  validateAbc: vi.fn(() => null),
}));

import { generatePartAbc, generateAllPartAbcs, INSTRUMENT_PARTS, PART_NAMES } from "./multiPartAbcGenerator";
import { invokeLLM } from "./_core/llm";

const mockedInvokeLLM = vi.mocked(invokeLLM);

const SAMPLE_LEAD_SHEET = `X: 1
T: Amazing Grace
M: 4/4
L: 1/8
Q: 1/4=100
K: G
"G"G4 B2 d2 | "C"e4 c2 A2 | "G"B4 G2 B2 | "D"A6 z2 |
"G"G4 B2 d2 | "C"e4 c2 A2 | "G"B4 "D"A2 G2 | "G"G6 z2 |`;

function makeLLMResponse(abc: string) {
  return {
    choices: [{ message: { content: abc } }],
  };
}

describe("multiPartAbcGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should define all expected instrument parts", () => {
    expect(PART_NAMES).toContain("vocals");
    expect(PART_NAMES).toContain("bass");
    expect(PART_NAMES).toContain("piano");
    expect(PART_NAMES.length).toBe(3);
  });

  it("should have correct metadata for each part", () => {
    expect(INSTRUMENT_PARTS.vocals.label).toBe("Vocals");
    expect(INSTRUMENT_PARTS.bass.label).toBe("Bass");
    expect(INSTRUMENT_PARTS.piano.label).toBe("Piano");
    expect(INSTRUMENT_PARTS.vocals.clef).toBe("treble");
    expect(INSTRUMENT_PARTS.bass.clef).toBe("bass");
  });

  it("should generate a vocals part with lyrics", async () => {
    const vocalsAbc = `X: 1
T: Amazing Grace - Vocals
M: 4/4
L: 1/8
Q: 1/4=100
K: G
"G"G4 B2 d2 | "C"e4 c2 A2 |
w: A-maz-ing grace how sweet
"G"B4 G2 B2 | "D"A6 z2 |
w: the sound that saved`;

    mockedInvokeLLM.mockResolvedValueOnce(makeLLMResponse(vocalsAbc));

    const result = await generatePartAbc("Amazing Grace", SAMPLE_LEAD_SHEET, "Amazing grace how sweet the sound", "vocals");

    expect(result).toContain("X: 1");
    expect(result).toContain("K: G");
    expect(result.length).toBeGreaterThan(50);
    expect(mockedInvokeLLM).toHaveBeenCalledOnce();
  });

  it("should generate a bass part", async () => {
    const bassAbc = `X: 1
T: Amazing Grace - Bass
M: 4/4
L: 1/8
Q: 1/4=100
K: G
"G"G,4 D2 B,2 | "C"C4 G,2 E2 | "G"G,4 B,2 D2 | "D"D4 A,2 F,2 |`;

    mockedInvokeLLM.mockResolvedValueOnce(makeLLMResponse(bassAbc));

    const result = await generatePartAbc("Amazing Grace", SAMPLE_LEAD_SHEET, null, "bass");

    expect(result).toContain("X: 1");
    expect(result).toContain("Bass");
    expect(result.length).toBeGreaterThan(50);
  });

  it("should generate a piano part", async () => {
    const pianoAbc = `X: 1
T: Amazing Grace - Piano
M: 4/4
L: 1/8
Q: 1/4=100
K: G
"G"[GBd]4 [GBd]4 | "C"[CEG]4 [CEG]4 | "G"[GBd]4 [GBd]4 | "D"[DFA]4 [DFA]4 |`;

    mockedInvokeLLM.mockResolvedValueOnce(makeLLMResponse(pianoAbc));

    const result = await generatePartAbc("Amazing Grace", SAMPLE_LEAD_SHEET, null, "piano");

    expect(result).toContain("X: 1");
    expect(result).toContain("Piano");
    expect(result.length).toBeGreaterThan(50);
  });

  it("should strip markdown fences from LLM response", async () => {
    const wrappedAbc = "```abc\nX: 1\nT: Test - Vocals\nM: 4/4\nL: 1/8\nQ: 1/4=120\nK: C\n\"C\"E4 G4 | \"Am\"A4 c4 |\n```";

    mockedInvokeLLM.mockResolvedValueOnce(makeLLMResponse(wrappedAbc));

    const result = await generatePartAbc("Test", SAMPLE_LEAD_SHEET, null, "vocals");

    expect(result).not.toContain("```");
    expect(result).toContain("X: 1");
  });

  it("should retry on empty response", async () => {
    // First attempt returns empty
    mockedInvokeLLM.mockResolvedValueOnce(makeLLMResponse(""));

    // Second attempt returns valid ABC
    const validAbc = `X: 1
T: Test - Vocals
M: 4/4
L: 1/8
Q: 1/4=120
K: C
"C"E4 G4 | "Am"A4 c4 |`;
    mockedInvokeLLM.mockResolvedValueOnce(makeLLMResponse(validAbc));

    const result = await generatePartAbc("Test", SAMPLE_LEAD_SHEET, null, "vocals");

    expect(result).toContain("X: 1");
    expect(mockedInvokeLLM).toHaveBeenCalledTimes(2);
  });

  it("should generate all parts sequentially", async () => {
    const vocalsAbc = `X: 1\nT: Test - Vocals\nM: 4/4\nL: 1/8\nQ: 1/4=120\nK: C\n"C"E4 G4 |`;
    const bassAbc = `X: 1\nT: Test - Bass\nM: 4/4\nL: 1/8\nQ: 1/4=120\nK: C\n"C"C,4 G,4 |`;
    const pianoAbc = `X: 1\nT: Test - Piano\nM: 4/4\nL: 1/8\nQ: 1/4=120\nK: C\n"C"[CEG]4 [CEG]4 |`;

    mockedInvokeLLM
      .mockResolvedValueOnce(makeLLMResponse(vocalsAbc))
      .mockResolvedValueOnce(makeLLMResponse(bassAbc))
      .mockResolvedValueOnce(makeLLMResponse(pianoAbc));

    const parts = await generateAllPartAbcs("Test", SAMPLE_LEAD_SHEET, null);

    expect(Object.keys(parts)).toContain("vocals");
    expect(Object.keys(parts)).toContain("bass");
    expect(Object.keys(parts)).toContain("piano");
    expect(mockedInvokeLLM).toHaveBeenCalledTimes(3);
  });

  it("should continue generating other parts if one fails", async () => {
    // Vocals fails both attempts
    mockedInvokeLLM
      .mockRejectedValueOnce(new Error("LLM error"))
      .mockRejectedValueOnce(new Error("LLM error"));

    // Bass succeeds on first attempt
    const bassAbc = `X: 1\nT: Test - Bass\nM: 4/4\nL: 1/8\nQ: 1/4=120\nK: C\n"C"C,4 G,4 | "Am"A,4 E2 C2 |`;
    mockedInvokeLLM.mockResolvedValueOnce(makeLLMResponse(bassAbc));

    // Piano succeeds on first attempt
    const pianoAbc = `X: 1\nT: Test - Piano\nM: 4/4\nL: 1/8\nQ: 1/4=120\nK: C\n"C"[CEG]4 [CEG]4 | "Am"[Ace]4 [Ace]4 |`;
    mockedInvokeLLM.mockResolvedValueOnce(makeLLMResponse(pianoAbc));

    const parts = await generateAllPartAbcs("Test", SAMPLE_LEAD_SHEET, null);

    // Vocals should be missing (both attempts threw), but bass and piano should be present
    expect(parts.vocals).toBeUndefined();
    expect(parts.bass).toBeDefined();
    expect(parts.piano).toBeDefined();
    // 2 failed attempts for vocals + 1 each for bass and piano = 4 total
    expect(mockedInvokeLLM).toHaveBeenCalledTimes(4);
  });

  it("should throw for unknown part name", async () => {
    await expect(
      generatePartAbc("Test", SAMPLE_LEAD_SHEET, null, "drums" as any)
    ).rejects.toThrow("Unknown instrument part");
  });
});
