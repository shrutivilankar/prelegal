import { describe, expect, it } from "vitest";

import {
  parseCoverPageIntro,
  parseStandardTerms,
} from "@/lib/template-parser";
import {
  MNDA_COVERPAGE_MARKDOWN,
  MNDA_STANDARD_TERMS_MARKDOWN,
} from "../fixtures/templates";

describe("parseCoverPageIntro with the served cover page", () => {
  const intro = parseCoverPageIntro(MNDA_COVERPAGE_MARKDOWN);

  it("extracts the paragraph under the USING THIS heading", () => {
    expect(intro).toContain("consists of");
    expect(intro).toContain("this Cover Page");
    expect(intro).toContain("Standard Terms Version 1.0");
  });

  it("stops before the Purpose section", () => {
    expect(intro).not.toContain("Purpose\n");
    expect(intro).not.toContain("[Evaluating whether to enter into");
  });

  it("flattens markdown links to plain text", () => {
    expect(intro).not.toMatch(/\]\(/);
    expect(intro).toContain(
      "posted at commonpaper.com/standards/mutual-nda/1.0.",
    );
  });

  it("keeps bold markers balanced so RichText never mis-renders", () => {
    expect(intro.split("**").length % 2).toBe(1);
  });

  it("returns empty string when the section heading is missing", () => {
    expect(parseCoverPageIntro("# Mutual Non-Disclosure Agreement")).toBe("");
  });
});

describe("parseStandardTerms with the served standard terms", () => {
  const sections = parseStandardTerms(MNDA_STANDARD_TERMS_MARKDOWN);

  it("parses every numbered section", () => {
    expect(sections.length).toBeGreaterThanOrEqual(11);
  });

  it("keeps document order", () => {
    const headings = sections.map((section) => section.heading);
    expect(headings[0]).toBe("Introduction");
    expect(headings[headings.length - 1]).toBe("General");
  });

  it("has non-empty headings and bodies", () => {
    for (const section of sections) {
      expect(section.heading.trim()).not.toBe("");
      expect(section.body.trim()).not.toBe("");
    }
  });

  it("converts coverpage link spans into bold markers", () => {
    const introduction = sections[0];
    expect(introduction.body).toContain("**Purpose**");

    for (const section of sections) {
      expect(section.body).not.toContain("<span");
      expect(section.body.split("**").length % 2).toBe(1);
    }
  });

  it("ignores the title and attribution lines", () => {
    const headings = sections.map((section) => section.heading);
    expect(headings).not.toContain("Standard Terms");
    expect(headings).not.toContain("Common Paper Mutual Non-Disclosure Agreement");
  });

  it("parses content with Windows line endings", () => {
    const crlf = "1. **First**. Alpha body.\r\n\r\n2. **Second**. Beta body.\r\n";
    expect(parseStandardTerms(crlf)).toEqual([
      { heading: "First", body: "Alpha body." },
      { heading: "Second", body: "Beta body." },
    ]);
  });

  it("returns an empty array when no numbered sections exist", () => {
    expect(parseStandardTerms("# Standard Terms\n\nNo items here.")).toEqual(
      [],
    );
  });
});
