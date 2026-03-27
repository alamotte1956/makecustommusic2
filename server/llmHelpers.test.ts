import { describe, it, expect } from "vitest";
import { extractLLMText } from "./llmHelpers";

describe("extractLLMText", () => {
  it("extracts plain string content", () => {
    expect(extractLLMText("Hello world")).toBe("Hello world");
  });

  it("trims whitespace from string content", () => {
    expect(extractLLMText("  Hello world  \n")).toBe("Hello world");
  });

  it("returns null for empty string", () => {
    expect(extractLLMText("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(extractLLMText("   \n\t  ")).toBeNull();
  });

  it("extracts text from array of content blocks (Claude thinking mode)", () => {
    const content = [
      { type: "thinking", thinking: "Let me think about this..." },
      { type: "text", text: "Here is the answer." },
    ];
    expect(extractLLMText(content)).toBe("Here is the answer.");
  });

  it("joins multiple text blocks with newline", () => {
    const content = [
      { type: "text", text: "First part." },
      { type: "text", text: "Second part." },
    ];
    expect(extractLLMText(content)).toBe("First part.\nSecond part.");
  });

  it("skips thinking blocks and only extracts text blocks", () => {
    const content = [
      { type: "thinking", thinking: "Reasoning step 1" },
      { type: "thinking", thinking: "Reasoning step 2" },
      { type: "text", text: "Final answer" },
    ];
    expect(extractLLMText(content)).toBe("Final answer");
  });

  it("returns null for array with no text blocks", () => {
    const content = [
      { type: "thinking", thinking: "Just thinking..." },
    ];
    expect(extractLLMText(content)).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(extractLLMText([])).toBeNull();
  });

  it("returns null for null input", () => {
    expect(extractLLMText(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(extractLLMText(undefined)).toBeNull();
  });

  it("returns null for number input", () => {
    expect(extractLLMText(42)).toBeNull();
  });

  it("returns null for object input (not array)", () => {
    expect(extractLLMText({ type: "text", text: "hello" })).toBeNull();
  });

  it("handles array with malformed blocks gracefully", () => {
    const content = [
      { type: "text" }, // missing text field
      { type: "text", text: 123 }, // text is not a string
      { type: "text", text: "Valid text" },
    ];
    expect(extractLLMText(content)).toBe("Valid text");
  });

  it("handles array with null entries gracefully", () => {
    const content = [null, undefined, { type: "text", text: "Valid" }];
    expect(extractLLMText(content)).toBe("Valid");
  });
});
