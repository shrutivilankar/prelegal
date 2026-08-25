import type { StandardTermsSection } from "@/lib/mnda";

const COVERPAGE_LINK_SPAN_PATTERN =
  /<span class="coverpage_link">(.*?)<\/span>/g;
const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

function normalizeInlineMarkdown(text: string): string {
  return text
    .replace(COVERPAGE_LINK_SPAN_PATTERN, "**$1**")
    .replace(LINK_PATTERN, "$1");
}

export function parseCoverPageIntro(content: string): string {
  const lines = content.split(/\r?\n/);
  const sectionStart = lines.findIndex((line) =>
    /^##\s+.*USING THIS/i.test(line),
  );
  if (sectionStart === -1) return "";

  let intro = "";
  for (let i = sectionStart + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (intro) break;
      continue;
    }
    if (line.startsWith("#")) {
      if (intro) break;
      continue;
    }
    intro = intro ? `${intro}\n${line}` : line;
  }
  return normalizeInlineMarkdown(intro);
}

export function parseStandardTerms(content: string): StandardTermsSection[] {
  const sections: StandardTermsSection[] = [];
  const itemPattern = /^\s*\d+\.\s+\*\*(.+?)\*\*\.\s*(.*)$/;

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(itemPattern);
    if (!match) continue;
    sections.push({
      heading: match[1].trim(),
      body: normalizeInlineMarkdown(match[2]),
    });
  }
  return sections;
}
