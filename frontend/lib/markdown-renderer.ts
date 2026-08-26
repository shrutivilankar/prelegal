export interface TextNode {
  type: "text";
  value: string;
}

export interface StrongNode {
  type: "strong";
  children: InlineNode[];
}

export interface EmphasisNode {
  type: "emphasis";
  children: InlineNode[];
}

export interface CodeNode {
  type: "code";
  value: string;
}

export interface LinkNode {
  type: "link";
  href: string;
  children: InlineNode[];
}

export type InlineNode =
  | TextNode
  | StrongNode
  | EmphasisNode
  | CodeNode
  | LinkNode;

export interface HeadingBlock {
  type: "heading";
  level: number;
  children: InlineNode[];
}

export interface ParagraphBlock {
  type: "paragraph";
  children: InlineNode[];
}

export interface ListItem {
  children: InlineNode[];
  blocks: ListBlock[];
}

export interface ListBlock {
  type: "list";
  ordered: boolean;
  items: ListItem[];
}

export type Block =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | { type: "rule" };

const AUTOLINK_PATTERN = /<(https?:\/\/[^>\s]+)>/g;
const TAG_PATTERN = /<[^>]+>/g;
const INLINE_PATTERNS: { type: "link" | "strong" | "emphasis" | "code"; regex: RegExp }[] = [
  { type: "link", regex: /\[([^\]]+)\]\(([^)\s]+)\)/ },
  { type: "strong", regex: /\*\*(.+?)\*\*/ },
  { type: "emphasis", regex: /\*([^*\n]+)\*/ },
  { type: "code", regex: /`([^`\n]+)`/ },
];

function normalizeSourceText(content: string): string {
  return content
    .replace(AUTOLINK_PATTERN, "[$1]($1)")
    .replace(TAG_PATTERN, "");
}

function findEarliestInlineMatch(
  text: string,
): { type: "link" | "strong" | "emphasis" | "code"; match: RegExpExecArray } | null {
  let earliest: { type: "link" | "strong" | "emphasis" | "code"; match: RegExpExecArray } | null =
    null;
  for (const candidate of INLINE_PATTERNS) {
    const match = candidate.regex.exec(text);
    if (!match) continue;
    if (!earliest || match.index < earliest.match.index) {
      earliest = { type: candidate.type, match };
    }
  }
  return earliest;
}

export function parseInline(rawText: string): InlineNode[] {
  const text = normalizeSourceText(rawText);
  const nodes: InlineNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const found = findEarliestInlineMatch(text.slice(cursor));
    if (!found) {
      nodes.push({ type: "text", value: text.slice(cursor) });
      break;
    }
    const [, captured] = found.match;
    const start = cursor + found.match.index;
    if (start > cursor) {
      nodes.push({ type: "text", value: text.slice(cursor, start) });
    }
    if (found.type === "link") {
      nodes.push({
        type: "link",
        href: found.match[2],
        children: [{ type: "text", value: found.match[1] }],
      });
    } else if (found.type === "strong") {
      nodes.push({ type: "strong", children: parseInline(captured) });
    } else if (found.type === "emphasis") {
      nodes.push({ type: "emphasis", children: parseInline(captured) });
    } else {
      nodes.push({ type: "code", value: captured });
    }
    cursor = start + found.match[0].length;
  }

  return nodes.filter(
    (node) => node.type !== "text" || node.value.length > 0,
  );
}

const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;
const RULE_PATTERN = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const LIST_ITEM_PATTERN = /^(\s*)(\d+[.)]|[-*+])\s+(.*)$/;

interface RawListItem {
  indent: number;
  marker: string;
  lines: string[];
}

function isOrderedMarker(marker: string): boolean {
  return /^\d/.test(marker);
}

function collectRawListItems(
  lines: string[],
  startIndex: number,
): { items: RawListItem[]; endIndex: number } {
  const items: RawListItem[] = [];
  let index = startIndex;
  while (index < lines.length) {
    const line = lines[index];
    const itemMatch = line.match(LIST_ITEM_PATTERN);
    if (itemMatch) {
      items.push({
        indent: itemMatch[1].length,
        marker: itemMatch[2],
        lines: [itemMatch[3]],
      });
      index += 1;
      continue;
    }
    if (line.trim() === "") {
      const nextLine = lines[index + 1] ?? "";
      if (
        nextLine.trim() !== "" &&
        !HEADING_PATTERN.test(nextLine) &&
        !RULE_PATTERN.test(nextLine)
      ) {
        index += 1;
        continue;
      }
      break;
    }
    if (items.length > 0 && !HEADING_PATTERN.test(line) && !RULE_PATTERN.test(line)) {
      items[items.length - 1].lines.push(line.trim());
      index += 1;
      continue;
    }
    break;
  }
  return { items, endIndex: index };
}

function buildList(items: RawListItem[], ordered: boolean): ListBlock {
  const root: ListBlock = { type: "list", ordered, items: [] };
  const stack: { indent: number; list: ListBlock; lastItem: ListItem | null }[] = [
    { indent: items[0]?.indent ?? 0, list: root, lastItem: null },
  ];

  for (const raw of items) {
    let frame = stack[stack.length - 1];
    while (stack.length > 1 && raw.indent < frame.indent) {
      stack.pop();
      frame = stack[stack.length - 1];
    }
    const item: ListItem = { children: parseInline(raw.lines.join(" ")), blocks: [] };

    if (raw.indent > frame.indent && frame.lastItem) {
      const subList: ListBlock = {
        type: "list",
        ordered: isOrderedMarker(raw.marker),
        items: [item],
      };
      frame.lastItem.blocks.push(subList);
      stack.push({ indent: raw.indent, list: subList, lastItem: item });
      continue;
    }
    frame.list.items.push(item);
    frame.lastItem = item;
  }

  return root;
}

export function parseMarkdown(content: string): Block[] {
  const lines = content.split(/\r?\n/);
  const blocks: Block[] = [];
  const paragraphs: string[] = [];
  let index = 0;

  const flushParagraph = () => {
    if (paragraphs.length > 0) {
      blocks.push({ type: "paragraph", children: parseInline(paragraphs.join(" ")) });
      paragraphs.length = 0;
    }
  };

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === "") {
      flushParagraph();
      index += 1;
      continue;
    }

    const headingMatch = line.match(HEADING_PATTERN);
    if (headingMatch) {
      flushParagraph();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        children: parseInline(headingMatch[2]),
      });
      index += 1;
      continue;
    }

    if (RULE_PATTERN.test(line)) {
      flushParagraph();
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    if (LIST_ITEM_PATTERN.test(line)) {
      flushParagraph();
      const { items, endIndex } = collectRawListItems(lines, index);
      blocks.push(buildList(items, isOrderedMarker(items[0].marker)));
      index = endIndex;
      continue;
    }

    paragraphs.push(line.trim());
    index += 1;
  }

  flushParagraph();
  return blocks;
}
