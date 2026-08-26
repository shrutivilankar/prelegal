import { describe, expect, it } from "vitest";

import {
  parseInline,
  parseMarkdown,
} from "@/lib/markdown-renderer";

describe("parseInline", () => {
  it("keeps plain text as a single text node", () => {
    expect(parseInline("Just words.")).toEqual([
      { type: "text", value: "Just words." },
    ]);
  });

  it("parses bold segments", () => {
    const nodes = parseInline("before **bold** after");
    expect(nodes).toEqual([
      { type: "text", value: "before " },
      { type: "strong", children: [{ type: "text", value: "bold" }] },
      { type: "text", value: " after" },
    ]);
  });

  it("converts markdown links into link nodes", () => {
    expect(parseInline("[Common Paper](https://commonpaper.com)")).toEqual([
      {
        type: "link",
        href: "https://commonpaper.com",
        children: [{ type: "text", value: "Common Paper" }],
      },
    ]);
  });

  it("converts autolinks wrapped in angle brackets", () => {
    expect(parseInline("See <https://example.com/terms> for details.")).toEqual([
      { type: "text", value: "See " },
      {
        type: "link",
        href: "https://example.com/terms",
        children: [{ type: "text", value: "https://example.com/terms" }],
      },
      { type: "text", value: " for details." },
    ]);
  });

  it("strips html span tags but keeps their content", () => {
    const nodes = parseInline(
      '<span class="header_3">Target Uptime.</span> Provider will respond.',
    );
    expect(nodes).toEqual([
      {
        type: "text",
        value: "Target Uptime. Provider will respond.",
      },
    ]);
  });
});

describe("parseMarkdown", () => {
  it("parses headings with their level", () => {
    const blocks = parseMarkdown("# Title\n\n### Sub");
    expect(blocks).toEqual([
      { type: "heading", level: 1, children: [{ type: "text", value: "Title" }] },
      { type: "heading", level: 3, children: [{ type: "text", value: "Sub" }] },
    ]);
  });

  it("joins consecutive lines into one paragraph and separates on blank lines", () => {
    const blocks = parseMarkdown("first line\nsecond line\n\nthird line");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({
      type: "paragraph",
      children: [
        { type: "text", value: "first line second line" },
      ],
    });
  });

  it("builds ordered lists with nested sublists from indentation", () => {
    const blocks = parseMarkdown(
      [
        "1. Parent one",
        "    1. Child one a",
        "    2. Child one b",
        "2. Parent two",
      ].join("\n"),
    );
    expect(blocks).toHaveLength(1);
    const list = blocks[0];
    if (list.type !== "list") throw new Error("expected list");
    expect(list.ordered).toBe(true);
    expect(list.items).toHaveLength(2);
    expect(list.items[0].children).toEqual([{ type: "text", value: "Parent one" }]);
    expect(list.items[0].blocks).toHaveLength(1);
    const subList = list.items[0].blocks[0];
    if (subList.type !== "list") throw new Error("expected sublist");
    expect(subList.items.map((item) => item.children[0])).toEqual([
      { type: "text", value: "Child one a" },
      { type: "text", value: "Child one b" },
    ]);
  });

  it("treats non-list continuation lines inside a list as part of the item", () => {
    const blocks = parseMarkdown(
      ["1. First", "continuation text", "2. Second"].join("\n"),
    );
    const list = blocks[0];
    if (list.type !== "list") throw new Error("expected list");
    expect(list.items[0].children).toEqual([
      { type: "text", value: "First continuation text" },
    ]);
  });

  it("parses unordered lists and horizontal rules", () => {
    const blocks = parseMarkdown("- Alpha\n- Beta\n\n---\n");
    const [list, rule] = blocks;
    if (list.type !== "list") throw new Error("expected list");
    expect(list.ordered).toBe(false);
    expect(list.items).toHaveLength(2);
    expect(rule).toEqual({ type: "rule" });
  });

  it("renders a realistic template body end to end", () => {
    const blocks = parseMarkdown(
      "# SLA\n\n1. <span class=\"header_3\">Uptime.</span> **Bold** duty.\n",
    );
    expect(blocks[0].type).toBe("heading");
    const list = blocks[1];
    if (list.type !== "list") throw new Error("expected list");
    const inlineText = JSON.stringify(list.items[0].children);
    expect(inlineText).toContain("Uptime.");
    expect(JSON.stringify(list.items)).toContain('"type":"strong"');
  });
});
