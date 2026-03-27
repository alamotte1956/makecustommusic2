/**
 * Shared helper to extract text content from LLM responses.
 *
 * LLM responses can return content as:
 * - A plain string (most common)
 * - An array of content blocks (Claude thinking mode returns [{type:"thinking",...},{type:"text",...}])
 * - null/undefined (empty response)
 *
 * This helper normalizes all cases into a trimmed string or null.
 */
export function extractLLMText(content: unknown): string | null {
  if (typeof content === "string") {
    return content.trim() || null;
  }
  if (Array.isArray(content)) {
    const text = content
      .filter(
        (block: any) =>
          block &&
          typeof block === "object" &&
          block.type === "text" &&
          typeof block.text === "string"
      )
      .map((block: any) => block.text)
      .join("\n")
      .trim();
    return text || null;
  }
  return null;
}
