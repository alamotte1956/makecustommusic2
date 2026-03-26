import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROUTERS_PATH = path.resolve(__dirname, "routers.ts");
const routersContent = fs.readFileSync(ROUTERS_PATH, "utf-8");

const GENERATOR_PATH = path.resolve(__dirname, "../client/src/pages/Generator.tsx");
const generatorContent = fs.readFileSync(GENERATOR_PATH, "utf-8");

describe("musicApiCredits endpoint", () => {
  it("should define a musicApiCredits query in the songs router", () => {
    expect(routersContent).toContain("musicApiCredits: protectedProcedure.query");
  });

  it("should check if Suno is available before fetching credits", () => {
    const section = routersContent.slice(
      routersContent.indexOf("musicApiCredits:"),
      routersContent.indexOf("// Generate music with Suno")
    );
    expect(section).toContain("isSunoAvailable()");
  });

  it("should return available: false when Suno is not configured", () => {
    const section = routersContent.slice(
      routersContent.indexOf("musicApiCredits:"),
      routersContent.indexOf("// Generate music with Suno")
    );
    expect(section).toContain("available: false");
  });

  it("should import getCredits from sunoApi", () => {
    const section = routersContent.slice(
      routersContent.indexOf("musicApiCredits:"),
      routersContent.indexOf("// Generate music with Suno")
    );
    expect(section).toContain('getCredits');
  });

  it("should handle errors gracefully and return credits: -1", () => {
    const section = routersContent.slice(
      routersContent.indexOf("musicApiCredits:"),
      routersContent.indexOf("// Generate music with Suno")
    );
    expect(section).toContain("credits: -1");
  });

  it("should return the credits count on success", () => {
    const section = routersContent.slice(
      routersContent.indexOf("musicApiCredits:"),
      routersContent.indexOf("// Generate music with Suno")
    );
    expect(section).toContain("available: true");
    expect(section).toContain("credits");
  });
});

describe("CreditIndicator component", () => {
  it("should define a CreditIndicator function component", () => {
    expect(generatorContent).toContain("function CreditIndicator(");
  });

  it("should accept summaryData, summaryLoading, apiCredits, and apiCreditsLoading props", () => {
    expect(generatorContent).toContain("summaryData");
    expect(generatorContent).toContain("summaryLoading");
    expect(generatorContent).toContain("apiCredits");
    expect(generatorContent).toContain("apiCreditsLoading");
  });

  it("should render a loading skeleton when data is loading", () => {
    expect(generatorContent).toContain("shimmer-skeleton");
  });

  it("should return null for free plan users", () => {
    const section = generatorContent.slice(
      generatorContent.indexOf("function CreditIndicator("),
      generatorContent.indexOf("/* Main Component")
    );
    expect(section).toContain('plan === "free"');
    expect(section).toContain("return null");
  });

  it("should display plan badge (Pro or Premier)", () => {
    const section = generatorContent.slice(
      generatorContent.indexOf("function CreditIndicator("),
      generatorContent.indexOf("/* Main Component")
    );
    expect(section).toContain('"Pro"');
    expect(section).toContain('"Premier"');
  });

  it("should display monthly credits with total and max", () => {
    const section = generatorContent.slice(
      generatorContent.indexOf("function CreditIndicator("),
      generatorContent.indexOf("/* Main Component")
    );
    expect(section).toContain("totalCredits");
    expect(section).toContain("monthlyMax");
    expect(section).toContain("credits");
  });

  it("should display bonus songs remaining when available", () => {
    const section = generatorContent.slice(
      generatorContent.indexOf("function CreditIndicator("),
      generatorContent.indexOf("/* Main Component")
    );
    expect(section).toContain("bonusSongsRemaining > 0");
    expect(section).toContain("free bonus song");
  });

  it("should display a progress bar for credit usage", () => {
    const section = generatorContent.slice(
      generatorContent.indexOf("function CreditIndicator("),
      generatorContent.indexOf("/* Main Component")
    );
    expect(section).toContain("creditPct");
    expect(section).toContain("h-1.5 rounded-full");
  });

  it("should color the progress bar based on remaining percentage", () => {
    const section = generatorContent.slice(
      generatorContent.indexOf("function CreditIndicator("),
      generatorContent.indexOf("/* Main Component")
    );
    expect(section).toContain("bg-primary");
    expect(section).toContain("bg-amber-500");
    expect(section).toContain("bg-red-500");
  });

  it("should show API credits status with color coding", () => {
    const section = generatorContent.slice(
      generatorContent.indexOf("function CreditIndicator("),
      generatorContent.indexOf("/* Main Component")
    );
    // Green for healthy
    expect(section).toContain("bg-emerald-500/15");
    // Amber for low
    expect(section).toContain("bg-amber-500/15");
    // Red for empty
    expect(section).toContain("bg-red-500/15");
  });

  it("should show a tooltip with API credit details", () => {
    const section = generatorContent.slice(
      generatorContent.indexOf("function CreditIndicator("),
      generatorContent.indexOf("/* Main Component")
    );
    expect(section).toContain("TooltipContent");
    expect(section).toContain("API credits available");
  });

  it("should show a low credit warning when credits <= 5", () => {
    const section = generatorContent.slice(
      generatorContent.indexOf("function CreditIndicator("),
      generatorContent.indexOf("/* Main Component")
    );
    expect(section).toContain("Running low on credits");
    expect(section).toContain("/pricing");
  });

  it("should show a no credits warning when credits are 0", () => {
    const section = generatorContent.slice(
      generatorContent.indexOf("function CreditIndicator("),
      generatorContent.indexOf("/* Main Component")
    );
    expect(section).toContain("No credits remaining");
  });

  it("should import Zap, AlertTriangle, TrendingDown, and CreditCard icons", () => {
    expect(generatorContent).toContain("Zap");
    expect(generatorContent).toContain("AlertTriangle");
    expect(generatorContent).toContain("TrendingDown");
    expect(generatorContent).toContain("CreditCard");
  });
});

describe("CreditIndicator integration in Generator", () => {
  it("should query musicApiCredits in the Generator component", () => {
    const mainSection = generatorContent.slice(
      generatorContent.indexOf("export default function Generator()")
    );
    expect(mainSection).toContain("trpc.songs.musicApiCredits.useQuery");
  });

  it("should set refetchInterval for API credits polling", () => {
    const mainSection = generatorContent.slice(
      generatorContent.indexOf("export default function Generator()")
    );
    expect(mainSection).toContain("refetchInterval");
  });

  it("should render CreditIndicator in the Generator JSX", () => {
    const mainSection = generatorContent.slice(
      generatorContent.indexOf("export default function Generator()")
    );
    expect(mainSection).toContain("<CreditIndicator");
  });

  it("should pass summaryData and apiCredits to CreditIndicator", () => {
    const mainSection = generatorContent.slice(
      generatorContent.indexOf("export default function Generator()")
    );
    expect(mainSection).toContain("summaryData={");
    expect(mainSection).toContain("apiCredits={");
  });

  it("should place CreditIndicator between the header and Step 1", () => {
    const mainSection = generatorContent.slice(
      generatorContent.indexOf("export default function Generator()")
    );
    const indicatorIdx = mainSection.indexOf("<CreditIndicator");
    const step1Idx = mainSection.indexOf("STEP 1");
    const headerIdx = mainSection.indexOf("Create Music");
    expect(indicatorIdx).toBeGreaterThan(headerIdx);
    expect(indicatorIdx).toBeLessThan(step1Idx);
  });
});
